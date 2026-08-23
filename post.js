const id = new URLSearchParams(location.search).get("id");
const article = document.querySelector("#article");
const error = document.querySelector("#articleError");
const content = document.querySelector("#postContent");
const lockedPost = document.querySelector("#lockedPost");
const unlockForm = document.querySelector("#unlockForm");
const unlockPassword = document.querySelector("#unlockPassword");
const unlockMessage = document.querySelector("#unlockMessage");
const unlockButton = unlockForm.querySelector("button[type='submit']");
const interactions = document.querySelector("#interactions");
const likeButton = document.querySelector("#likeButton");
const likeCount = document.querySelector("#likeCount");
const commentForm = document.querySelector("#commentForm");
const commentAuthor = document.querySelector("#commentAuthor");
const commentContent = document.querySelector("#commentContent");
const commentWebsite = document.querySelector("#commentWebsite");
const commentSubmit = document.querySelector("#commentSubmit");
const commentCounter = document.querySelector("#commentCounter");
const commentMessage = document.querySelector("#commentMessage");
const commentList = document.querySelector("#commentList");
const commentEmpty = document.querySelector("#commentEmpty");
const visitorKey = "zwh-visitor-id";
const authorKey = "zwh-comment-author";
let interactionsLoaded = false;
let liked = false;

function formatDate(iso) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).replaceAll("/", "."); }
function text(node, value) { node.textContent = value; }

