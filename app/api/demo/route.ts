import { NextRequest, NextResponse } from "next/server";
import { createDemo } from "@/lib/demo";
export async function POST(req: NextRequest) {
  const { mode } = await req.json().catch(() => ({ mode: "scratch" }));
  if (!["scratch", "evidence", "reveal"].includes(mode)) return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  const r = await createDemo(mode);
  const res = NextResponse.json(r);
  res.cookies.set("fr_seat", r.instructorToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
