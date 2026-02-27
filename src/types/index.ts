// ============ Provider ============

/** 支持的模型厂商 */
export type Provider = "openai" | "anthropic" | "gemini";

/** Provider 显示信息 */
export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI (兼容)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
};

/** Provider 默认 Base URL */
export const PROVIDER_DEFAULT_BASE_URL: Record<Provider, string> = {
  openai: "",
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
};

// ============ Model ============

/** 模型信息（来自 /v1/models 接口，OpenAI 原始格式） */
export interface Model {
  id: string;
  object: string;
  owned_by: string;
}

/** 模型列表接口响应（OpenAI 原始格式） */
export interface ModelsResponse {
  object: "list";
  data: Model[];
}

/** 归一化后的模型信息（所有 provider 统一格式） */
export interface NormalizedModel {
  /** 模型 ID（用于 API 调用） */
  id: string;
  /** 可选的展示名称 */
  displayName?: string;
}

// ============ Test ============

/** 单个模型的检测状态 */
export type TestStatus = "pending" | "testing" | "success" | "failed";

/** 单个模型的检测结果 */
export interface TestResult {
  modelId: string;
  status: TestStatus;
  /** 响应耗时（ms） */
  latency?: number;
  /** 失败时的错误信息 */
  error?: string;
}

// ============ Config ============

/** API 配置 */
export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  /** 厂商类型，默认 openai */
  provider?: Provider;
}
