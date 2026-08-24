function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN)
    && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}

function safeCloudName(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : "";
}

async function sha1(value) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function createUploadSignature({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);

  const rawCloudName = typeof env.CLOUDINARY_CLOUD_NAME === "string" ? env.CLOUDINARY_CLOUD_NAME.trim() : "";
  const cloudName = safeCloudName(rawCloudName);
  const apiKey = typeof env.CLOUDINARY_API_KEY === "string" ? env.CLOUDINARY_API_KEY.trim() : "";
  const apiSecret = typeof env.CLOUDINARY_API_SECRET === "string" ? env.CLOUDINARY_API_SECRET.trim() : "";
  const missing = [];
  if (!rawCloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
  if (missing.length) {
    return json({ error: `生产环境缺少：${missing.join("、")}。保存变量后请重新部署。` }, 503);
  }
  if (!cloudName) {
    return json({ error: "CLOUDINARY_CLOUD_NAME 格式错误：只填写 Cloud name，不要填写网址或 cloudinary:// 开头的内容。" }, 503);
  }

  const folder = "zwh-blog";
  const overwrite = "false";
  const publicId = crypto.randomUUID();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await sha1(`folder=${folder}&overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`);
  return json({ cloudName, apiKey, folder, overwrite, publicId, timestamp, signature });
}

export async function onRequestPost(context) {
  try {
    return await createUploadSignature(context);
  } catch (exception) {
    const detail = exception instanceof Error
      ? exception.message.replace(/[\r\n\t]+/g, " ").trim().slice(0, 180)
      : "未知运行时错误";
    console.error("Media signature runtime failure", { name: exception?.name || "Error", message: detail });
    return json({ error: `图片签名接口内部错误（HTTP 500）：${detail}` }, 500);
  }
}
