import type { NormalizedModel } from "@/types";

/** 模型测试结果 */
export interface TestModelResult {
  success: boolean;
  latency: number;
  error?: string;
}

/** Provider 适配器接口 — 所有厂商必须实现 */
export interface ProviderAdapter {
  /** 获取模型列表，返回归一化后的模型数组 */
  fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]>;

  /** 测试单个模型的可用性 */
  testModel(
    baseUrl: string,
    apiKey: string,
    modelId: string
  ): Promise<TestModelResult>;
}
