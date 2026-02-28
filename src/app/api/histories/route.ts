import { NextRequest, NextResponse } from "next/server";
import { eq, and, like, desc, count } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { checkHistories } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  const db = getDb();

  // 构建 where 条件
  const baseCondition = eq(checkHistories.userId, user.userId);
  const whereCondition = search
    ? and(
        baseCondition,
        like(checkHistories.configName, `%${search}%`)
      )
    : baseCondition;

  // 查询总数
  const totalResult = await db
    .select({ value: count() })
    .from(checkHistories)
    .where(whereCondition)
    .limit(1);
  const total = totalResult[0]?.value ?? 0;

  // 查询列表（不含 results_json）
  const histories = await db
    .select({
      id: checkHistories.id,
      configId: checkHistories.configId,
      configName: checkHistories.configName,
      baseUrl: checkHistories.baseUrl,
      total: checkHistories.total,
      success: checkHistories.success,
      failed: checkHistories.failed,
      createdAt: checkHistories.createdAt,
    })
    .from(checkHistories)
    .where(whereCondition)
    .orderBy(desc(checkHistories.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    histories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { config_id, config_name, base_url, total, success, failed, results_json } = body;

  if (!config_name || !base_url) {
    return NextResponse.json({ error: "config_name 和 base_url 不能为空" }, { status: 400 });
  }

  if (total === undefined || success === undefined || failed === undefined) {
    return NextResponse.json({ error: "total、success、failed 不能为空" }, { status: 400 });
  }

  if (!results_json) {
    return NextResponse.json({ error: "results_json 不能为空" }, { status: 400 });
  }

  const db = getDb();

  const result = await db
    .insert(checkHistories)
    .values({
      userId: user.userId,
      configId: config_id ?? null,
      configName: config_name,
      baseUrl: base_url,
      total,
      success,
      failed,
      resultsJson: results_json,
    })
    .returning();
  const history = result[0];

  return NextResponse.json({
    history: {
      id: history.id,
      configName: history.configName,
      baseUrl: history.baseUrl,
      total: history.total,
      success: history.success,
      failed: history.failed,
      createdAt: history.createdAt,
    },
  });
}
