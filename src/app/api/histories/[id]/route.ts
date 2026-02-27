import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { checkHistories } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const historyId = parseInt(id, 10);
  if (isNaN(historyId)) {
    return NextResponse.json({ error: "无效的 ID" }, { status: 400 });
  }

  const db = getDb();

  const history = db
    .select()
    .from(checkHistories)
    .where(eq(checkHistories.id, historyId))
    .get();

  if (!history) {
    return NextResponse.json({ error: "历史记录不存在" }, { status: 404 });
  }

  if (history.userId !== user.userId) {
    return NextResponse.json({ error: "无权访问此记录" }, { status: 403 });
  }

  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const historyId = parseInt(id, 10);
  if (isNaN(historyId)) {
    return NextResponse.json({ error: "无效的 ID" }, { status: 400 });
  }

  const db = getDb();

  const history = db
    .select()
    .from(checkHistories)
    .where(eq(checkHistories.id, historyId))
    .get();

  if (!history) {
    return NextResponse.json({ error: "历史记录不存在" }, { status: 404 });
  }

  if (history.userId !== user.userId) {
    return NextResponse.json({ error: "无权删除此记录" }, { status: 403 });
  }

  db.delete(checkHistories)
    .where(and(eq(checkHistories.id, historyId), eq(checkHistories.userId, user.userId)))
    .run();

  return NextResponse.json({ success: true });
}
