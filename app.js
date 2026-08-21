const samplePosts = [
  { date: '2026.08.20', title: '把复杂的事，写得清楚一点', excerpt: '关于记录、拆解问题，以及为什么清晰有时比聪明更重要。', tags: ['随笔', '思考'], featured: true },
  { date: '2026.08.16', title: '从一次小重构开始理解边界', excerpt: '代码变得难以维护，通常不是因为它不够漂亮，而是因为边界没有被说清楚。', tags: ['技术', 'JavaScript'], featured: true },
  { date: '2026.08.09', title: '给自己的终端留一盏灯', excerpt: '整理一些正在使用的命令行工具，也整理一种更安静的工作节奏。', tags: ['工具', '效率'] },
  { date: '2026.07.28', title: '在信息太多的时候读一本书', excerpt: '阅读不是从世界逃开，而是重新获得注意力的方向。', tags: ['阅读', '生活'] },
  { date: '2026.07.12', title: '一个页面从空白到上线', excerpt: '记录个人项目的最小闭环：做出来、发布出去、再慢慢变好。', tags: ['建站', '实践'] },
  { date: '2026.06.30', title: '少一点预设，多一点观察', excerpt: '写给仍然在练习提问的人：先描述发生了什么，再急着解释它。', tags: ['随笔'] }
];

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
