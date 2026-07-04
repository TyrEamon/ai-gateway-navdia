# AIAgent Proxy

基于 Cloudflare Workers 的 AI 提供商 API 代理网关。

统一 `/v1` 接口转发，支持多 AI 提供商、API Key 轮询、两级启用/禁用（提供商+模型）、模型连接测试。

## 功能特性

- 🚀 **统一 API 接口**：所有 AI 提供商通过 `https://你的域名/v1/` 访问
- 🔄 **多 Key 轮询**：每个提供商可配置多个 API Key，自动随机切换，失败自动重试下一个
- 🏢 **多提供商管理**：内置 8 个主流 AI 提供商，支持自定义添加
- ✅ **两级启用控制**：提供商级别 + 模型级别的启用/禁用
- 🔑 **转发 Key 认证**：生成 `sk_cf_*` 格式的 API Key 用于转发鉴权
- 🔌 **模型连接测试**：在管理后台手动测试模型是否可连接
- 🌐 **美观管理界面**：现代化卡片式 UI，Font Awesome 图标

## 内置提供商

| ID | 名称 | API 地址 |
|----|------|---------|
| deepseek | DeepSeek | https://api.deepseek.com |
| openai | OpenAI | https://api.openai.com |
| anthropic | Anthropic | https://api.anthropic.com |
| gemini | Google Gemini | https://generativelanguage.googleapis.com |
| siliconflow | 硅基流动 | https://api.siliconflow.cn |
| opencode | opencode | https://api.opencode.com |
| sensetime | 商汤科技 | https://token.sensenova.cn/v1 |
| nvidia | 英伟达 | https://integrate.api.nvidia.com/v1 |

## 快速部署

### 前置条件

- Node.js 18+
- npm
- Cloudflare 账号

### 部署步骤

#### 1. 克隆项目

```bash
git clone <你的仓库地址>
cd aiagent-proxy
npm install
```

#### 2. 创建 KV Namespace

```bash
npx wrangler kv:namespace create AIAGENT_PROXY
```

#### 3. 配置环境变量

在 Cloudflare Dashboard 中设置 Worker 环境变量（Variables）：

| 变量名 | 说明 |
|--------|------|
| `ADMIN_USERNAME` | 管理后台登录用户名 |
| `ADMIN_PASSWORD` | 管理后台登录密码 |

进入 Cloudflare Dashboard → Workers & Pages → `aiagent-proxy` → **Settings** → **Variables**，添加以上环境变量。

#### 4. 部署

```bash
npm run deploy
```

#### 5. 配置提供商

访问 `https://你的域名/admin`，使用设置的管理员账号登录后：
1. 为每个提供商填写 API Key（每行一个）
2. 添加或删除模型 ID
3. 启用需要的提供商和模型
4. 生成转发 API Key（`sk_cf_*`）

## GitHub Actions 自动部署

项目包含 GitHub Actions 工作流 (`.github/workflows/deploy.yml`)，在推送到 `main` 或 `master` 分支时自动部署。

### 配置步骤

1. 在 GitHub 仓库 Settings → **Secrets and variables** → **Actions** 中添加：
   - `CF_API_TOKEN`：Cloudflare API Token（权限：Workers 编辑）

2. 推送代码到 main 分支即可触发自动部署

### 环境变量

管理员账号密码等敏感信息**不存储在代码或 KV 中**，需要在 Cloudflare Dashboard 手动设置：
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## 本地开发

```bash
npm run dev
```

本地开发时，可在项目根目录创建 `.dev.vars` 文件配置环境变量：

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
```

## 使用示例

### 获取模型列表

```bash
curl https://你的域名/v1/models \
  -H "Authorization: Bearer sk_cf_xxx"
```

### 发起聊天请求

```bash
curl https://你的域名/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_cf_xxx" \
  -d '{
    "model": "deepseek/deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

注意模型格式为 `提供商ID/模型ID`。

## 项目结构

```
aiagent-proxy/
├── src/
│   ├── index.ts     # 入口，路由注册
│   ├── types.ts     # 类型定义
│   ├── config.ts    # 默认配置
│   ├── storage.ts   # KV 存储层
│   ├── auth.ts      # 认证系统
│   ├── proxy.ts     # API 转发核心
│   ├── admin.ts     # 管理 API
│   └── pages.ts     # 前端页面模板
├── wrangler.toml
├── package.json
├── tsconfig.json
├── .github/workflows/deploy.yml  # 自动部署工作流
├── README.md
└── API.md
```

## License

MIT
