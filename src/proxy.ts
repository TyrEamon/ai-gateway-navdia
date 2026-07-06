import { Context } from 'hono'
import { getProvider, getProviders } from './storage'
import type { ApiKeyEntry, Env, Provider, ProxyRequestBody } from './types'

interface NvidiaRacingConfig {
  maxRacingKeys: number
  perKeyRetries: number
  attemptTimeoutMs: number
  overallTimeoutMs: number
}

interface RacingTask {
  id: number
  key: ApiKeyEntry
  controller: AbortController
  promise: Promise<SettledRacingTask>
}

type KeyWorkerResult =
  | { type: 'success'; response: Response; keyIndex: number; attempt: number }
  | { type: 'failed'; status: number; detail: string; hard: boolean; keyIndex: number }
  | { type: 'aborted'; keyIndex: number }

type SettledRacingTask = {
  taskId: number
  result: KeyWorkerResult
}

const NVIDIA_PROVIDER_ID = 'nvidia'
const NVIDIA_DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1'

const NVIDIA_RACING_DEFAULTS: NvidiaRacingConfig = {
  // Cloudflare Workers allows about 6 simultaneous outgoing connections per invocation.
  maxRacingKeys: 6,
  perKeyRetries: 2,
  attemptTimeoutMs: 6000,
  overallTimeoutMs: 30000,
}

function parseIntegerOption(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function getNvidiaRacingConfig(env: Env): NvidiaRacingConfig {
  return {
    maxRacingKeys: parseIntegerOption(env.NVIDIA_RACE_MAX_KEYS, NVIDIA_RACING_DEFAULTS.maxRacingKeys, 1, 6),
    perKeyRetries: parseIntegerOption(env.NVIDIA_RACE_PER_KEY_RETRIES, NVIDIA_RACING_DEFAULTS.perKeyRetries, 1, 5),
    attemptTimeoutMs: parseIntegerOption(env.NVIDIA_RACE_ATTEMPT_TIMEOUT_MS, NVIDIA_RACING_DEFAULTS.attemptTimeoutMs, 1000, 30000),
    overallTimeoutMs: parseIntegerOption(env.NVIDIA_RACE_OVERALL_TIMEOUT_MS, NVIDIA_RACING_DEFAULTS.overallTimeoutMs, 3000, 120000),
  }
}

function randomInt(maxExclusive: number): number {
  const random = new Uint32Array(1)
  const limit = 0xffffffff - (0xffffffff % maxExclusive)
  let value = 0

  do {
    crypto.getRandomValues(random)
    value = random[0]
  } while (value >= limit)

  return value % maxExclusive
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function isNvidiaProvider(provider: Provider): boolean {
  const text = `${provider.id} ${provider.name} ${provider.baseUrl}`.toLowerCase()
  return text.includes('nvidia') || text.includes('integrate.api.nvidia.com')
}

async function getNvidiaProvider(env: Env): Promise<Provider | null> {
  const configured = await getProvider(env, NVIDIA_PROVIDER_ID)
  if (configured) return configured

  const providers = await getProviders(env)
  return providers.find(isNvidiaProvider) || null
}

function buildForwardHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
}

function buildProxyResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function isTransientNvidiaStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status === 499 || status >= 500
}

function looksTransientNvidiaError(detail: string): boolean {
  const lower = detail.toLowerCase()
  return [
    'rate limit',
    'rate_limit',
    'too many requests',
    'temporar',
    'try again',
    'capacity',
    'overload',
    'busy',
    'timeout',
    'timed out',
    'upstream',
    'gateway',
    'service unavailable',
    'internal server error',
  ].some((marker) => lower.includes(marker))
}

async function readErrorSnippet(response: Response, maxLength = 1000): Promise<string> {
  try {
    const text = await response.text()
    return text.substring(0, maxLength)
  } catch {
    return ''
  }
}

async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body) return

  try {
    await response.body.cancel()
  } catch {
    // The runtime may have already closed the body.
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err || 'Request failed')
}

async function fetchWithTimeout(url: string, init: RequestInit, parentSignal: AbortSignal, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const abortFromParent = () => controller.abort()

  if (parentSignal.aborted) {
    controller.abort()
  } else {
    parentSignal.addEventListener('abort', abortFromParent, { once: true })
  }

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    parentSignal.removeEventListener('abort', abortFromParent)
  }
}

