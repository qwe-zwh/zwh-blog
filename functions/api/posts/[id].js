const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
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

export async function onRequestGet({ env, params }) {
  const post = await env.POSTS.get(`post:${params.id}`, "json");
  return post ? json((post.locked || post.passwordHash) ? publicPost(post) : readablePost(post)) : json({ error: "Not found." }, 404);
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
    await env.DB.batch([
      env.DB.prepare("DELETE FROM comments WHERE post_id = ?1").bind(params.id),
      env.DB.prepare("DELETE FROM likes WHERE post_id = ?1").bind(params.id),
    ]);
  }
  return new Response(null, { status: 204 });
}
