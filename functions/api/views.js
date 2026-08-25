let schemaReady;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
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

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN)
    && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!env.DB) return json({ error: "浏览量数据库尚未配置。" }, 503);
  await ensureViewsSchema(env);
  const result = await env.DB.prepare(`
    SELECT post_id AS postId, COUNT(*) AS count
    FROM post_views
    GROUP BY post_id
  `).all();
  return json({
    views: (result.results || []).map(row => ({ postId: row.postId, count: Number(row.count || 0) })),
  });
}
