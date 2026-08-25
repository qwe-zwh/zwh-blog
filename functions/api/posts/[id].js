const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

function safeText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

async function passwordHash(password) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function publicPost(post) {
  const { content, passwordHash, passwordSalt, ...metadata } = post;
  return { ...metadata, locked: Boolean(post.locked || passwordHash) };
}

function readablePost(post) {
  const { passwordHash, passwordSalt, ...readable } = post;
  return readable;
}

export async function onRequestGet({ request, env, params }) {
  const post = await env.POSTS.get(`post:${params.id}`, "json");
  if (!post) return json({ error: "Not found." }, 404);
  if (authorized(request, env)) return json(readablePost(post));
  return json((post.locked || post.passwordHash) ? publicPost(post) : readablePost(post));
}

export async function onRequestPut({ request, env, params }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  const post = await env.POSTS.get(`post:${params.id}`, "json");
  if (!post) return json({ error: "Not found." }, 404);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ error: "Invalid JSON." }, 400);
  }

  const title = safeText(input.title, 120);
  const excerpt = safeText(input.excerpt, 260);
  const content = safeText(input.content, 20000);
  const tags = normalizeTags(input.tags);
  const coverImage = safeCoverImage(input.coverImage, env);
  if (!title || !excerpt || !content) {
    return json({ error: "Title, summary, and content are required." }, 400);
  }

  post.title = title;
  post.excerpt = excerpt;
  post.content = content;
  post.tags = tags;
  post.coverImage = coverImage;
  post.updatedAt = new Date().toISOString();
  await env.POSTS.put(`post:${params.id}`, JSON.stringify(post));
  return json(readablePost(post));
}

export async function onRequestPatch({ request, env, params }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  const post = await env.POSTS.get(`post:${params.id}`, "json");
  if (!post) return json({ error: "Not found." }, 404);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  if (input.locked === true) {
    const readPassword = typeof input.readPassword === "string" ? input.readPassword.slice(0, 128) : "";
    if (!readPassword.trim()) return json({ error: "阅读密码不能为空。" }, 400);
    post.passwordSalt = crypto.randomUUID();
    post.passwordHash = await passwordHash(`${post.passwordSalt}:${readPassword}`);
    post.locked = true;
  } else if (input.locked === false) {
    post.passwordSalt = "";
    post.passwordHash = "";
    post.locked = false;
  } else {
    return json({ error: "Locked state is required." }, 400);
  }

  post.updatedAt = new Date().toISOString();
  await env.POSTS.put(`post:${params.id}`, JSON.stringify(post));
  return json(publicPost(post));
}

export async function onRequestDelete({ request, env, params }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  const ids = (await env.POSTS.get("index", "json")) || [];
  await env.POSTS.delete(`post:${params.id}`);
  await env.POSTS.put("index", JSON.stringify(ids.filter(id => id !== params.id)));
  if (env.DB) {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS post_views (
        post_id TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        first_viewed_at TEXT NOT NULL,
        PRIMARY KEY (post_id, ip_hash)
      )
    `).run();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM comments WHERE post_id = ?1").bind(params.id),
      env.DB.prepare("DELETE FROM likes WHERE post_id = ?1").bind(params.id),
      env.DB.prepare("DELETE FROM post_views WHERE post_id = ?1").bind(params.id),
    ]);
  }
  return new Response(null, { status: 204 });
}
