const id = new URLSearchParams(location.search).get("id");
const article = document.querySelector("#article");
const error = document.querySelector("#articleError");
const content = document.querySelector("#postContent");
const lockedPost = document.querySelector("#lockedPost");
const unlockForm = document.querySelector("#unlockForm");
const unlockPassword = document.querySelector("#unlockPassword");
const unlockMessage = document.querySelector("#unlockMessage");

function formatDate(iso) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).replaceAll("/", "."); }
function text(node, value) { node.textContent = value; }

function renderContent(post) {
  content.replaceChildren();
  post.content.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => { const p = document.createElement("p"); p.textContent = paragraph; content.append(p); });
  lockedPost.hidden = true;
}

function renderPost(post) {
  document.title = `${post.title} | zwh 的博客`;
  text(document.querySelector("#postDate"), formatDate(post.createdAt));
  text(document.querySelector("#postTitle"), post.title);
  document.querySelector("#postTags").innerHTML = post.tags.map(tag => `<span class="tag"></span>`).join("");
  document.querySelectorAll("#postTags .tag").forEach((node, index) => text(node, post.tags[index]));
  article.hidden = false;
  if (post.locked) lockedPost.hidden = false;
  else renderContent(post);
}

if (!id) {
  error.hidden = false;
} else {
  fetch(`/api/posts/${encodeURIComponent(id)}`).then(response => response.ok ? response.json() : Promise.reject()).then(renderPost).catch(() => { error.hidden = false; });
}

unlockForm.addEventListener("submit", async event => {
  event.preventDefault();
  unlockMessage.textContent = "正在验证...";
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(id)}/unlock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: unlockPassword.value }) });
    const post = await response.json();
    if (!response.ok) throw new Error(post.error || "无法验证密码。");
    unlockPassword.value = "";
    renderContent(post);
  } catch (exception) {
    unlockMessage.textContent = exception.message;
  }
});
