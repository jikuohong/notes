# MeowNote 🐾

基于 Cloudflare Workers + D1 的个人笔记应用，多文件工程版本，支持 GitHub Actions 自动部署。

## 项目结构

```
meownote/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions 自动部署
├── public/
│   └── index.html           # 前端 SPA（直接编辑此文件改界面）
├── scripts/
│   └── build-html.js        # 将 index.html → src/html.js 的构建脚本
├── src/
│   ├── index.js             # Worker 入口
│   ├── api.js               # API 路由（认证、CRUD、分享）
│   ├── db.js                # D1 Schema 初始化
│   ├── html.js              # ⚠️ 自动生成，勿手动编辑
│   └── utils.js             # 工具函数（JSON响应、token、stripHtml）
├── .dev.vars                # 本地开发环境变量（不提交 Git）
├── .gitignore
├── package.json
├── schema.sql               # D1 数据库建表语句
└── wrangler.toml            # Cloudflare Workers 配置
```

## 首次部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
# 创建数据库（只需执行一次）
npx wrangler d1 create meownote-db
```

执行后会输出类似：
```
✅ Successfully created DB 'meownote-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

将 `database_id` 填入 `wrangler.toml`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "meownote-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← 替换这里
```

### 3. 初始化数据库表

```bash
npm run db:init
```

### 4. 设置访问密码

**方法一：Cloudflare Dashboard（推荐）**

进入 Dashboard → Workers & Pages → meownote → Settings → Variables and Secrets，
添加变量 `PASSWORD`，值为你的密码。

**方法二：wrangler secret**

```bash
npx wrangler secret put PASSWORD
# 输入密码后回车
```

### 5. 本地开发测试

编辑 `.dev.vars` 设置本地密码，然后：

```bash
npm run dev
# 访问 http://localhost:8787
```

### 6. 手动部署

```bash
npm run deploy
```

---

## GitHub Actions 自动部署

### 配置 Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（需要 Workers:Edit 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare Account ID |

**获取 API Token：**  
Cloudflare Dashboard → My Profile → API Tokens → Create Token → 选择 "Edit Cloudflare Workers" 模板。

**获取 Account ID：**  
Cloudflare Dashboard 右侧边栏可以看到 Account ID。

### 自动部署触发

配置完成后，每次推送到 `main` 分支，GitHub Actions 会自动：
1. 安装依赖
2. 运行 `build:html`（从 `public/index.html` 重新生成 `src/html.js`）
3. 执行 `wrangler deploy`

---

## 修改前端界面

1. 直接编辑 `public/index.html`
2. 运行 `npm run build:html` 重新生成 `src/html.js`
3. 提交推送到 `main`，GitHub Actions 自动部署

> **注意：** `src/html.js` 是自动生成文件，请不要手动编辑它。

---

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `PASSWORD` | 应用登录密码 | `meow` |

---

## 数据库绑定说明

`wrangler.toml` 中 D1 绑定名必须是 `DB`（大写），Worker 代码通过 `env.DB` 访问。
