const samplePosts = [];

let posts = samplePosts;
const list = document.querySelector('#postList');
const empty = document.querySelector('#emptyState');
const input = document.querySelector('#searchInput');

function renderPosts(keyword = '') {
  const query = keyword.trim().toLowerCase();
  const filtered = posts.filter(post => [post.title, post.excerpt, ...post.tags].join(' ').toLowerCase().includes(query));
  list.innerHTML = filtered.map(post => `
    <article class="post">
      <a href="${post.id ? `post.html?id=${encodeURIComponent(post.id)}` : '#'}" aria-label="阅读：${post.title}">
        <div class="post-date">${post.date}</div>
        <h2 class="post-title">${post.title}</h2>
        <p class="post-excerpt">${post.excerpt}</p>
        <div class="post-tags">${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      </a>
    </article>`).join('');
  empty.hidden = filtered.length !== 0;
}

renderPosts();
fetch('/api/posts')
  .then(response => response.ok ? response.json() : [])
  .then(onlinePosts => {
    const normalized = onlinePosts.map(post => ({ ...post, date: new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(post.createdAt)).replaceAll('/', '.'), featured: false }));
    posts = [...normalized, ...samplePosts];
    renderPosts(input.value);
  })
  .catch(() => {});
input.addEventListener('input', event => renderPosts(event.target.value));
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== input) { event.preventDefault(); input.focus(); }
  if (event.key === 'Escape') { input.value = ''; renderPosts(); input.blur(); }
});

document.querySelector('#themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const dark = document.body.classList.contains('dark');
  localStorage.setItem('zwh-theme', dark ? 'dark' : 'light');
});
if (localStorage.getItem('zwh-theme') === 'dark') document.body.classList.add('dark');
