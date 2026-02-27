import type { NormalizedModel } from "@/types";
import type { ProviderAdapter, TestModelResult } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com";

/** Google Gemini API 适配器 */
export const geminiProvider: ProviderAdapter = {
  async fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]> {
    const base = (baseUrl.replace(/\/+$/, "") || GEMINI_BASE);
    const allModels: NormalizedModel[] = [];
    let pageToken: string | undefined;

    // 分页循环获取全部模型
    while (true) {
      const params = new URLSearchParams({ key: apiKey, pageSize: "1000" });
      if (pageToken) params.set("pageToken", pageToken);

      const url = `${base}/v1beta/models?${params.toString()}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`上游返回 ${res.status}${text ? `: ${text}` : ""}`);
      }

      const data = await res.json();
      const list: {
        name: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }[] = data.models ?? [];

      for (const m of list) {
        // 仅保留支持 generateContent 的模型
        if (!m.supportedGenerationMethods?.includes("generateContent")) continue;

        // models/gemini-2.0-flash → gemini-2.0-flash
        const id = m.name.replace(/^models\//, "");
        allModels.push({
          id,
          displayName: m.displayName,
        });
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    return allModels;
  },

  async testModel(
    baseUrl: string,
    apiKey: string,
    modelId: string
  ): Promise<TestModelResult> {
    const base = (baseUrl.replace(/\/+$/, "") || GEMINI_BASE);
    // 确保模型名含 models/ 前缀
    const modelName = modelId.startsWith("models/") ? modelId : `models/${modelId}`;
    const url = `${base}/v1beta/${modelName}:generateContent?key=${apiKey}`;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      const latency = Date.now() - start;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { success: false, latency, error: `HTTP ${res.status}${text ? ` ${text}` : ""}` };
      }

      const data = await res.json();
      const hasContent =
        Array.isArray(data.candidates) &&
        data.candidates.length > 0 &&
        Array.isArray(data.candidates[0]?.content?.parts) &&
        data.candidates[0].content.parts.length > 0;

      return {
        success: hasContent,
        latency,
        error: hasContent ? undefined : "响应中无有效内容",
      };
    } catch (err) {
      const latency = Date.now() - start;
      const message =
        err instanceof DOMException && err.name === "TimeoutError"
          ? "请求超时（30s）"
          : err instanceof Error
            ? err.message
            : "未知错误";
      return { success: false, latency, error: message };
    }
  },
};
