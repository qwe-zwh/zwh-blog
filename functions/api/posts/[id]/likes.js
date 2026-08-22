const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function interactionSecret(env) {
  return env.INTERACTION_SALT || env.ADMIN_TOKEN || "";
}

function validVisitorId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{16,100}$/.test(value);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function visitorHash(env, visitorId) {
  const secret = interactionSecret(env);
  return secret && validVisitorId(visitorId) ? sha256(`${secret}:${visitorId}`) : "";
}

async function postExists(env, id) {
  return Boolean(await env.POSTS.get(`post:${id}`));
}

async function likeState(env, postId, hash) {
  const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?1").bind(postId).first();
  const likedRow = hash
    ? await env.DB.prepare("SELECT 1 AS liked FROM likes WHERE post_id = ?1 AND visitor_hash = ?2 LIMIT 1").bind(postId, hash).first()
    : null;
  return { count: Number(countRow?.count || 0), liked: Boolean(likedRow) };
}

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) return json({ error: "点赞数据库尚未配置。" }, 503);
  if (!await postExists(env, params.id)) return json({ error: "文章不存在。" }, 404);
  const hash = await visitorHash(env, request.headers.get("X-Visitor-ID") || "");
  return json(await likeState(env, params.id, hash));
}

async function parseVisitor(request, env) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return "";
  try {
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return "";
    return visitorHash(env, input.visitorId);
  } catch {
    return "";
  }
}

export async function onRequestPost({ request, env, params }) {
  if (!env.DB) return json({ error: "点赞数据库尚未配置。" }, 503);
  if (!await postExists(env, params.id)) return json({ error: "文章不存在。" }, 404);
  const hash = await parseVisitor(request, env);
  if (!hash) return json({ error: "访客标识无效。" }, 400);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO likes (post_id, visitor_hash, created_at)
    VALUES (?1, ?2, ?3)
  `).bind(params.id, hash, new Date().toISOString()).run();
  return json(await likeState(env, params.id, hash));
}

export async function onRequestDelete({ request, env, params }) {
  if (!env.DB) return json({ error: "点赞数据库尚未配置。" }, 503);
  const hash = await parseVisitor(request, env);
  if (!hash) return json({ error: "访客标识无效。" }, 400);
  await env.DB.prepare("DELETE FROM likes WHERE post_id = ?1 AND visitor_hash = ?2").bind(params.id, hash).run();
  return json(await likeState(env, params.id, hash));
}
