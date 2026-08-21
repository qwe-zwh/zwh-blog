function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function authorized(request, env) {
  return request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

function publicPost(post) {
  const { content, passwordHash, passwordSalt, ...metadata } = post;
  return { ...metadata, locked: Boolean(passwordHash) };
}

export async function onRequestGet({ env, params }) {
  const post = await env.POSTS.get(`post:${params.id}`, "json");
  return post ? json(post.passwordHash ? publicPost(post) : post) : json({ error: "Not found." }, 404);
}

export async function onRequestDelete({ request, env, params }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
  const ids = (await env.POSTS.get("index", "json")) || [];
  await env.POSTS.delete(`post:${params.id}`);
  await env.POSTS.put("index", JSON.stringify(ids.filter(id => id !== params.id)));
  return new Response(null, { status: 204 });
}
