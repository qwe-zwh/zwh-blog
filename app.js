const samplePosts = [];

let posts = samplePosts;
const list = document.querySelector("#postList");
const empty = document.querySelector("#emptyState");
const input = document.querySelector("#searchInput");
const pagination = document.querySelector("#pagination");
const previousPage = document.querySelector("#previousPage");
const nextPage = document.querySelector("#nextPage");
const pageNumbers = document.querySelector("#pageNumbers");
const sectionTitle = document.querySelector("#sectionTitle");
const archiveYear = document.querySelector("#archiveYear");
const archiveCount = document.querySelector("#archiveCount");
const calendarMonth = document.querySelector("#calendarMonth");
const calendarDays = document.querySelector("#calendarDays");
const calendarStatus = document.querySelector("#calendarStatus");
const clearDateFilter = document.querySelector("#clearDateFilter");
const previousMonth = document.querySelector("#previousMonth");
const nextMonth = document.querySelector("#nextMonth");
const postsPerPage = 8;
let currentPage = pageFromUrl();
let postsLoaded = false;
let selectedDate = dateFromUrl();
const initialCalendarDate = selectedDate || dateKey(new Date());
let calendarYearValue = Number(initialCalendarDate.slice(0, 4));
let calendarMonthValue = Number(initialCalendarDate.slice(5, 7)) - 1;

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateFromUrl() {
  const value = new URL(location.href).searchParams.get("date") || "";
  return validDateKey(value) ? value : "";
}

function readableDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

function setCalendarFromDate(value) {
  calendarYearValue = Number(value.slice(0, 4));
  calendarMonthValue = Number(value.slice(5, 7)) - 1;
}

