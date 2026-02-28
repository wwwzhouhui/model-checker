import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET() {
  const userReq = await getUserFromRequest();
  if (!userReq) {
    return NextResponse.json({ user: null });
  }

  // 从数据库获取完整用户信息
  const db = getDb();
  const userRecord = db.select().from(users).where(eq(users.id, userReq.userId)).get();

  if (!userRecord) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: userRecord.id,
      userId: userRecord.id,
      email: userRecord.email,
      avatarUrl: userRecord.avatarUrl,
      username: userRecord.username,
      oauthProvider: userRecord.oauthProvider,
    },
  });
}
