# zwh 的博客

这是一个无构建依赖的静态博客首版，包含：

- 极简秀丽、轻技术感的响应式界面
- 文章列表与标签
- 浏览器端即时搜索
- 深色模式
- 归档与关于页面区块

## 本地预览

在此目录运行任意静态服务器，例如：

```powershell
python -m http.server 4173
```

然后打开 `http://localhost:4173`。

## Cloudflare Pages

在线发文功能需要 Cloudflare Pages Functions 和 KV，因此请改为 Git 仓库部署（不能继续使用“Upload assets”）。

1. 在 Cloudflare Dashboard 创建一个 KV Namespace，名称可填写 `zwh-posts`。
2. 复制它的 Namespace ID，替换 `wrangler.toml` 内的 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`。
3. 在 Pages 项目 Settings -> Functions -> KV namespace bindings 中添加：
   - Variable name: `POSTS`
   - KV namespace: 选择刚创建的 `zwh-posts`
4. 在 Pages 项目 Settings -> Environment variables 中添加一个 **Secret**：
   - Variable name: `ADMIN_TOKEN`
   - Value: 使用密码管理器生成一串至少 32 位的随机字符
5. 将整个 `zwh-blog` 目录推送到 GitHub，并在 Cloudflare Pages 中连接仓库。

部署设置：

- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`

部署完成后，在 Pages 的 Custom domains 中添加 `zwh123.ccwu.cc`。发布入口为 `/admin.html`，文章详情使用 `post.html?id=文章ID`。