async function runKeyWorker(params: {
  keyIndex: number
  apiKey: string
  forwardUrl: string
  method: string
  body: ProxyRequestBody
  config: NvidiaRacingConfig
  signal: AbortSignal
}): Promise<KeyWorkerResult> {
  let lastStatus = 502
  let lastDetail = 'NVIDIA request failed'

  for (let attempt = 1; attempt <= params.config.perKeyRetries; attempt++) {
    if (params.signal.aborted) {
      return { type: 'aborted', keyIndex: params.keyIndex }
    }

    try {
      const response = await fetchWithTimeout(params.forwardUrl, {
        method: params.method,
        headers: buildForwardHeaders(params.apiKey),
        body: JSON.stringify(params.body),
      }, params.signal, params.config.attemptTimeoutMs)

      if (response.ok) {
        return { type: 'success', response, keyIndex: params.keyIndex, attempt }
      }

      lastStatus = response.status

      if (isTransientNvidiaStatus(response.status)) {
        lastDetail = `HTTP ${response.status}`
        await cancelResponseBody(response)
        continue
      }

      const detail = await readErrorSnippet(response)
      lastDetail = detail || `HTTP ${response.status}`

      // Some NVIDIA transient failures arrive as non-429/5xx JSON errors.
      if (response.status === 400 && looksTransientNvidiaError(lastDetail)) {
        continue
      }

      return {
        type: 'failed',
        status: response.status,
        detail: lastDetail,
        hard: response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404,
        keyIndex: params.keyIndex,
      }
    } catch (err) {
      if (params.signal.aborted) {
        return { type: 'aborted', keyIndex: params.keyIndex }
      }
      lastStatus = 502
      lastDetail = errorMessage(err)
    }
  }

  return {
    type: 'failed',
    status: lastStatus,
    detail: lastDetail,
    hard: false,
    keyIndex: params.keyIndex,
  }
}

function abortLosers(tasks: RacingTask[], winnerId?: number): void {
  for (const task of tasks) {
    if (task.id !== winnerId) {
      task.controller.abort()
    }
  }
}

async function raceNvidiaKeys(params: {
  c: Context<{ Bindings: Env }>
  provider: Provider
  enabledKeys: ApiKeyEntry[]
  forwardUrl: string
  forwardBody: ProxyRequestBody
  method: string
}): Promise<Response> {
  const config = getNvidiaRacingConfig(params.c.env)
  const selectedKeys = shuffled(params.enabledKeys).slice(0, Math.min(params.enabledKeys.length, config.maxRacingKeys))

  const tasks: RacingTask[] = []
  const pending = new Set<Promise<SettledRacingTask>>()
  let lastFailure: { status: number; detail: string; hard: boolean } | null = null
  let winnerId: number | undefined

  for (let i = 0; i < selectedKeys.length; i++) {
    const controller = new AbortController()
    const promise = runKeyWorker({
      keyIndex: i,
      apiKey: selectedKeys[i].key,
      forwardUrl: params.forwardUrl,
      method: params.method,
      body: params.forwardBody,
      config,
      signal: controller.signal,
    })
      .catch((err): KeyWorkerResult => ({
        type: 'failed',
        status: 502,
        detail: errorMessage(err),
        hard: false,
        keyIndex: i,
      }))
      .then((result) => ({ taskId: i, result }))

    tasks.push({
      id: i,
      key: selectedKeys[i],
      controller,
      promise,
    })
    pending.add(promise)
  }

  const overallTimeoutId = setTimeout(() => abortLosers(tasks), config.overallTimeoutMs)

  try {
    while (pending.size > 0) {
      const settled = await Promise.race(pending)
      const settledTask = tasks[settled.taskId]
      if (settledTask) pending.delete(settledTask.promise)

      if (settled.result.type === 'success') {
        winnerId = settled.taskId
        clearTimeout(overallTimeoutId)
        abortLosers(tasks, winnerId)
        void Promise.allSettled([...pending])
        console.log(JSON.stringify({
          message: 'nvidia_race_winner',
          provider: params.provider.id,
          racedKeys: selectedKeys.length,
          keyIndex: settled.result.keyIndex,
          attempt: settled.result.attempt,
        }))
        return buildProxyResponse(settled.result.response)
      }

      if (settled.result.type === 'failed') {
        lastFailure = {
          status: settled.result.status,
          detail: settled.result.detail,
          hard: settled.result.hard,
        }
      }
    }
  } finally {
    clearTimeout(overallTimeoutId)
    abortLosers(tasks, winnerId)
  }

  const status = lastFailure?.status || 504
  const detail = lastFailure?.detail || 'NVIDIA racing request timed out or all attempts were canceled'
  return params.c.json({
    error: {
      message: `All NVIDIA key racing attempts failed; last HTTP status: ${status}`,
      type: 'nvidia_race_exhausted',
      detail: detail.substring(0, 500),
      raced_keys: selectedKeys.length,
      per_key_retries: config.perKeyRetries,
      hard_error: lastFailure?.hard || false,
    },
  }, status as Parameters<typeof params.c.json>[1])
}

