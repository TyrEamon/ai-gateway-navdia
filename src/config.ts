import type { Provider } from './types'

export const SITE_CONFIG = {
  title: 'AI Gateway',
  subtitle: '统一的 AI 管理平台',
  author: 'QingYun',
  authorUrl: 'https://github.com/QingYun',
  blogUrl: 'https://qingyun.blog',
  description: 'AI 提供商 API 代理网关 — 统一 /v1 接口转发',
}

export const SESSION_TTL = 7 * 24 * 60 * 60

export const PROXY_KEY_PREFIX = 'sk_cf_'

export const KV_KEYS = {
  PROVIDERS: 'providers',
  PROXY_KEYS: 'proxy:keys',
  SESSION_PREFIX: 'admin:session:',
} as const

// 有效期选项（秒）
export const EXPIRY_OPTIONS: Record<string, number | null> = {
  '30d': 30 * 24 * 60 * 60,
  '90d': 90 * 24 * 60 * 60,
  '180d': 180 * 24 * 60 * 60,
  '1y': 365 * 24 * 60 * 60,
  'forever': null,
}

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    apiType: 'openai',
    apiKeys: [],
    models: [
      { id: 'deepseek-chat', enabled: true },
      { id: 'deepseek-reasoner', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'openai',
    apiKeys: [],
    models: [
      { id: 'gpt-4o', enabled: true },
      { id: 'gpt-4o-mini', enabled: true },
      { id: 'o3-mini', enabled: true },
      { id: 'o4-mini', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiType: 'anthropic',
    apiKeys: [],
    models: [
      { id: 'claude-sonnet-4-20250514', enabled: true },
      { id: 'claude-3-5-sonnet-20241022', enabled: true },
      { id: 'claude-3-5-haiku-20241022', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    apiType: 'openai',
    apiKeys: [],
    models: [
      { id: 'gemini-2.5-pro-exp-03-25', enabled: true },
      { id: 'gemini-2.5-flash-preview-04-17', enabled: true },
      { id: 'gemini-2.0-flash', enabled: true },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
