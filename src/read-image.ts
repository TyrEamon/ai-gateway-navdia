import { Context } from 'hono'
import type { Env, Provider } from './types'
import { getProviders } from './storage'

interface ReadImageRequest {
  image_url?: string
  image_base64?: string
  prompt?: string
  model?: string
  provider_id?: string
  max_tokens?: number
  include_raw_response?: boolean
}

interface ReadImageResponse {
  success: boolean
  description?: string
  model_used?: string
  provider_used?: string
  error?: string
  raw_response?: string
}

type VisionMessage = {
  role: 'user'
  content: Array<
    | { type: 'image_url'; image_url: { url: string; detail: 'auto' | 'low' | 'high' } }
    | { type: 'text'; text: string }
  >
}

type OpenAITextContent = string | Array<{ type?: string; text?: string }>

const DEFAULT_PROMPT = '请详细描述这张图片的内容，包括主要物体、场景、颜色、文字、人物、动作和可见文字。'
const DEFAULT_VISION_MODEL = 'gpt-4o-mini'
const DEFAULT_MAX_TOKENS = 800
const DEFAULT_MAX_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_ALLOWED_IMAGE_BYTES = 10 * 1024 * 1024
const FETCH_IMAGE_TIMEOUT_MS = 15000
const VISION_REQUEST_TIMEOUT_MS = 60000

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

function parseIntegerOption(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function jsonError(c: Context<{ Bindings: Env }>, error: string, status: 400 | 401 | 403 | 413 | 500 | 502): Response {
  return c.json({ success: false, error } satisfies ReadImageResponse, status)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

function normalizeMimeType(contentType: string | null): string {
  return (contentType || 'image/png').split(';')[0].trim().toLowerCase()
}

function assertSupportedImage(mimeType: string, byteLength: number, maxImageBytes: number): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`不支持的图片类型：${mimeType}`)
  }

  if (byteLength <= 0) {
    throw new Error('图片内容为空')
  }

  if (byteLength > maxImageBytes) {
    throw new Error(`图片过大：${byteLength} bytes，当前上限 ${maxImageBytes} bytes`)
  }
}

async function fetchImageAsBase64(imageUrl: string, maxImageBytes: number): Promise<{ base64: string; mimeType: string }> {
  const parsedUrl = new URL(imageUrl)
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('image_url 只支持 http/https')
  }

  const response = await fetch(parsedUrl.toString(), {
    signal: AbortSignal.timeout(FETCH_IMAGE_TIMEOUT_MS),
    headers: { Accept: 'image/png,image/jpeg,image/webp,image/gif;q=0.8,*/*;q=0.1' },
  })

  if (!response.ok) {
    throw new Error(`无法获取图片：HTTP ${response.status}`)
  }

  const mimeType = normalizeMimeType(response.headers.get('Content-Type'))
  const contentLength = Number.parseInt(response.headers.get('Content-Length') || '', 10)
  if (Number.isFinite(contentLength) && contentLength > maxImageBytes) {
    throw new Error(`图片过大：${contentLength} bytes，当前上限 ${maxImageBytes} bytes`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  assertSupportedImage(mimeType, bytes.byteLength, maxImageBytes)

  return { base64: bytesToBase64(bytes), mimeType }
}

function normalizeBase64(input: string, maxImageBytes: number): { base64: string; mimeType: string } {
  const trimmed = input.trim()
  const dataUriMatch = trimmed.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/s)
  const mimeType = normalizeMimeType(dataUriMatch?.[1] || 'image/png')
  const base64 = (dataUriMatch?.[2] || trimmed).replace(/\s+/g, '')
  const estimatedBytes = Math.floor((base64.length * 3) / 4)

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('image_base64 不是有效的 base64')
  }

  assertSupportedImage(mimeType, estimatedBytes, maxImageBytes)
  return { base64, mimeType }
}

function buildVisionMessages(imageBase64: string, mimeType: string, prompt: string): VisionMessage[] {
  return [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
            detail: 'auto',
          },
        },
        { type: 'text', text: prompt },
      ],
    },
  ]
}

function extractTextContent(content: OpenAITextContent | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content.trim()

  return content
    .map((part) => part.text || '')
    .join('\n')
    .trim()
}

