const tokenKey = "zwh-admin-token";
const loginPanel = document.querySelector("#loginPanel");
const editorPanel = document.querySelector("#editorPanel");
const tokenInput = document.querySelector("#tokenInput");
const loginError = document.querySelector("#loginError");
const formMessage = document.querySelector("#formMessage");
const publishButton = document.querySelector("#publishButton");
const loginButton = document.querySelector("#loginButton");
const managePanel = document.querySelector("#managePanel");
const managedPosts = document.querySelector("#managedPosts");
const manageMessage = document.querySelector("#manageMessage");
const protectPostInput = document.querySelector("#protectPostInput");
const readPasswordField = document.querySelector("#readPasswordField");
const readPasswordInput = document.querySelector("#readPasswordInput");
const passwordDialog = document.querySelector("#passwordDialog");
const passwordForm = document.querySelector("#passwordForm");
const passwordDialogTitle = document.querySelector("#passwordDialogTitle");
const passwordDialogPost = document.querySelector("#passwordDialogPost");
const passwordDialogMessage = document.querySelector("#passwordDialogMessage");
const managedPasswordInput = document.querySelector("#managedPasswordInput");
const managedPasswordConfirm = document.querySelector("#managedPasswordConfirm");
const savePasswordButton = document.querySelector("#savePasswordButton");
const commentManagePanel = document.querySelector("#commentManagePanel");
const managedComments = document.querySelector("#managedComments");
const commentManageMessage = document.querySelector("#commentManageMessage");
const postForm = document.querySelector("#postForm");
const titleInput = document.querySelector("#titleInput");
const excerptInput = document.querySelector("#excerptInput");
const tagsInput = document.querySelector("#tagsInput");
const contentInput = document.querySelector("#contentInput");
const imageInput = document.querySelector("#imageInput");
const imageAltInput = document.querySelector("#imageAltInput");
const uploadCoverButton = document.querySelector("#uploadCoverButton");
const insertImageButton = document.querySelector("#insertImageButton");
const coverPreview = document.querySelector("#coverPreview");
const coverPreviewImage = document.querySelector("#coverPreviewImage");
const removeCoverButton = document.querySelector("#removeCoverButton");
const mediaMessage = document.querySelector("#mediaMessage");
const editorModeLabel = document.querySelector("#editorModeLabel");
const editorTitle = document.querySelector("#editorTitle");
const editProtectionNote = document.querySelector("#editProtectionNote");
const cancelEditButton = document.querySelector("#cancelEditButton");
let passwordTarget = null;
let editingPostId = null;
let currentCoverImage = "";

function token() { return sessionStorage.getItem(tokenKey); }
function showEditor() { loginPanel.hidden = true; editorPanel.hidden = false; managePanel.hidden = false; commentManagePanel.hidden = false; loadManagedPosts(); }

function setCoverImage(url) {
  currentCoverImage = typeof url === "string" ? url : "";
  coverPreview.hidden = !currentCoverImage;
  if (currentCoverImage) coverPreviewImage.src = currentCoverImage;
  else coverPreviewImage.removeAttribute("src");
}

function selectedImage() {
  const image = imageInput.files?.[0];
  if (!image) throw new Error("请先选择一张图片。");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(image.type)) {
    throw new Error("仅支持 JPEG、PNG、WebP 或 GIF 图片。");
  }
  if (image.size <= 0 || image.size > 5 * 1024 * 1024) throw new Error("图片不能为空且不能超过 5 MB。");
  return image;
}

