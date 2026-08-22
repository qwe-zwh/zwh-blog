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

function interactionSecret(env) {
  return env.INTERACTION_SALT || env.ADMIN_TOKEN || "";
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function postExists(env, id) {
  return Boolean(await env.POSTS.get(`post:${id}`));
}

export async function onRequestGet({ env, params }) {
  if (!env.DB) return json({ error: "评论数据库尚未配置。" }, 503);
  if (!await postExists(env, params.id)) return json({ error: "文章不存在。" }, 404);

  const result = await env.DB.prepare(`
    SELECT id, author, content, created_at AS createdAt
    FROM (
      SELECT id, author, content, created_at
      FROM comments
      WHERE post_id = ?1
      ORDER BY created_at DESC
      LIMIT 50
    )
    ORDER BY created_at ASC
  `).bind(params.id).all();
  return json({ comments: result.results || [] });
}

export async function onRequestPost({ request, env, params }) {
  if (!env.DB) return json({ error: "评论数据库尚未配置。" }, 503);
  const secret = interactionSecret(env);
  if (!secret) return json({ error: "评论安全密钥尚未配置。" }, 503);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ error: "请求格式无效。" }, 415);
  }
  if (!await postExists(env, params.id)) return json({ error: "文章不存在。" }, 404);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "请求格式无效。" }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ error: "请求格式无效。" }, 400);
  }

  const author = safeText(input.author, 24);
  const content = safeText(input.content, 800);
  if (safeText(input.website, 200)) {
    return json({ ok: true }, 201);
  }
  if (!author) return json({ error: "请填写昵称。" }, 400);
  if (!content) return json({ error: "请填写评论内容。" }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(`${secret}:${ip}`);
  const recent = await env.DB.prepare(`
    SELECT id FROM comments
    WHERE ip_hash = ?1 AND datetime(created_at) >= datetime('now', '-60 seconds')
    LIMIT 1
  `).bind(ipHash).first();
  if (recent) return json({ error: "评论太频繁，请一分钟后再试。" }, 429);

  const comment = {
    id: crypto.randomUUID(),
    author,
    content,
    createdAt: new Date().toISOString(),
  };
  await env.DB.prepare(`
    INSERT INTO comments (id, post_id, author, content, created_at, ip_hash)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  `).bind(comment.id, params.id, comment.author, comment.content, comment.createdAt, ipHash).run();
  return json(comment, 201);
}