function validateModel(provider: Provider, model: string): { ok: true } | { ok: false; response: Response } {
  if (provider.models.length === 0) return { ok: true }

  const modelConfig = provider.models.find((m) => m.id === model)
  if (!modelConfig) return { ok: true }

  if (!modelConfig.enabled) {
    return {
      ok: false,
      response: Response.json({
        error: { message: `Model "${model}" is disabled`, type: 'model_disabled' },
      }, { status: 403 }),
    }
  }

  return { ok: true }
}

export async function testModelConnection(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  _apiType?: 'openai' | 'anthropic'
): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const cleanBase = (baseUrl || NVIDIA_DEFAULT_BASE_URL).replace(/\/$/, '')
  let lastStatus: number | undefined
  let lastMessage = 'NVIDIA connection failed'

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${cleanBase}/chat/completions`, {
        method: 'POST',
        headers: buildForwardHeaders(apiKey),
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (response.ok) {
        return { success: true, message: 'NVIDIA connection succeeded', statusCode: response.status }
      }

      lastStatus = response.status

      if (isTransientNvidiaStatus(response.status)) {
        lastMessage = `HTTP ${response.status}`
        await cancelResponseBody(response)
        continue
      }

      const errorBody = await readErrorSnippet(response, 200)
      lastMessage = `HTTP ${response.status}: ${errorBody}`

      if (response.status === 400 && looksTransientNvidiaError(errorBody)) {
        continue
      }

      return { success: false, message: lastMessage, statusCode: response.status }
    } catch (err) {
      const error = err as Error
      lastMessage = `NVIDIA connection failed: ${error.message?.substring(0, 200) || 'unknown error'}`
    }
  }

  return { success: false, message: lastMessage, statusCode: lastStatus }
}

export async function handleProxy(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json<ProxyRequestBody>()
    const model = body.model

    if (!model) {
      return c.json({ error: { message: 'Missing model parameter', type: 'invalid_request_error' } }, 400)
    }

    const provider = await getNvidiaProvider(c.env)
    if (!provider) {
      return c.json({
        error: { message: 'NVIDIA provider is not configured; add a provider with id "nvidia" in the admin panel', type: 'configuration_error' },
      }, 500)
    }

    if (!provider.enabled) {
      return c.json({
        error: { message: 'NVIDIA provider is disabled', type: 'provider_disabled' },
      }, 403)
    }

    const modelValidation = validateModel(provider, model)
    if (!modelValidation.ok) return modelValidation.response

    const enabledKeys = provider.apiKeys.filter((key) => key.enabled)
    if (enabledKeys.length === 0) {
      return c.json({
        error: { message: 'No enabled NVIDIA API keys are configured', type: 'configuration_error' },
      }, 500)
    }

    const url = new URL(c.req.url)
    const subPath = url.pathname.replace(/^\/v1\//, '') || 'chat/completions'
    const cleanBase = (provider.baseUrl || NVIDIA_DEFAULT_BASE_URL).replace(/\/$/, '')
    const forwardUrl = `${cleanBase}/${subPath}${url.search}`

    return raceNvidiaKeys({
      c,
      provider,
      enabledKeys,
      forwardUrl,
      forwardBody: body,
      method: c.req.method,
    })
  } catch (err) {
    const error = err as Error
    return c.json({
      error: { message: error.message || 'NVIDIA proxy internal error', type: 'server_error' },
    }, 500)
  }
}

export async function handleModels(c: Context<{ Bindings: Env }>) {
  const provider = await getNvidiaProvider(c.env)

  if (!provider || !provider.enabled) {
    return c.json({ object: 'list', data: [] })
  }

  return c.json({
    object: 'list',
    data: provider.models
      .filter((model) => model.enabled)
      .map((model) => ({
        id: model.id,
        provider: provider.id,
        provider_name: provider.name,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'nvidia',
      })),
  })
}
