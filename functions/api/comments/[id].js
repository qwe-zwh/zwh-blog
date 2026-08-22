function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestDelete({ request, env, params }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  if (!env.DB) return json({ error: "评论数据库尚未配置。" }, 503);
  const result = await env.DB.prepare("DELETE FROM comments WHERE id = ?1").bind(params.id).run();
  if (!result.meta?.changes) return json({ error: "评论不存在。" }, 404);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