async function uploadSelectedImage() {
  const image = selectedImage();
  const form = new FormData();
  form.set("image", image);
  const response = await fetch("/api/media", {
    method: "POST",
    headers: { authorization: `Bearer ${token()}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || "图片上传失败。");
  return { ...data, originalName: image.name };
}

function insertAtCursor(value) {
  const start = contentInput.selectionStart ?? contentInput.value.length;
  const end = contentInput.selectionEnd ?? start;
  const before = contentInput.value.slice(0, start);
  const after = contentInput.value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n" : "";
  const inserted = `${prefix}${value}${suffix}`;
  contentInput.setRangeText(inserted, start, end, "end");
  contentInput.focus();
}

async function handleImageUpload(mode) {
  uploadCoverButton.disabled = true;
  insertImageButton.disabled = true;
  mediaMessage.className = "form-message";
  mediaMessage.textContent = "正在上传图片...";
  try {
    const uploaded = await uploadSelectedImage();
    if (mode === "cover") {
      setCoverImage(uploaded.url);
      mediaMessage.textContent = "封面上传成功，保存文章后生效。";
    } else {
      const fallbackAlt = uploaded.originalName.replace(/\.[^.]+$/, "") || "文章图片";
      const alt = (imageAltInput.value.trim() || fallbackAlt).replace(/[\[\]]/g, "").slice(0, 120);
      insertAtCursor(`![${alt}](${uploaded.url})`);
      mediaMessage.textContent = "图片已插入正文光标处。";
    }
    mediaMessage.className = "form-message success";
    imageInput.value = "";
  } catch (error) {
    mediaMessage.textContent = error.message;
  } finally {
    uploadCoverButton.disabled = false;
    insertImageButton.disabled = false;
  }
}

function resetEditorMode(resetForm = true) {
  editingPostId = null;
  if (resetForm) postForm.reset();
  setCoverImage("");
  mediaMessage.textContent = "";
  editorModeLabel.textContent = "DRAFT / ONLINE";
  editorTitle.textContent = "发布文章";
  publishButton.textContent = "发布文章";
  cancelEditButton.hidden = true;
  protectPostInput.disabled = false;
  protectPostInput.closest(".password-option").classList.remove("is-disabled");
  editProtectionNote.hidden = true;
  editProtectionNote.textContent = "";
  readPasswordField.hidden = !protectPostInput.checked;
  readPasswordInput.required = protectPostInput.checked;
  if (!protectPostInput.checked) readPasswordInput.value = "";
}

async function validateToken(value) {
  const response = await fetch("/api/auth", { method: "POST", headers: { authorization: `Bearer ${value}` } });
  return response.ok;
}

if (token()) {
  validateToken(token()).then(valid => {
    if (valid) showEditor();
    else sessionStorage.removeItem(tokenKey);
  }).catch(() => sessionStorage.removeItem(tokenKey));
}

loginButton.addEventListener("click", async () => {
  const value = tokenInput.value.trim();
  if (!value) { loginError.textContent = "请输入发布密钥。"; return; }
  loginButton.disabled = true;
  loginError.textContent = "正在验证...";
  try {
    if (!await validateToken(value)) throw new Error("密钥错误，请重新输入。");
  } catch (error) {
    sessionStorage.removeItem(tokenKey);
    loginError.textContent = error.message;
    loginButton.disabled = false;
    return;
  }
  sessionStorage.setItem(tokenKey, value);
  loginError.textContent = "";
  loginButton.disabled = false;
  showEditor();
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(tokenKey);
  resetEditorMode();
  editorPanel.hidden = true;
  managePanel.hidden = true;
  commentManagePanel.hidden = true;
  loginPanel.hidden = false;
  tokenInput.value = "";
});

protectPostInput.addEventListener("change", () => {
  readPasswordField.hidden = !protectPostInput.checked;
  readPasswordInput.required = protectPostInput.checked;
  if (!protectPostInput.checked) readPasswordInput.value = "";
});

uploadCoverButton.addEventListener("click", () => handleImageUpload("cover"));
insertImageButton.addEventListener("click", () => handleImageUpload("inline"));
removeCoverButton.addEventListener("click", () => {
  setCoverImage("");
  mediaMessage.className = "form-message success";
  mediaMessage.textContent = "封面已移除，保存文章后生效。";
});

postForm.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    title: titleInput.value,
    excerpt: excerptInput.value,
    content: contentInput.value,
    tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(Boolean),
    coverImage: currentCoverImage,
  };
  const isEditing = Boolean(editingPostId);
  const editedPostId = editingPostId;
  if (!isEditing) {
    payload.locked = protectPostInput.checked;
    payload.readPassword = readPasswordInput.value;
  }
  if (!isEditing && payload.locked && !payload.readPassword.trim()) {
    formMessage.className = "form-message";
    formMessage.textContent = "已选择阅读密码，请先设置密码。";
    readPasswordInput.focus();
    return;
  }
  publishButton.disabled = true;
  formMessage.className = "form-message";
  formMessage.textContent = isEditing ? "正在保存修改..." : "正在发布...";
  try {
    const response = await fetch(isEditing ? `/api/posts/${encodeURIComponent(editedPostId)}` : "/api/posts", {
      method: isEditing ? "PUT" : "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || (isEditing ? "保存失败。请稍后重试。" : "发布失败。请稍后重试。"));
    resetEditorMode();
    formMessage.className = "form-message success";
    formMessage.textContent = isEditing ? "文章修改已保存。" : (data.locked ? "发布成功：已启用阅读密码。" : "发布成功：文章公开可读。");
    await loadManagedPosts();
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    publishButton.disabled = false;
  }
});

cancelEditButton.addEventListener("click", () => {
  resetEditorMode();
  formMessage.className = "form-message";
  formMessage.textContent = "已取消编辑。";
});

function formatDate(iso) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).replaceAll("/", ".");
}

async function editPost(post) {
  manageMessage.className = "form-message";
  manageMessage.textContent = `正在读取《${post.title}》...`;
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
      headers: { authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "文章内容读取失败。");
    editingPostId = data.id;
    titleInput.value = data.title || "";
    excerptInput.value = data.excerpt || "";
    tagsInput.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
    contentInput.value = data.content || "";
    setCoverImage(data.coverImage || "");
    editorModeLabel.textContent = "EDITING / ONLINE";
    editorTitle.textContent = "编辑文章";
    publishButton.textContent = "保存修改";
    cancelEditButton.hidden = false;
    protectPostInput.checked = Boolean(data.locked);
    protectPostInput.disabled = true;
    protectPostInput.closest(".password-option").classList.add("is-disabled");
    readPasswordField.hidden = true;
    readPasswordInput.required = false;
    readPasswordInput.value = "";
    editProtectionNote.hidden = false;
    editProtectionNote.textContent = data.locked
      ? "这篇文章的阅读密码会保持不变；如需更换或取消，请使用文章列表中的密码按钮。"
      : "这篇文章会保持公开；如需添加阅读密码，请使用文章列表中的“设置密码”。";
    formMessage.className = "form-message";
    formMessage.textContent = "编辑完成后点击“保存修改”。";
    manageMessage.textContent = "";
    editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    titleInput.focus({ preventScroll: true });
  } catch (error) {
    manageMessage.textContent = error.message;
  }
}

async function loadManagedPosts() {
  manageMessage.className = "form-message";
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
      meta.append(`${formatDate(post.createdAt)} · ${(post.tags || []).join(" / ") || "无标签"} · `);
      const lockState = document.createElement("span");
      lockState.className = "lock-state";
      lockState.textContent = post.locked ? "已加密" : "公开";
      meta.append(lockState);
      info.append(title, meta);
      const actions = document.createElement("div");
      actions.className = "managed-post-actions";
      const editButton = document.createElement("button");
      editButton.className = "access-button";
      editButton.type = "button";
      editButton.textContent = "编辑";
      editButton.addEventListener("click", () => editPost(post));
      actions.append(editButton);
      const passwordButton = document.createElement("button");
      passwordButton.className = "access-button";
      passwordButton.type = "button";
      passwordButton.textContent = post.locked ? "更换密码" : "设置密码";
      passwordButton.addEventListener("click", () => openPasswordDialog(post));
      actions.append(passwordButton);
      if (post.locked) {
        const unlockButton = document.createElement("button");
        unlockButton.className = "access-button";
        unlockButton.type = "button";
        unlockButton.textContent = "取消密码";
        unlockButton.addEventListener("click", () => removePassword(post));
        actions.append(unlockButton);
      }
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "删除";
      deleteButton.addEventListener("click", () => deletePost(post.id, post.title));
      actions.append(deleteButton);
      row.append(info, actions);
      managedPosts.append(row);
    });
    manageMessage.textContent = "";
    loadManagedComments(new Map(posts.map(post => [post.id, post.title])));
  } catch (error) {
    manageMessage.textContent = error.message;
  }
}

async function loadManagedComments(postTitles = new Map()) {
  commentManageMessage.className = "form-message";
  commentManageMessage.textContent = "正在加载...";
  try {
    const response = await fetch("/api/comments", { headers: { authorization: `Bearer ${token()}` }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "评论列表加载失败。");
    managedComments.replaceChildren();
    const comments = data.comments || [];
    if (!comments.length) {
      const empty = document.createElement("p");
      empty.className = "empty-manage";
      empty.textContent = "还没有评论。";
      managedComments.append(empty);
    }
    comments.forEach(comment => {
      const item = document.createElement("article");
      item.className = "managed-comment";
      const head = document.createElement("div");
      head.className = "managed-comment-head";
      const info = document.createElement("div");
      const author = document.createElement("p");
      author.className = "managed-comment-author";
      author.textContent = comment.author;
      const meta = document.createElement("p");
      meta.className = "managed-comment-meta";
      meta.textContent = `${postTitles.get(comment.postId) || "文章已删除"} · ${formatDate(comment.createdAt)}`;
      info.append(author, meta);
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "删除评论";
      deleteButton.addEventListener("click", () => deleteComment(comment.id, comment.author, postTitles));
      head.append(info, deleteButton);
      const body = document.createElement("p");
      body.className = "managed-comment-body";
      body.textContent = comment.content;
      item.append(head, body);
      managedComments.append(item);
    });
    commentManageMessage.textContent = "";
  } catch (error) {
    commentManageMessage.textContent = error.message;
  }
}

async function deleteComment(id, author, postTitles) {
  if (!window.confirm(`确定删除 ${author} 的这条评论吗？`)) return;
  commentManageMessage.className = "form-message";
  commentManageMessage.textContent = "正在删除...";
  try {
    const response = await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: "DELETE", headers: { authorization: `Bearer ${token()}` } });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "评论删除失败。");
    await loadManagedComments(postTitles);
    commentManageMessage.className = "form-message success";
    commentManageMessage.textContent = "评论已删除。";
  } catch (error) {
    commentManageMessage.textContent = error.message;
  }
}

function openPasswordDialog(post) {
  passwordTarget = post;
  passwordForm.reset();
  passwordDialogTitle.textContent = post.locked ? "更换阅读密码" : "设置阅读密码";
  passwordDialogPost.textContent = `《${post.title}》`;
  passwordDialogMessage.textContent = "";
  passwordDialog.showModal();
  managedPasswordInput.focus();
}

function closePasswordDialog() {
  passwordTarget = null;
  passwordForm.reset();
  passwordDialog.close();
}

async function updatePostProtection(id, payload) {
  const response = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "阅读密码更新失败。");
  return data;
}

passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!passwordTarget) return;
  const password = managedPasswordInput.value;
  if (!password.trim()) {
    passwordDialogMessage.textContent = "密码不能为空。";
    managedPasswordInput.focus();
    return;
  }
  if (password !== managedPasswordConfirm.value) {
    passwordDialogMessage.textContent = "两次输入的密码不一致。";
    managedPasswordConfirm.focus();
    return;
  }
  savePasswordButton.disabled = true;
  passwordDialogMessage.textContent = "正在保存...";
  try {
    await updatePostProtection(passwordTarget.id, { locked: true, readPassword: password });
    closePasswordDialog();
    await loadManagedPosts();
    manageMessage.className = "form-message success";
    manageMessage.textContent = "阅读密码已保存。";
  } catch (error) {
    passwordDialogMessage.textContent = error.message;
  } finally {
    savePasswordButton.disabled = false;
  }
});

async function removePassword(post) {
  if (!window.confirm(`确定取消《${post.title}》的阅读密码吗？取消后正文将公开可读。`)) return;
  manageMessage.className = "form-message";
  manageMessage.textContent = "正在取消阅读密码...";
  try {
    await updatePostProtection(post.id, { locked: false });
    await loadManagedPosts();
    manageMessage.className = "form-message success";
    manageMessage.textContent = "已取消阅读密码。";
  } catch (error) {
    manageMessage.textContent = error.message;
  }
}

document.querySelector("#closePasswordDialog").addEventListener("click", closePasswordDialog);
document.querySelector("#cancelPasswordButton").addEventListener("click", closePasswordDialog);
passwordDialog.addEventListener("close", () => { passwordTarget = null; });

async function deletePost(id, title) {
  if (!window.confirm(`确定删除《${title}》吗？此操作不可恢复。`)) return;
  manageMessage.textContent = "正在删除...";
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE", headers: { authorization: `Bearer ${token()}` } });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || "删除失败。");
    if (editingPostId === id) resetEditorMode();
    await loadManagedPosts();
  } catch (error) {
    manageMessage.textContent = error.message;
  }
}

document.querySelector("#refreshPosts").addEventListener("click", loadManagedPosts);
document.querySelector("#refreshComments").addEventListener("click", () => loadManagedPosts());
