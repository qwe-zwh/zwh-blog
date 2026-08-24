const samplePosts = [];

let posts = samplePosts;
const list = document.querySelector("#postList");
const empty = document.querySelector("#emptyState");
const input = document.querySelector("#searchInput");

function safeImageUrl(value) {
  if (typeof value !== "string" || value.length > 1000) return "";
  try {
    const url = new URL(value, location.origin);
    const cloudinary = url.protocol === "https:" && url.hostname === "res.cloudinary.com";
    const local = url.origin === location.origin && (url.pathname.startsWith("/images/") || url.pathname.startsWith("/media/"));
    return cloudinary || local ? url.href : "";
  } catch {
    return "";
  }
}

function createPostCard(post, index) {
  const article = document.createElement("article");
  article.className = "post";
  const link = document.createElement("a");
  link.href = post.id ? `post.html?id=${encodeURIComponent(post.id)}` : "#";
  link.setAttribute("aria-label", `阅读：${post.title}`);

  const head = document.createElement("div");
  head.className = "post-card-head";
  const number = document.createElement("span");
  number.className = "post-index";
  number.textContent = String(index + 1).padStart(2, "0");
  const date = document.createElement("time");
  date.className = "post-date";
  date.textContent = post.date;
  head.append(number, date);

  const coverUrl = safeImageUrl(post.coverImage);
  if (coverUrl) {
    const cover = document.createElement("img");
    cover.className = "post-cover";
    cover.src = coverUrl;
    cover.alt = "";
    cover.loading = "lazy";
    cover.decoding = "async";
    cover.referrerPolicy = "no-referrer";
    link.append(head, cover);
  } else {
    link.append(head);
  }

  const title = document.createElement("h2");
  title.className = "post-title";
  title.textContent = post.title;
  const excerpt = document.createElement("p");
  excerpt.className = "post-excerpt";
  excerpt.textContent = post.excerpt;

  const foot = document.createElement("div");
  foot.className = "post-card-foot";
  const tags = document.createElement("div");
  tags.className = "post-tags";
  (Array.isArray(post.tags) ? post.tags : []).forEach(value => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = value;
    tags.append(tag);
  });
  const more = document.createElement("span");
  more.className = "read-more";
  more.append("阅读 ");
  const arrow = document.createElement("b");
  arrow.textContent = "→";
  more.append(arrow);
  foot.append(tags, more);
  link.append(title, excerpt, foot);
  article.append(link);
  return article;
}

function renderPosts(keyword = "") {
  const query = keyword.trim().toLowerCase();
  const filtered = posts.filter(post => [post.title, post.excerpt, ...(Array.isArray(post.tags) ? post.tags : [])].join(" ").toLowerCase().includes(query));
  list.replaceChildren(...filtered.map(createPostCard));
  empty.hidden = filtered.length !== 0;
}

renderPosts();
fetch("/api/posts")
  .then(response => response.ok ? response.json() : [])
  .then(onlinePosts => {
    const normalized = onlinePosts.map(post => ({
      ...post,
      date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(post.createdAt)).replaceAll("/", "."),
      featured: false,
    }));
    posts = [...normalized, ...samplePosts];
    if (onlinePosts.length) {
      const latest = onlinePosts.reduce((newest, post) => new Date(post.createdAt) > new Date(newest.createdAt) ? post : newest);
      document.querySelector("#lastUpdated").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(latest.createdAt)).replaceAll("/", " / ");
    }
    renderPosts(input.value);
  })
  .catch(() => {});

input.addEventListener("input", event => renderPosts(event.target.value));
document.addEventListener("keydown", event => {
  if (event.key === "/" && document.activeElement !== input) {
    event.preventDefault();
    input.focus();
  }
  if (event.key === "Escape") {
    input.value = "";
    renderPosts();
    input.blur();
  }
});
