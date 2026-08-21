const id = new URLSearchParams(location.search).get("id");
const article = document.querySelector("#article");
const error = document.querySelector("#articleError");

function formatDate(iso) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)).replaceAll("/", "."); }
function text(node, value) { node.textContent = value; }

if (!id) {
  error.hidden = false;
} else {
  fetch(`/api/posts/${encodeURIComponent(id)}`).then(response => response.ok ? response.json() : Promise.reject()).then(post => {
    document.title = `${post.title} | zwh 的博客`;
    text(document.querySelector("#postDate"), formatDate(post.createdAt));
    text(document.querySelector("#postTitle"), post.title);
    document.querySelector("#postTags").innerHTML = post.tags.map(tag => `<span class="tag"></span>`).join("");
    document.querySelectorAll("#postTags .tag").forEach((node, index) => text(node, post.tags[index]));
    post.content.split(/\n\s*\n/).filter(Boolean).forEach(paragraph => { const p = document.createElement("p"); p.textContent = paragraph; document.querySelector("#postContent").append(p); });
    article.hidden = false;
  }).catch(() => { error.hidden = false; });
}
