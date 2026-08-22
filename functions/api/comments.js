function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!env.DB) return json({ error: "评论数据库尚未配置。" }, 503);
  const result = await env.DB.prepare(`
    SELECT id, post_id AS postId, author, content, created_at AS createdAt
    FROM comments
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
  return json({ comments: result.results || [] });
}
