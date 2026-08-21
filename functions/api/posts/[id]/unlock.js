const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

async function passwordHash(password) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env, params }) {
  const post = await env.POSTS.get(`post:${params.id}`, "json");
  if (!post) return json({ error: "Not found." }, 404);
  if (!post.locked && !post.passwordHash) return json(post);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const password = typeof input.password === "string" ? input.password.slice(0, 128) : "";
  const suppliedHash = await passwordHash(`${post.passwordSalt}:${password}`);
  if (suppliedHash !== post.passwordHash) return json({ error: "密码不正确。" }, 401);

  return json(post);
}
