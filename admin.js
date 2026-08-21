const tokenKey = "zwh-admin-token";
const loginPanel = document.querySelector("#loginPanel");
const editorPanel = document.querySelector("#editorPanel");
const tokenInput = document.querySelector("#tokenInput");
const loginError = document.querySelector("#loginError");
const formMessage = document.querySelector("#formMessage");
const publishButton = document.querySelector("#publishButton");
const managePanel = document.querySelector("#managePanel");
const managedPosts = document.querySelector("#managedPosts");
const manageMessage = document.querySelector("#manageMessage");

function token() { return sessionStorage.getItem(tokenKey); }
function showEditor() { loginPanel.hidden = true; editorPanel.hidden = false; managePanel.hidden = false; loadManagedPosts(); }

if (token()) showEditor();

document.querySelector("#loginButton").addEventListener("click", () => {
  const value = tokenInput.value.trim();
  if (!value) { loginError.textContent = "请输入发布密钥。"; return; }
  sessionStorage.setItem(tokenKey, value);
  loginError.textContent = "";
  showEditor();
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(tokenKey);
  editorPanel.hidden = true;
  loginPanel.hidden = false;
  tokenInput.value = "";
});

document.querySelector("#postForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    title: document.querySelector("#titleInput").value,
    excerpt: document.querySelector("#excerptInput").value,
    content: document.querySelector("#contentInput").value,
    tags: document.querySelector("#tagsInput").value.split(",").map(tag => tag.trim()).filter(Boolean),
  };
  publishButton.disabled = true;
  formMessage.className = "form-message";
  formMessage.textContent = "正在发布...";
  try {
    const response = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token()}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "发布失败。请稍后重试。");
    event.target.reset();
    formMessage.className = "form-message success";
    formMessage.textContent = "发布成功，首页刷新后即可看到新文章。";
    loadManagedPosts();
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    publishButton.disabled = false;
  }
});

function formatDate(iso) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).replaceAll("/", ".");
}

async function loadManagedPosts() {
  manageMessage.textContent = "正在加载...";
  try {
    const response = await fetch("/api/posts");
    if (!response.ok) throw new Error("文章列表加载失败。");
    const posts = await response.json();
    managedPosts.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "empty-manage";
      empty.textContent = "还没有在线文章。";
      managedPosts.append(empty);
    }
    posts.forEach(post => {
      const row = document.createElement("div");
      row.className = "managed-post";
      const info = document.createElement("div");
      info.className = "managed-post-info";
      const title = document.createElement("p");
      title.className = "managed-post-title";
      title.textContent = post.title;
      const meta = document.createElement("p");
      meta.className = "managed-post-meta";
      meta.textContent = `${formatDate(post.createdAt)} · ${(post.tags || []).join(" / ") || "无标签"}`;
      info.append(title, meta);
      const button = document.createElement("button");
      button.className = "delete-button";
      button.type = "button";
      button.textContent = "删除";
      button.addEventListener("click", () => deletePost(post.id, post.title));
      row.append(info, button);
      managedPosts.append(row);
    });
    manageMessage.textContent = "";
  } catch (error) {
    manageMessage.textContent = error.message;
  }
}

async function deletePost(id, title) {
  if (!window.confirm(`确定删除《${title}》吗？此操作不可恢复。`)) return;
  manageMessage.textContent = "正在删除...";
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE", headers: { authorization: `Bearer ${token()}` } });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || "删除失败。");
    await loadManagedPosts();
  } catch (error) {
    manageMessage.textContent = error.message;
  }
}

document.querySelector("#refreshPosts").addEventListener("click", loadManagedPosts);
