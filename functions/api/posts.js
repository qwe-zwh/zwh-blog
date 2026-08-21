const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  return origin.endsWith(".ccwu.cc") ? origin : "";
}

function safeText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(tag => safeText(tag, 24)).filter(Boolean))].slice(0, 8);
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

export async function onRequestGet({ env, request }) {
  const origin = cors(request);
  const posts = await getPosts(env);
  return json(posts.map(publicPost), 200, { "access-control-allow-origin": origin });
}

export async function onRequestPost({ request, env }) {
  const origin = cors(request);
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400, { "access-control-allow-origin": origin });
  }

  const title = safeText(input.title, 120);
  const excerpt = safeText(input.excerpt, 260);
  const content = safeText(input.content, 20000);
  const tags = normalizeTags(input.tags);
  const readPassword = safeText(input.readPassword, 128);
  // A supplied reading password always protects the post, even if a stale browser
  // fails to submit the checkbox state.
  const locked = input.locked === true || Boolean(readPassword);

  if (!title || !excerpt || !content) {
    return json({ error: "Title, summary, and content are required." }, 400, { "access-control-allow-origin": origin });
  }

  if (locked && !readPassword) {
    return json({ error: "阅读密码不能为空。" }, 400, { "access-control-allow-origin": origin });
  }

  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401, { "access-control-allow-origin": origin });
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
    createdAt,
    locked,
    passwordSalt,
    passwordHash: locked ? await passwordHash(`${passwordSalt}:${readPassword}`) : "",
  };
  const ids = (await env.POSTS.get("index", "json")) || [];
  await env.POSTS.put(`post:${id}`, JSON.stringify(post));
  await env.POSTS.put("index", JSON.stringify([id, ...ids]));
  return json(publicPost(post), 201, { "access-control-allow-origin": origin });
}

export async function onRequestOptions({ request }) {
  const origin = cors(request);
  return new Response(null, {
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}
