import { NextResponse } from "next/server";
import { deleteTokenCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(deleteTokenCookie());
  return res;
}
