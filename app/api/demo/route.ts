import { NextRequest, NextResponse } from "next/server";
import { createDemo } from "@/lib/demo";

export async function POST(req: NextRequest) {
  const { mode: rawMode } = await req.json().catch(() => ({ mode: "scratch" }));
  const modeMap: Record<string, "scratch" | "evidence" | "reveal"> = {
    scratch: "scratch",
    setup: "scratch",
    evidence: "evidence",
    active: "evidence",
    reveal: "reveal",
    reviewing: "reveal",
    unlocked: "reveal",
  };
  const mode = modeMap[String(rawMode)] ?? null;
  if (!mode) return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  try {
    const r = await createDemo(mode);
    const res = NextResponse.json(r);
    res.cookies.set("fr_seat", r.instructorToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Database error while creating demo." },
      { status: 500 }
    );
  }
}
