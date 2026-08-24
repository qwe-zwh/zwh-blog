const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function safeText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safePassword(value) {
  return typeof value === "string" ? value.slice(0, 128) : "";
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(tag => safeText(tag, 24)).filter(Boolean))].slice(0, 8);
}

function safeCoverImage(value, env) {
  if (typeof value !== "string" || value.length > 1000) return "";
  try {
    const url = new URL(value);
    const cloudName = typeof env.CLOUDINARY_CLOUD_NAME === "string" ? env.CLOUDINARY_CLOUD_NAME : "";
    return url.protocol === "https:"
      && url.hostname === "res.cloudinary.com"
      && cloudName
      && url.pathname.startsWith(`/${cloudName}/image/upload/`)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function makeId() {
  return crypto.randomUUID();
}

async function passwordHash(password) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function isAuthorized(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get("Authorization") || "";
  return auth === `Bearer ${expected}`;
}

async function getPosts(env) {
  const ids = (await env.POSTS.get("index", "json")) || [];
  const posts = await Promise.all(ids.map(id => env.POSTS.get(`post:${id}`, "json")));
  return posts.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function publicPost(post) {
  const { content, passwordHash, passwordSalt, ...metadata } = post;
  return { ...metadata, locked: Boolean(post.locked || passwordHash) };
}

export async function onRequestGet({ env }) {
  const posts = await getPosts(env);
  return json(posts.map(publicPost));
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const title = safeText(input.title, 120);
  const excerpt = safeText(input.excerpt, 260);
  const content = safeText(input.content, 20000);
  const tags = normalizeTags(input.tags);
  const coverImage = safeCoverImage(input.coverImage, env);
  const readPassword = safePassword(input.readPassword);
  // A supplied reading password always protects the post, even if a stale browser
  // fails to submit the checkbox state.
  const locked = input.locked === true || Boolean(readPassword);

  if (!title || !excerpt || !content) {
    return json({ error: "Title, summary, and content are required." }, 400);
  }

  if (locked && !readPassword.trim()) {
    return json({ error: "阅读密码不能为空。" }, 400);
  }

  const id = makeId();
  const createdAt = new Date().toISOString();
  const passwordSalt = locked ? crypto.randomUUID() : "";
  const post = {
    id,
    title,
    excerpt,
    content,
    tags,
    coverImage,
    createdAt,
    locked,
    passwordSalt,
    passwordHash: locked ? await passwordHash(`${passwordSalt}:${readPassword}`) : "",
  };
  const ids = (await env.POSTS.get("index", "json")) || [];
  await env.POSTS.put(`post:${id}`, JSON.stringify(post));
  await env.POSTS.put("index", JSON.stringify([id, ...ids]));
  return json(publicPost(post), 201);
}
