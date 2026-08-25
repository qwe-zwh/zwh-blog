const encoder = new TextEncoder();
let schemaReady;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function interactionSecret(env) {
  return env.INTERACTION_SALT || env.ADMIN_TOKEN || "";
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function postExists(env, id) {
  return Boolean(await env.POSTS.get(`post:${id}`));
}

function ensureViewsSchema(env) {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS post_views (
          post_id TEXT NOT NULL,
          ip_hash TEXT NOT NULL,
          first_viewed_at TEXT NOT NULL,
          PRIMARY KEY (post_id, ip_hash)
        )
      `),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS post_views_post_idx ON post_views (post_id)"),
    ]).catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function onRequestPost({ request, env, params }) {
  if (!env.DB) return json({ error: "浏览量数据库尚未配置。" }, 503);
  const secret = interactionSecret(env);
  if (!secret) return json({ error: "浏览量安全密钥尚未配置。" }, 503);
  if (!await postExists(env, params.id)) return json({ error: "文章不存在。" }, 404);
  await ensureViewsSchema(env);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (!ip) return json({ error: "无法识别访问来源。" }, 400);
  const ipHash = await sha256(`${secret}:${ip}`);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO post_views (post_id, ip_hash, first_viewed_at)
    VALUES (?1, ?2, ?3)
  `).bind(params.id, ipHash, new Date().toISOString()).run();
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
