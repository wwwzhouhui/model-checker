import { NextRequest, NextResponse } from "next/server";
import type { Provider } from "@/types";
import { getProvider } from "@/lib/providers";

export async function POST(req: NextRequest) {
  const { baseUrl, apiKey, provider: rawProvider } = await req.json();

  const provider: Provider = rawProvider || "openai";

  // openai 必须传 baseUrl；anthropic / gemini 有默认值可不传
  if (provider === "openai" && !baseUrl) {
    return NextResponse.json(
      { error: "缺少 baseUrl" },
      { status: 400 }
    );
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少 apiKey" },
      { status: 400 }
    );
  }

  try {
    const adapter = getProvider(provider);
    const models = await adapter.fetchModels(baseUrl || "", apiKey);

    // 统一返回格式，兼容前端现有的 data 数组消费方式
    return NextResponse.json({
      object: "list",
      data: models.map((m) => ({
        id: m.id,
        object: "model",
        owned_by: provider,
        display_name: m.displayName,
      })),
    });
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === "TimeoutError"
        ? "请求超时（15s）"
        : err instanceof Error
          ? err.message
          : "未知错误";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
