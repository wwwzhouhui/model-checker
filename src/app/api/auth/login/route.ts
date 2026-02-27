import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken, createTokenCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  const db = getDb();

  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const token = await signToken(user.id, user.email);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email },
  });
  res.cookies.set(createTokenCookie(token));
  return res;
}
