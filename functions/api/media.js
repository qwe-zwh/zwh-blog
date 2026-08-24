const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

function detectedType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))) return "image/gif";
  return "";
}

function safeCloudName(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : "";
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);

  const cloudName = safeCloudName(env.CLOUDINARY_CLOUD_NAME);
  const apiKey = typeof env.CLOUDINARY_API_KEY === "string" ? env.CLOUDINARY_API_KEY : "";
  const apiSecret = typeof env.CLOUDINARY_API_SECRET === "string" ? env.CLOUDINARY_API_SECRET : "";
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: "图片服务尚未配置完整。" }, 503);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "请使用表单上传图片。" }, 415);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "无法读取上传内容。" }, 400);
  }

  const image = form.get("image");
  if (!image || typeof image.arrayBuffer !== "function") {
    return json({ error: "请选择一张图片。" }, 400);
  }
  if (!ALLOWED_TYPES.has(image.type)) {
    return json({ error: "仅支持 JPEG、PNG、WebP 或 GIF 图片。" }, 415);
  }
  if (!Number.isFinite(image.size) || image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
    return json({ error: "图片不能为空且不能超过 5 MB。" }, 413);
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (detectedType(bytes) !== image.type) {
    return json({ error: "图片内容与文件类型不一致。" }, 415);
  }

  const upload = new FormData();
  upload.set("file", new Blob([bytes], { type: image.type }), typeof image.name === "string" ? image.name.slice(0, 180) : "image");
  upload.set("folder", "zwh-blog");
  upload.set("public_id", crypto.randomUUID());
  upload.set("overwrite", "false");

  let cloudinaryResponse;
  try {
    cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      headers: { authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}` },
      body: upload,
    });
  } catch {
    return json({ error: "图片服务暂时无法连接，请稍后重试。" }, 502);
  }

  const result = await cloudinaryResponse.json().catch(() => ({}));
  if (!cloudinaryResponse.ok || typeof result.secure_url !== "string") {
    return json({ error: "图片上传失败，请检查 Cloudinary 配置。" }, 502);
  }

  return json({
    url: result.secure_url,
    publicId: typeof result.public_id === "string" ? result.public_id : "",
    width: Number(result.width) || 0,
    height: Number(result.height) || 0,
    bytes: Number(result.bytes) || image.size,
    format: typeof result.format === "string" ? result.format : "",
  }, 201);
}
