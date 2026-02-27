import type { NormalizedModel } from "@/types";
import type { ProviderAdapter, TestModelResult } from "./types";

/** OpenAI 兼容接口适配器（也兼容 NewAPI 等第三方代理） */
export const openaiProvider: ProviderAdapter = {
  async fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]> {
    const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`上游返回 ${res.status}${text ? `: ${text}` : ""}`);
    }

    const data = await res.json();
    const list: { id: string }[] = data.data ?? [];

    return list.map((m) => ({ id: m.id }));
  },

  async testModel(
    baseUrl: string,
    apiKey: string,
    modelId: string
  ): Promise<TestModelResult> {
    const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5,
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
        data.choices?.length > 0 &&
        (data.choices[0].message?.content !== undefined ||
          data.choices[0].delta !== undefined);

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
