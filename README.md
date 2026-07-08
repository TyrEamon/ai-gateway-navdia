# NVIDIA Gateway

基于 Cloudflare Workers + Hono 的 NVIDIA OpenAI-compatible API 代理网关。

这个版本已经改成 NVIDIA 专用：客户端继续请求 `/v1/*`，请求体里的 `model` 直接使用 NVIDIA 原始模型 ID，例如 `deepseek-ai/deepseek-v4-flash`，不需要再添加 `nvidia/` 或其他提供商前缀。

## 特性

- **NVIDIA 专用转发**：默认上游为 `https://integrate.api.nvidia.com/v1`。
- **多 Key 并发竞速**：每个客户端请求会从 NVIDIA Key 池随机选择最多 6 个 Key 并发请求，最快的有效 `2xx` 响应会直接返回。
- **单 Key 有限重试**：每个 Key 内部会快速过滤 `429`、超时、网络错误、常见 `5xx` 和部分临时 `400`，在有限次数内继续尝试。
- **横向和纵向同时进行**：抽中的多个 Key 会同时竞速，每个 Key 又在自己的 worker 内部做有限重试。整体可以理解为多条重试链并发跑，谁先成功谁胜出。
- **失败不拉黑**：不会把 NVIDIA 公益 Key 的随机失败写入 KV 健康状态，也不会做长时间冷却。
- **流式响应透传**：成功的上游响应 body 直接流式返回，其他未胜出的请求会被取消。
- **转发 Key 认证**：客户端使用管理后台生成的 `sk_cf_*` 作为本代理的访问 Key。
- **竞速日志**：后台展示最近成功胜出的 Key、来源、延迟、重试次数和本轮参赛 Key。
- **数据导入导出**：后台可导出/导入提供商、上游 Key、转发 Key 配置。

## 竞速参数

这些变量可以在 Cloudflare Worker 环境变量中配置：

| 变量 | 默认值 | 说明 |
| --- | ---: | --- |
| `NVIDIA_RACE_MAX_KEYS` | `6` | 每个请求最多并发竞速的 NVIDIA Key 数。建议不要超过 6，以贴合 Workers 同时出站连接限制。 |
| `NVIDIA_RACE_PER_KEY_RETRIES` | `2` | 每个 Key 内部最多尝试次数。 |
| `NVIDIA_RACE_ATTEMPT_TIMEOUT_MS` | `6000` | 单次上游请求超时时间。 |
| `NVIDIA_RACE_OVERALL_TIMEOUT_MS` | `30000` | 整个竞速请求的总超时时间。 |

可以存很多 Key，例如 10 个、20 个。`NVIDIA_RACE_MAX_KEYS=6` 的意思不是只能保存 6 个 Key，而是每次请求最多从总池子里随机抽 6 个 Key 并发竞速。没抽中的 Key 本轮不会请求，也不会占用 Cloudflare 出站连接。

## Cloudflare 部署

建议使用 Cloudflare Workers Git 部署，不要按普通静态 Pages 项目部署。

1. 进入 Cloudflare Dashboard。
2. 打开 **Workers & Pages**。
3. 创建应用时选择 **Worker / Import a repository**。
4. 连接 GitHub，选择仓库 `TyrEamon/ai-gateway-navdia`。
5. 部署配置：

| 配置项 | 填写 |
| --- | --- |
| Root directory | 留空，或填 `/` |
| Install command | `npm ci` |
| Deploy command | `npm run deploy` |

如果界面只有 **Build command**，就填：

```bash
npm run deploy
```

不要填 `npm run build`，因为本仓库里的 `build` 脚本是 `wrangler deploy --dry-run`，只做打包检查，不会真正部署。

### KV 绑定

项目需要一个 KV namespace 保存后台配置。

在 Cloudflare Worker 的设置里创建并绑定 KV：

| Binding name | 说明 |
| --- | --- |
| `KV` | 必须叫 `KV`，和 `wrangler.toml` 保持一致 |

### 环境变量

在 Worker 的 Variables 里配置：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `ADMIN_USERNAME` | 是 | 管理后台用户名 |
| `ADMIN_PASSWORD` | 是 | 管理后台密码 |
| `NVIDIA_RACE_MAX_KEYS` | 否 | 每次请求最多并发竞速 Key 数，推荐 `6` |
| `NVIDIA_RACE_PER_KEY_RETRIES` | 否 | 单 Key 内部重试次数，推荐 `2` |
| `NVIDIA_RACE_ATTEMPT_TIMEOUT_MS` | 否 | 单次请求超时，默认 `6000` |
| `NVIDIA_RACE_OVERALL_TIMEOUT_MS` | 否 | 整体请求超时，默认 `30000` |

部署后访问：

```text
https://你的-worker域名/admin
```

进入后台后：

1. 添加 NVIDIA 上游 Key。
2. 确认模型列表启用，默认模型包括：
   - `minimaxai/minimax-m2.7`
   - `deepseek-ai/deepseek-v4-flash`
   - `deepseek-ai/deepseek-v4-pro`
   - `z-ai/glm-5.1`
   - `z-ai/glm-5.2`
3. 生成本代理的转发 Key，也就是 `sk_cf_*`。
4. 客户端使用 `Authorization: Bearer sk_cf_*` 请求 `/v1/chat/completions`。

## 本地开发

```bash
git clone <你的仓库地址>
cd ai-gateway
npm install

# 创建 .dev.vars，文件已被 .gitignore 忽略
printf "ADMIN_USERNAME=admin\nADMIN_PASSWORD=your-password\n" > .dev.vars

npm run dev
```

## 调用示例

```bash
curl https://你的域名/v1/chat/completions \
  -H "Authorization: Bearer sk_cf_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/deepseek-v4-flash",
    "messages": [{ "role": "user", "content": "hi" }],
    "max_tokens": 64
  }'
```

## 管理后台

后台主要功能：

- 添加、启用、禁用 NVIDIA 上游 Key。
- 添加、启用、禁用模型。
- 测试 Key 或模型连通性。
- 生成 `sk_cf_*` 转发 Key。
- 查看竞速胜出日志。
- 导出/导入配置备份。

导出的备份包含：

- providers
- NVIDIA 上游 Key
- proxy keys，也就是 `sk_cf_*`

不包含：

- 登录 session
- 竞速日志

## 项目结构

```text
ai-gateway/
├── src/
│   ├── index.ts        # 入口和路由注册
│   ├── types.ts        # 类型定义
│   ├── config.ts       # NVIDIA 默认配置
│   ├── storage.ts      # KV 存储层
│   ├── auth.ts         # 管理后台和转发 Key 认证
│   ├── proxy.ts        # NVIDIA 多 Key 竞速代理核心
│   ├── admin.ts        # 管理 API
│   ├── pages.ts        # 前端页面模板
│   └── pages.css.ts    # 页面样式
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## License

Apache 2.0