function parseContentBlocks(value) {
  const blocks = [];
  const textLines = [];
  let codeLines = null;
  let language = "";

  function flushText() {
    const raw = textLines.join("\n");
    raw.split(/\n[ \t]*\n+/).forEach(paragraph => {
      const value = paragraph.replace(/^\n+|\n+$/g, "");
      if (value.trim()) blocks.push({ type: "paragraph", value });
    });
    textLines.length = 0;
  }

  String(value || "").replace(/\r\n?/g, "\n").split("\n").forEach(line => {
    if (codeLines === null) {
      const openingFence = /^```([^\s`]*)\s*$/.exec(line);
      if (openingFence) {
        flushText();
        language = openingFence[1];
        codeLines = [];
      } else {
        textLines.push(line);
      }
    } else if (/^```\s*$/.test(line)) {
      blocks.push({ type: "code", value: codeLines.join("\n"), language });
      codeLines = null;
      language = "";
    } else {
      codeLines.push(line);
    }
  });

  if (codeLines !== null) blocks.push({ type: "code", value: codeLines.join("\n"), language });
  flushText();
  return blocks;
}

function languageLabel(language) {
  const labels = {
    js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", typescript: "TypeScript",
    html: "HTML", css: "CSS", json: "JSON", sql: "SQL", py: "Python", python: "Python",
    sh: "Shell", bash: "Shell", shell: "Shell", ps1: "PowerShell", powershell: "PowerShell",
  };
  return labels[language.toLowerCase()] || language || "Code";
}

function fallbackCopy(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.className = "copy-fallback";
  document.body.append(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
  }
  if (!copied) throw new Error("Copy command failed.");
}

async function copyText(value) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some browsers deny the Clipboard API even on HTTPS; use the legacy fallback.
    }
  }
  fallbackCopy(value);
}

function createCodeBlock(block) {
  const wrapper = document.createElement("section");
  wrapper.className = "code-block";
  const toolbar = document.createElement("div");
  toolbar.className = "code-toolbar";
  const label = document.createElement("span");
  label.className = "code-language";
  label.textContent = languageLabel(block.language);
  const copyButton = document.createElement("button");
  copyButton.className = "copy-code-button";
  copyButton.type = "button";
  copyButton.setAttribute("aria-label", "复制代码");
  copyButton.textContent = "复制";
  copyButton.addEventListener("click", async () => {
    copyButton.disabled = true;
    try {
      await copyText(block.value);
      copyButton.classList.add("copied");
      copyButton.textContent = "已复制";
    } catch {
      copyButton.textContent = "复制失败";
    }
    window.setTimeout(() => {
      copyButton.disabled = false;
      copyButton.classList.remove("copied");
      copyButton.textContent = "复制";
    }, 1600);
  });
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = block.value;
  pre.append(code);
  toolbar.append(label, copyButton);
  wrapper.append(toolbar, pre);
  return wrapper;
}

function renderContent(post) {
  content.replaceChildren();
  parseContentBlocks(post.content).forEach(block => {
    if (block.type === "code") {
      content.append(createCodeBlock(block));
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = block.value;
      content.append(paragraph);
    }
  });
  lockedPost.hidden = true;
  showInteractions();
}

function visitorId() {
  let value = localStorage.getItem(visitorKey);
  if (!value) {
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(visitorKey, value);
  }
  return value;
}

async function responseData(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

function renderLike(state) {
  liked = Boolean(state.liked);
  likeCount.textContent = String(Number(state.count || 0));
  likeButton.classList.toggle("liked", liked);
  likeButton.setAttribute("aria-pressed", String(liked));
  likeButton.querySelector(".like-heart").textContent = liked ? "♥" : "♡";
}

function renderComments(comments) {
  commentList.replaceChildren();
  comments.forEach(comment => {
    const item = document.createElement("article");
    item.className = "comment-item";
    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const author = document.createElement("strong");
    author.className = "comment-author";
    author.textContent = comment.author;
    const time = document.createElement("time");
    time.className = "comment-time";
    time.dateTime = comment.createdAt;
    time.textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(comment.createdAt));
    const body = document.createElement("p");
    body.className = "comment-body";
    body.textContent = comment.content;
    meta.append(author, time);
    item.append(meta, body);
    commentList.append(item);
  });
  commentEmpty.hidden = comments.length > 0;
}

async function loadInteractions() {
  commentMessage.className = "comment-message";
  commentMessage.textContent = "正在加载评论...";
  try {
    const [likesResponse, commentsResponse] = await Promise.all([
      fetch(`/api/posts/${encodeURIComponent(id)}/likes`, { headers: { "X-Visitor-ID": visitorId() }, cache: "no-store" }),
      fetch(`/api/posts/${encodeURIComponent(id)}/comments`, { cache: "no-store" }),
    ]);
    const [likeState, commentState] = await Promise.all([
      responseData(likesResponse, "点赞信息加载失败。"),
      responseData(commentsResponse, "评论加载失败。"),
    ]);
    renderLike(likeState);
    renderComments(commentState.comments || []);
    likeButton.disabled = false;
    commentMessage.textContent = "";
    interactionsLoaded = true;
  } catch (exception) {
    commentMessage.textContent = exception.message;
  }
}

function showInteractions() {
  interactions.hidden = false;
  if (!interactionsLoaded) loadInteractions();
}

function renderPost(post) {
  document.title = `${post.title} | zwh 的博客`;
  text(document.querySelector("#postDate"), formatDate(post.createdAt));
  text(document.querySelector("#postTitle"), post.title);
  const tags = Array.isArray(post.tags) ? post.tags : [];
  document.querySelector("#postTags").innerHTML = tags.map(() => `<span class="tag"></span>`).join("");
  document.querySelectorAll("#postTags .tag").forEach((node, index) => text(node, tags[index]));
  article.hidden = false;
  if (post.locked) lockedPost.hidden = false;
  else renderContent(post);
}

if (!id) {
  error.hidden = false;
} else {
  fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: "no-store" })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "文章加载失败。");
      return data;
    })
    .then(renderPost)
    .catch(() => { error.hidden = false; });
}

unlockForm.addEventListener("submit", async event => {
  event.preventDefault();
  unlockMessage.textContent = "正在验证...";
  unlockButton.disabled = true;
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(id)}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: unlockPassword.value }) });
    const post = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(post.error || "无法验证密码。");
    unlockPassword.value = "";
    unlockMessage.textContent = "";
    renderContent(post);
  } catch (exception) {
    unlockMessage.textContent = exception.message;
  } finally {
    unlockButton.disabled = false;
  }
});

likeButton.addEventListener("click", async () => {
  likeButton.disabled = true;
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(id)}/likes`, {
      method: liked ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId: visitorId() }),
    });
    renderLike(await responseData(response, "点赞操作失败。"));
  } catch (exception) {
    commentMessage.className = "comment-message";
    commentMessage.textContent = exception.message;
  } finally {
    likeButton.disabled = false;
  }
});

commentAuthor.value = localStorage.getItem(authorKey) || "";
commentContent.addEventListener("input", () => {
  commentCounter.textContent = `${commentContent.value.length} / 800`;
});

commentForm.addEventListener("submit", async event => {
  event.preventDefault();
  commentSubmit.disabled = true;
  commentMessage.className = "comment-message";
  commentMessage.textContent = "正在发布评论...";
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author: commentAuthor.value, content: commentContent.value, website: commentWebsite.value }),
    });
    await responseData(response, "评论发布失败。");
    localStorage.setItem(authorKey, commentAuthor.value.trim());
    commentContent.value = "";
    commentWebsite.value = "";
    commentCounter.textContent = "0 / 800";
    const commentsResponse = await fetch(`/api/posts/${encodeURIComponent(id)}/comments`, { cache: "no-store" });
    const commentState = await responseData(commentsResponse, "评论刷新失败。");
    renderComments(commentState.comments || []);
    commentMessage.className = "comment-message success";
    commentMessage.textContent = "评论发布成功。";
  } catch (exception) {
    commentMessage.textContent = exception.message;
  } finally {
    commentSubmit.disabled = false;
  }
});
