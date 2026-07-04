# AIAgent Proxy API 文档

## Base URL

```
https://你的域名
```

## 认证方式

### 管理后台认证 (Session Cookie)

登录后自动设置 Session Cookie（有效期 7 天）。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/login` | GET | 登录页面 |
| `/admin/login` | POST | 登录提交 |
| `/admin/logout` | GET | 退出登录 |

#### POST /admin/login

```json
{
  "username": "admin",
  "password": "your_password"
}
```

#### 响应

```json
{
  "success": true,
  "message": "Login successful"
}
```

### API 转发认证 (Bearer Token)

所有 `/v1/*` 请求需要在 Header 中携带转发 API Key：

```
Authorization: Bearer sk_cf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## API 端点

### 公开端点

#### GET /

首页，返回站点信息和提供商/模型列表（无需认证）。

---

### API 转发端点

#### GET /v1/models

返回所有启用的模型列表。

**认证**: 需要 Bearer Token

**响应**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "deepseek/deepseek-chat",
      "provider": "deepseek",
      "provider_name": "DeepSeek",
      "object": "model",
      "created": 1712345678,
      "owned_by": "deepseek"
    }
  ]
}
```

#### POST /v1/chat/completions

转发聊天补全请求到 AI 提供商。

**认证**: 需要 Bearer Token

**请求体**:
```json
{
  "model": "deepseek/deepseek-chat",
  "messages": [{"role": "user", "content": "Hello!"}]
}
```

模型格式: `提供商ID/模型ID`

**响应**: 透传 AI 提供商的原始响应。

#### POST /v1/*

其他 API 端点转发（如 `/v1/completions` 等），路径和请求体会透传到对应提供商。

---

### 管理 API 端点

所有管理 API 需要 Session 认证（先登录）。

#### GET /admin/api/status

获取系统状态总览。

**响应**:
```json
{
  "success": true,
  "data": {
    "providersCount": 8,
    "enabledProvidersCount": 5,
    "modelsCount": 20,
    "enabledModelsCount": 15,
    "proxyKeysCount": 2,
    "adminSetup": true,
    "baseUrl": "https://your-domain.com"
  }
}
```

---

#### GET /admin/api/providers

获取所有提供商列表。

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "deepseek",
      "name": "DeepSeek",
      "baseUrl": "https://api.deepseek.com",
      "apiKeys": ["sk-xxx1", "sk-xxx2"],
      "models": [
        {"id": "deepseek-chat", "enabled": true},
        {"id": "deepseek-reasoner", "enabled": false}
      ],
      "enabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /admin/api/providers

添加新提供商。

**请求体**:
```json
{
  "id": "my-provider",
  "name": "我的提供商",
  "baseUrl": "https://api.example.com",
  "apiKeys": ["sk-xxx"],
  "models": ["model-1", "model-2"],
  "enabled": true
}
```

---

#### PUT /admin/api/providers/:id

更新提供商配置。

**请求体**（全部可选）:
```json
{
  "name": "新名称",
  "baseUrl": "https://new-api.example.com",
  "apiKeys": ["sk-new-key"],
  "models": [{"id": "new-model", "enabled": true}],
  "enabled": false
}
```

---

#### DELETE /admin/api/providers/:id

删除提供商。

---

#### POST /admin/api/providers/:id/test-model

测试模型连接。

**请求体**:
```json
{
  "modelId": "deepseek-chat"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Connection successful",
    "statusCode": 200
  }
}
```

---

#### GET /admin/api/proxy-keys

获取所有转发 API Key（实际 Key 会部分隐藏）。

---

#### POST /admin/api/proxy-keys

生成新的转发 API Key。

**请求体**:
```json
{
  "name": "我的Key名称"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "sk_cf_randomhex...",
    "name": "我的Key名称",
    "enabled": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Save this key — it will not be shown again"
}
```

---

#### DELETE /admin/api/proxy-keys/:id

删除转发 API Key。

## 错误响应格式

所有 API 错误返回以下格式:

```json
{
  "error": {
    "message": "错误描述",
    "type": "error_type"
  }
}
```

常见错误类型:
- `authentication_error`: 认证失败
- `invalid_request_error`: 请求参数错误
- `provider_disabled`: 提供商已禁用
- `model_disabled`: 模型已禁用
- `configuration_error`: 配置错误（如未设置 API Key）
- `key_exhausted`: 所有 API Key 均失败
- `proxy_error`: 转发过程出错
- `server_error`: 服务器内部错误
