import { NextRequest, NextResponse } from "next/server";
import { db, s } from "@/db";
import { uid, token, code } from "@/lib/server";
import { validateProject } from "@/lib/rules";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const names = (body.memberNames ?? []).map((x: unknown) => String(x).trim()).filter(Boolean) as string[];
  if (title.length < 3) return NextResponse.json({ error: "Give the project a title (3+ characters)." }, { status: 400 });
  const v = validateProject(names.length);
  if (v) return NextResponse.json({ error: v }, { status: 400 });
  const d = db();
  const pid = uid(), pcode = code();
  await d.insert(s.projects).values({ id: pid, code: pcode, title, phase: "setup", isDemo: false });
  const seats: { name: string; path: string }[] = [];
  let instructorToken = "";
  for (let i = 0; i < names.length; i++) {
    const t = token();
    if (i === 0) instructorToken = t;
    await d.insert(s.members).values({ id: uid(), projectId: pid, name: names[i], role: i === 0 ? "instructor" : "member", token: t });
    seats.push({ name: names[i], path: `/s/${t}` });
  }
  const res = NextResponse.json({ code: pcode, seats });
  res.cookies.set("fr_seat", instructorToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
