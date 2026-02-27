import type { NormalizedModel } from "@/types";
import type { ProviderAdapter, TestModelResult } from "./types";

const ANTHROPIC_VERSION = "2023-06-01";

/** Anthropic (Claude) API 适配器 */
export const anthropicProvider: ProviderAdapter = {
  async fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]> {
    const base = baseUrl.replace(/\/+$/, "") || "https://api.anthropic.com";
    const allModels: NormalizedModel[] = [];
    let afterId: string | undefined;

    // 分页循环获取全部模型
    while (true) {
      const params = new URLSearchParams({ limit: "1000" });
      if (afterId) params.set("after_id", afterId);

      const url = `${base}/v1/models?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`上游返回 ${res.status}${text ? `: ${text}` : ""}`);
      }

      const data = await res.json();
      const list: { id: string; display_name?: string }[] = data.data ?? [];

      for (const m of list) {
        allModels.push({
          id: m.id,
          displayName: m.display_name,
        });
      }

      if (!data.has_more || !data.last_id) break;
      afterId = data.last_id;
    }

    return allModels;
  },

  async testModel(
    baseUrl: string,
    apiKey: string,
    modelId: string
  ): Promise<TestModelResult> {
    const base = baseUrl.replace(/\/+$/, "") || "https://api.anthropic.com";
    const url = `${base}/v1/messages`;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 5,
          messages: [{ role: "user", content: "hi" }],
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
        Array.isArray(data.content) &&
        data.content.length > 0 &&
        data.content[0].text !== undefined;

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
