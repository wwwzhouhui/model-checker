import type { Provider } from "@/types";
import type { ProviderAdapter } from "./types";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";

export type { ProviderAdapter, TestModelResult } from "./types";

const providers: Record<Provider, ProviderAdapter> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

/** 根据厂商类型获取对应的适配器 */
export function getProvider(type: Provider): ProviderAdapter {
  const adapter = providers[type];
  if (!adapter) {
    throw new Error(`不支持的 Provider: ${type}`);
  }
  return adapter;
}