function pageFromUrl() {
  const value = Number.parseInt(new URL(location.href).searchParams.get("page") || "1", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function setPageInUrl(page, replace = false) {
  const url = new URL(location.href);
  if (page > 1) url.searchParams.set("page", String(page));
  else url.searchParams.delete("page");
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function setDateInUrl(value, replace = false) {
  const url = new URL(location.href);
  if (value) url.searchParams.set("date", value);
  else url.searchParams.delete("date");
  url.searchParams.delete("page");
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function renderArchiveSummary() {
  if (!posts.length) return;
  const years = posts.map(post => dateKey(post.createdAt)).filter(Boolean).map(key => Number(key.slice(0, 4)));
  if (!years.length) return;
  const newestYear = Math.max(...years);
  archiveYear.textContent = String(newestYear);
  archiveCount.textContent = `${years.filter(year => year === newestYear).length} 篇文章`;
}

function renderCalendar() {
  calendarMonth.textContent = `${calendarYearValue} 年 ${calendarMonthValue + 1} 月`;
  const counts = new Map();
  posts.forEach(post => {
    const key = dateKey(post.createdAt);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });

  const firstWeekday = new Date(Date.UTC(calendarYearValue, calendarMonthValue, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(calendarYearValue, calendarMonthValue + 1, 0)).getUTCDate();
  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    const placeholder = document.createElement("span");
    placeholder.className = "calendar-day placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    cells.push(placeholder);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${calendarYearValue}-${String(calendarMonthValue + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = counts.get(key) || 0;
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.textContent = String(day);
    button.disabled = count === 0;
    button.setAttribute("aria-label", count ? `${readableDate(key)}，${count} 篇文章` : `${readableDate(key)}，没有文章`);
    if (count) {
      button.classList.add("has-post");
      const marker = document.createElement("span");
      marker.className = "calendar-marker";
      marker.textContent = count > 1 ? String(count) : "";
      button.append(marker);
      button.addEventListener("click", () => {
        selectedDate = key;
        currentPage = 1;
        input.value = "";
        setDateInUrl(key);
        renderPosts();
        renderCalendar();
        document.querySelector(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    if (key === selectedDate) {
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    }
    cells.push(button);
  }
  while (cells.length % 7) {
    const placeholder = document.createElement("span");
    placeholder.className = "calendar-day placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    cells.push(placeholder);
  }
  calendarDays.replaceChildren(...cells);

  const monthPrefix = `${calendarYearValue}-${String(calendarMonthValue + 1).padStart(2, "0")}-`;
  const monthCount = [...counts].filter(([key]) => key.startsWith(monthPrefix)).reduce((sum, [, count]) => sum + count, 0);
  calendarStatus.textContent = selectedDate ? `正在查看 ${readableDate(selectedDate)}` : `本月发布 ${monthCount} 篇文章`;
  clearDateFilter.hidden = !selectedDate;
}

function visiblePageItems(totalPages) {
  const compact = window.matchMedia("(max-width: 640px)").matches;
  const visibleLimit = compact ? 5 : 7;
  if (totalPages <= visibleLimit) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const nearbyPages = compact ? [] : [currentPage - 1, currentPage + 1];
  const pages = [...new Set([1, totalPages, currentPage, ...nearbyPages])]
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items = [];
  pages.forEach((page, index) => {
    if (index && page - pages[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

function renderPagination(totalPages, totalPosts) {
  pagination.hidden = totalPosts === 0 || totalPages <= 1;
  previousPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === totalPages;
  pageNumbers.replaceChildren(...visiblePageItems(totalPages).map(item => {
    if (item === "ellipsis") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "page-ellipsis";
      ellipsis.textContent = "…";
      ellipsis.setAttribute("aria-hidden", "true");
      return ellipsis;
    }
    const button = document.createElement("button");
    button.className = "page-number";
    button.type = "button";
    button.textContent = String(item);
    button.setAttribute("aria-label", `第 ${item} 页`);
    if (item === currentPage) {
      button.classList.add("active");
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => goToPage(item));
    return button;
  }));
}

function goToPage(page, pushHistory = true, scroll = true) {
  if (page === currentPage) return;
  currentPage = page;
  if (pushHistory) setPageInUrl(page);
  renderPosts(input.value);
  if (scroll) document.querySelector(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  const filtered = posts.filter(post => {
    const matchesKeyword = [post.title, post.excerpt, ...(Array.isArray(post.tags) ? post.tags : [])].join(" ").toLowerCase().includes(query);
    return matchesKeyword && (!selectedDate || dateKey(post.createdAt) === selectedDate);
  });
  sectionTitle.textContent = selectedDate ? `${readableDate(selectedDate)} · 发布` : query ? "搜索结果" : "最新文章";
  empty.textContent = selectedDate ? "这一天没有符合条件的文章。" : "没有找到相关内容，换个关键词试试。";
  const totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const requestedPage = currentPage;
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  if (postsLoaded && currentPage !== requestedPage) setPageInUrl(currentPage, true);
  const start = (currentPage - 1) * postsPerPage;
  const pagePosts = filtered.slice(start, start + postsPerPage);
  list.replaceChildren(...pagePosts.map((post, index) => createPostCard(post, start + index)));
  empty.hidden = filtered.length !== 0;
  renderPagination(totalPages, filtered.length);
}

fetch("/api/posts")
  .then(response => response.ok ? response.json() : [])
  .then(onlinePosts => {
    const normalized = onlinePosts.map(post => ({
      ...post,
      date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(post.createdAt)).replaceAll("/", "."),
      featured: false,
    }));
    posts = [...normalized, ...samplePosts];
    postsLoaded = true;
    if (onlinePosts.length) {
      const latest = onlinePosts.reduce((newest, post) => new Date(post.createdAt) > new Date(newest.createdAt) ? post : newest);
      if (!selectedDate) setCalendarFromDate(dateKey(latest.createdAt));
      document.querySelector("#lastUpdated").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(latest.createdAt)).replaceAll("/", " / ");
    }
    renderArchiveSummary();
    renderCalendar();
    renderPosts(input.value);
  })
  .catch(() => {
    postsLoaded = true;
    renderCalendar();
    renderPosts(input.value);
  });

input.addEventListener("input", event => {
  currentPage = 1;
  setPageInUrl(1, true);
  renderPosts(event.target.value);
});
previousPage.addEventListener("click", () => goToPage(currentPage - 1));
nextPage.addEventListener("click", () => goToPage(currentPage + 1));
window.addEventListener("popstate", () => {
  currentPage = pageFromUrl();
  selectedDate = dateFromUrl();
  if (selectedDate) setCalendarFromDate(selectedDate);
  renderPosts(input.value);
  renderCalendar();
});
window.matchMedia("(max-width: 640px)").addEventListener("change", () => renderPosts(input.value));
previousMonth.addEventListener("click", () => {
  const month = new Date(Date.UTC(calendarYearValue, calendarMonthValue - 1, 1));
  calendarYearValue = month.getUTCFullYear();
  calendarMonthValue = month.getUTCMonth();
  renderCalendar();
});
nextMonth.addEventListener("click", () => {
  const month = new Date(Date.UTC(calendarYearValue, calendarMonthValue + 1, 1));
  calendarYearValue = month.getUTCFullYear();
  calendarMonthValue = month.getUTCMonth();
  renderCalendar();
});
clearDateFilter.addEventListener("click", () => {
  selectedDate = "";
  currentPage = 1;
  setDateInUrl("");
  renderPosts(input.value);
  renderCalendar();
});
document.addEventListener("keydown", event => {
  if (event.key === "/" && document.activeElement !== input) {
    event.preventDefault();
    input.focus();
  }
  if (event.key === "Escape") {
    input.value = "";
    currentPage = 1;
    setPageInUrl(1, true);
    renderPosts();
    input.blur();
  }
});
