# NVIDIA Gateway

基于 Cloudflare Workers + Hono 的 NVIDIA OpenAI-compatible API 代理网关。这个版本已经改成 NVIDIA 专用：客户端继续请求 `/v1/*`，请求体里的 `model` 使用 NVIDIA 原始模型 ID，例如 `deepseek-ai/deepseek-v4-flash`，不再添加 `nvidia/` 或其他提供商前缀。

## 特性

- **NVIDIA 专用转发**：默认上游为 `https://integrate.api.nvidia.com/v1`。
- **多 Key 并发竞速**：每个客户端请求会从 NVIDIA Key 池随机选择若干 Key 并发请求，最快的有效 `2xx` 响应直接返回。
- **单 Key 有限重试**：每个 Key 内部会快速过滤 `429`、超时、网络错误、常见 `5xx` 和部分临时性 `400`，在有限次数内继续尝试。
- **失败不拉黑**：不再把 NVIDIA 公益 Key 的随机失败写入 KV 健康状态，也不做长时间冷却。
- **流式响应透传**：成功的上游响应 body 直接流式返回，其他未胜出的请求会被取消。
- **转发 Key 认证**：客户端使用管理后台生成的 `sk_cf_*` 作为本代理的访问 Key。

## 竞速参数

这些变量可以在 Cloudflare Worker 环境变量中配置：

| 变量 | 默认值 | 说明 |
| --- | ---: | --- |
| `NVIDIA_RACE_MAX_KEYS` | `6` | 每个请求最多并发竞速的 NVIDIA Key 数。默认贴合 Workers 同时出站连接限制。 |
| `NVIDIA_RACE_PER_KEY_RETRIES` | `2` | 每个 Key 内部最多尝试次数。 |
| `NVIDIA_RACE_ATTEMPT_TIMEOUT_MS` | `6000` | 单次上游请求超时时间。 |
| `NVIDIA_RACE_OVERALL_TIMEOUT_MS` | `30000` | 整个竞速请求的总超时时间。 |

Cloudflare Workers Free 每天有请求数限制，并且单次 Worker 调用也有子请求/连接限制；默认 `6 * 2 = 12` 次上游尝试，比较适合免费计划。

## 本地开发

```bash
git clone <你的仓库地址>
cd ai-gateway
npm install

# 创建 .dev.vars（已 .gitignore）
echo ADMIN_USERNAME=admin >> .dev.vars
echo ADMIN_PASSWORD=your-password >> .dev.vars

npm run dev
```

## 部署

1. 在 Cloudflare Dashboard 创建 Worker，连接你的 GitHub 仓库。
2. 绑定 KV 命名空间，binding 名称保持 `KV`。
3. 在 Worker 变量中配置：
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - 可选：上面的 `NVIDIA_RACE_*` 参数。
4. 部署后进入管理后台，给 `nvidia` 提供商添加 NVIDIA API Key。
5. 在管理后台生成本代理的转发 Key，客户端使用 `Authorization: Bearer sk_cf_*` 访问。

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

## 项目结构

```text
ai-gateway/
├── src/
│   ├── index.ts     # 入口，路由注册
│   ├── types.ts     # 类型定义
│   ├── config.ts    # NVIDIA 默认配置
│   ├── storage.ts   # KV 存储层
│   ├── auth.ts      # 管理后台与转发 Key 认证
│   ├── proxy.ts     # NVIDIA 多 Key 竞速代理核心
│   ├── admin.ts     # 管理 API
│   └── pages.ts     # 前端页面模板
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## License

Apache 2.0