async function callVisionModel(params: {
  baseUrl: string
  apiKey: string
  model: string
  messages: VisionMessage[]
  maxTokens: number
}): Promise<{ content: string; rawResponse: string }> {
  const cleanBase = params.baseUrl.replace(/\/$/, '')
  const response = await fetch(`${cleanBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: 0.1,
      stream: false,
    }),
    signal: AbortSignal.timeout(VISION_REQUEST_TIMEOUT_MS),
  })

  const rawResponse = await response.text()
  if (!response.ok) {
    throw new Error(`视觉模型返回 HTTP ${response.status}: ${rawResponse.substring(0, 500)}`)
  }

  let parsed: {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: OpenAITextContent } }>
  }

  try {
    parsed = JSON.parse(rawResponse)
  } catch {
    throw new Error(`无法解析视觉模型响应：${rawResponse.substring(0, 300)}`)
  }

  if (parsed.error?.message) {
    throw new Error(parsed.error.message.substring(0, 500))
  }

  const content = extractTextContent(parsed.choices?.[0]?.message?.content)
  if (!content) {
    throw new Error(`视觉模型未返回有效文字：${rawResponse.substring(0, 300)}`)
  }

  return { content, rawResponse }
}

function getEnabledProviders(providers: Provider[]): Provider[] {
  return providers.filter((provider) => provider.enabled && provider.apiKeys.some((key) => key.enabled))
}

function chooseProvider(providers: Provider[], providerId?: string, preferredModel?: string): Provider | null {
  if (providerId) {
    return providers.find((provider) => provider.id === providerId) || null
  }

  if (preferredModel) {
    const matched = providers.find((provider) => provider.models.some((model) => model.enabled && model.id === preferredModel))
    if (matched) return matched
  }

  return providers[0] || null
}

function chooseModel(provider: Provider, requestedModel?: string): string {
  if (requestedModel) return requestedModel
  return provider.models.find((model) => model.enabled)?.id || DEFAULT_VISION_MODEL
}

export async function handleReadImage(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json<ReadImageRequest>()
    if (!body.image_url && !body.image_base64) {
      return jsonError(c, '请提供 image_url 或 image_base64 参数', 400)
    }

    const prompt = (body.prompt || c.env.VISION_PROMPT || DEFAULT_PROMPT).trim()
    const maxTokens = Math.min(Math.max(body.max_tokens || parseIntegerOption(c.env.VISION_MAX_TOKENS, DEFAULT_MAX_TOKENS, 100, 4000), 100), 4000)
    const maxImageBytes = parseIntegerOption(c.env.VISION_MAX_IMAGE_BYTES, DEFAULT_MAX_IMAGE_BYTES, 1, MAX_ALLOWED_IMAGE_BYTES)

    let imageBase64: string
    let mimeType: string

    try {
      const image = body.image_url
        ? await fetchImageAsBase64(body.image_url, maxImageBytes)
        : normalizeBase64(body.image_base64 || '', maxImageBytes)
      imageBase64 = image.base64
      mimeType = image.mimeType
    } catch (err) {
      return jsonError(c, `图片处理失败：${err instanceof Error ? err.message : '未知错误'}`, 400)
    }

    const providers = getEnabledProviders(await getProviders(c.env))
    if (providers.length === 0) {
      return jsonError(c, '没有可用的视觉模型 Provider，请先在后台配置支持图片输入的模型', 500)
    }

    const requestedProviderId = body.provider_id || c.env.VISION_PROVIDER_ID
    const requestedModel = body.model || c.env.VISION_MODEL
    const provider = chooseProvider(providers, requestedProviderId, requestedModel)

    if (!provider) {
      return jsonError(c, `找不到可用的视觉模型 Provider：${requestedProviderId || '未指定'}`, 500)
    }

    const apiKey = provider.apiKeys.find((key) => key.enabled)?.key
    if (!apiKey) {
      return jsonError(c, `Provider "${provider.name}" 没有启用的 API Key`, 500)
    }

    const model = chooseModel(provider, requestedModel)
    const messages = buildVisionMessages(imageBase64, mimeType, prompt)
    const result = await callVisionModel({
      baseUrl: provider.baseUrl,
      apiKey,
      model,
      messages,
      maxTokens,
    })

    return c.json({
      success: true,
      description: result.content,
      model_used: model,
      provider_used: provider.name,
      ...(body.include_raw_response || c.env.VISION_INCLUDE_RAW_RESPONSE === 'true'
        ? { raw_response: result.rawResponse.substring(0, 4000) }
        : {}),
    } satisfies ReadImageResponse)
  } catch (err) {
    return jsonError(c, `请求处理失败：${err instanceof Error ? err.message : '未知错误'}`, 500)
  }
}
