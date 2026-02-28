import { NextResponse } from "next/server";

/**
 * 健康检查端点
 * 用于 Docker HEALTHCHECK 和负载均衡器探测
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
