# zwh 的博客

这是一个无构建依赖的静态博客首版，包含：

- 极简秀丽、轻技术感的响应式界面
- 文章列表与标签
- 浏览器端即时搜索
- 深色模式
- 新文章可设置阅读密码，未解锁时服务端不会返回正文
- 后台可为已发布文章设置、更换或取消阅读密码
- 后台可重新编辑已发布文章的标题、摘要、标签和正文
- 文章点赞与取消点赞，同一浏览器重复点赞会自动去重
- 文章评论、发布频率限制与后台评论管理
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

### 配置评论与点赞数据库

评论和点赞使用 Cloudflare D1。先创建数据库：

```powershell
npx wrangler d1 create zwh-blog-interactions
```

将命令返回的 Database ID 填入 `wrangler.toml` 的 `REPLACE_WITH_YOUR_D1_DATABASE_ID`，然后初始化数据表：

```powershell
npx wrangler d1 execute zwh-blog-interactions --remote --file=./migrations/0001_interactions.sql
```

在 Pages 项目 Settings -> Bindings 中添加 D1 database binding：

- Variable name: `DB`
- D1 database: `zwh-blog-interactions`

再添加一个至少 32 位的随机 Secret，用于匿名访客与评论来源的不可逆哈希：

- Variable name: `INTERACTION_SALT`
- Value: 密码管理器生成的随机字符串

修改绑定或环境变量后需要重新部署项目。

部署设置：

- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`

部署完成后，在 Pages 的 Custom domains 中添加 `zwh123.ccwu.cc`。发布入口为 `/admin.html`，文章详情使用 `post.html?id=文章ID`。

## 文章阅读密码

- 发布新文章时勾选“阅读文章需要密码”，输入阅读密码后发布。
- 已发布文章可在后台“管理文章”区域设置、更换或取消密码。
- 阅读密码无法找回；更换密码不影响文章正文。
- 密码仅以加盐哈希形式保存在 KV 中，加密文章的公开列表和详情接口不会返回正文。

## 代码块与一键复制

正文支持 Markdown 风格的围栏代码块。后台写作时使用三个反引号包住代码，并可在起始标记后填写语言：

````text
```js
const greeting = "hello";
console.log(greeting);
```
````

文章页会显示语言标签和右上角“复制”按钮。代码始终通过 `textContent` 渲染，不会作为 HTML 执行。

## 重新编辑文章

在后台“管理文章”区域点击“编辑”，完整文章会回填到上方编辑器。保存修改不会改变原始发布时间，也不会覆盖文章现有的阅读密码；密码仍通过文章列表中的独立按钮管理。

## 主题与界面

- 首页右上角按钮在极光玻璃浅色主题与 Ubuntu 紫色深色主题之间切换。
- 首页和文章页顶部都可以切换主题；选择保存在浏览器的 `zwh-theme` 中，并可在多个已打开页面间同步。
- 首页文章卡片、搜索框、返回按钮、点赞和评论控件使用柔和立体样式。
- 浅色主题的文章代码块使用柔和紫色，在控制明暗反差的同时减少灰感；深色主题使用独立的深蓝编辑器配色。
- 浅色文章页只保留“网格背景 + 连续中央内容平面”两层结构，导航、正文和互动区不再作为独立浮层；代码块阴影也经过收敛以减少周围模糊感。
