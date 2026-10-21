import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, s } from "@/db";

// Seat link (plan §3): /s/{token} sets the seat cookie and redirects to the project. R18: bad token -> 404.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = db();
  const [m] = await d.select().from(s.members).where(eq(s.members.token, token));
  if (!m) return new NextResponse("Seat not found", { status: 404 });
  const [p] = await d.select().from(s.projects).where(eq(s.projects.id, m.projectId));
  if (!p) return new NextResponse("Project not found", { status: 404 });
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: `/p/${p.code}?seat=${token}` },
  });
  res.cookies.set("fr_seat", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
