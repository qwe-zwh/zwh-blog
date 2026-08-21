const tokenKey = "zwh-admin-token";
const loginPanel = document.querySelector("#loginPanel");
const editorPanel = document.querySelector("#editorPanel");
const tokenInput = document.querySelector("#tokenInput");
const loginError = document.querySelector("#loginError");
const formMessage = document.querySelector("#formMessage");
const publishButton = document.querySelector("#publishButton");

function token() { return sessionStorage.getItem(tokenKey); }
function showEditor() { loginPanel.hidden = true; editorPanel.hidden = false; }

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
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    publishButton.disabled = false;
  }
});
