import { NextRequest, NextResponse } from "next/server";
import type { Provider } from "@/types";
import { getProvider } from "@/lib/providers";

export async function POST(req: NextRequest) {
  const { baseUrl, apiKey, modelId, provider: rawProvider } = await req.json();

  const provider: Provider = rawProvider || "openai";

  if (provider === "openai" && !baseUrl) {
    return NextResponse.json(
      { error: "缺少 baseUrl" },
      { status: 400 }
    );
  }
  if (!apiKey || !modelId) {
    return NextResponse.json(
      { error: "缺少 apiKey 或 modelId" },
      { status: 400 }
    );
  }

  try {
    const adapter = getProvider(provider);
    const result = await adapter.testModel(baseUrl || "", apiKey, modelId);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { success: false, latency: 0, error: message }
    );
  }
}
