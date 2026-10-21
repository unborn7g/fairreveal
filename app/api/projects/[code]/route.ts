import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db, s } from "@/db";
import { getProject, getSeat, projectState, uid } from "@/lib/server";
import { validateCommitment, validateEvidence, validateReview, validateOverride, computeReport } from "@/lib/rules";


async function ctx(req: NextRequest, code_: string) {
  const project = await getProject(code_);
  if (!project) return { err: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  const hdrTok = req.headers.get("x-fr-seat") || undefined;
  const cookieTok = (await cookies()).get("fr_seat")?.value || undefined;
  let seat = await getSeat(hdrTok);
  if (!seat || seat.projectId !== project.id) {
    seat = await getSeat(cookieTok);
  }
  if (!seat || seat.projectId !== project.id) return { err: NextResponse.json({ error: "No seat" }, { status: 404 }) }; // R18
  return { project, seat };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: code_ } = await params;
  const c = await ctx(req, code_);
  if ("err" in c) return c.err;
  return NextResponse.json(await projectState(c.project.id, c.seat.id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: code_ } = await params;
  const c = await ctx(req, code_);
  if ("err" in c) return c.err;
  const { project, seat } = c;
  const d = db();
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const fail = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
  const isInstructor = seat.role === "instructor";

  try {
    if (action === "addCommitment") {
      if (project.phase !== "setup") return fail("Commitments are frozen after agreement (R3).");
      if (!isInstructor) return fail("Only the instructor can add commitments.", 403);
      const v = validateCommitment(body.title ?? "", Number(body.weight));
      if (v) return fail(v);
      const owner = await d.select().from(s.members).where(and(eq(s.members.id, body.ownerId ?? ""), eq(s.members.projectId, project.id)));
      if (!owner.length) return fail("Owner must be a project member (R2).");
      await d.insert(s.commitments).values({ id: uid(), projectId: project.id, ownerId: body.ownerId, title: String(body.title).trim(), weight: Number(body.weight) });
    } else if (action === "agree") {
      if (project.phase !== "setup") return fail("Agreement already closed.");
      const comms = await d.select().from(s.commitments).where(eq(s.commitments.projectId, project.id));
      const mems = await d.select().from(s.members).where(eq(s.members.projectId, project.id));
      if (mems.some((m) => !comms.some((x) => x.ownerId === m.id))) return fail("Every member must own at least one commitment before agreement (R1).");
      await d.update(s.members).set({ agreedAt: new Date() }).where(eq(s.members.id, seat.id));
      const after = await d.select().from(s.members).where(eq(s.members.projectId, project.id));
      if (after.every((m) => m.agreedAt)) await d.update(s.projects).set({ phase: "active" }).where(eq(s.projects.id, project.id)); // R3
    } else if (action === "addEvidence") {
      if (project.phase !== "active") return fail("Evidence can be logged while the project is Active.");
      const [comm] = await d.select().from(s.commitments).where(and(eq(s.commitments.id, body.commitmentId ?? ""), eq(s.commitments.projectId, project.id)));
      if (!comm) return fail("Commitment not found.", 404);
      if (comm.ownerId !== seat.id) return fail("Only the owner can log evidence on this commitment (R4).", 403); // R4
      const v = validateEvidence(body.note ?? "", body.url);
      if (v) return fail(v);
      await d.insert(s.evidence).values({ id: uid(), commitmentId: comm.id, authorId: seat.id, note: String(body.note).trim(), url: body.url?.trim() || null });
    } else if (action === "fulfill") {
      if (project.phase !== "active") return fail("Commitments can be fulfilled while Active.");
      const [comm] = await d.select().from(s.commitments).where(and(eq(s.commitments.id, body.commitmentId ?? ""), eq(s.commitments.projectId, project.id)));
      if (!comm) return fail("Commitment not found.", 404);
      if (comm.ownerId !== seat.id) return fail("Only the owner can fulfil this commitment.", 403);
      const evs = await d.select().from(s.evidence).where(eq(s.evidence.commitmentId, comm.id));
      if (!evs.length) return fail("Add at least one evidence entry before marking fulfilled (R6)."); // R6
      await d.update(s.commitments).set({ fulfilledAt: new Date() }).where(eq(s.commitments.id, comm.id));
    } else if (action === "openReviews") {
      if (!isInstructor) return fail("Only the instructor can open the review round (R7).", 403); // R7
      if (project.phase !== "active") return fail("Reviews open from Active only (R7).");
      if (project.isDemo) {
        const comms = await d.select().from(s.commitments).where(eq(s.commitments.projectId, project.id));
        const interviewComm = comms.find((x) => x.title === "Interview notes" && !x.fulfilledAt);
        if (interviewComm) {
          await d.update(s.commitments).set({ fulfilledAt: new Date() }).where(eq(s.commitments.id, interviewComm.id));
        }
      }
      await d.update(s.projects).set({ phase: "reviewing" }).where(eq(s.projects.id, project.id));
    } else if (action === "submitReview") {
      if (project.phase !== "reviewing") return fail("The review round is not open.");
      if (seat.submittedAt) return fail("You have already submitted. Reviews are immutable (R9)."); // R9
      const mems = await d.select().from(s.members).where(eq(s.members.projectId, project.id));
      const ratings = (body.ratings ?? []) as { revieweeId: string; rating: number; comment?: string }[];
      if (ratings.length !== mems.length || mems.some((m) => !ratings.some((r) => r.revieweeId === m.id)))
        return fail("Rate yourself and every teammate (R8).");
      const v = validateReview(ratings);
      if (v) return fail(v);
      for (const r of ratings)
        await d.insert(s.reviews).values({ id: uid(), projectId: project.id, reviewerId: seat.id, revieweeId: r.revieweeId, rating: Number(r.rating), comment: r.comment?.trim() || null });
      await d.update(s.members).set({ submittedAt: new Date() }).where(eq(s.members.id, seat.id));
      const after = await d.select().from(s.members).where(eq(s.members.projectId, project.id));
      if (after.every((m) => m.submittedAt)) await d.update(s.projects).set({ phase: "unlocked" }).where(eq(s.projects.id, project.id)); // R11
    } else if (action === "approve") {
      if (!isInstructor) return fail("Only the instructor can approve (R17).", 403); // R17
      if (project.phase !== "unlocked") return fail("Approve is available after the reveal.");
      const mems = await d.select().from(s.members).where(eq(s.members.projectId, project.id));
      const comms = await d.select().from(s.commitments).where(eq(s.commitments.projectId, project.id));
      const evs = await d.select().from(s.evidence);
      const revs = await d.select().from(s.reviews).where(eq(s.reviews.projectId, project.id));
      const report = computeReport(
        mems.map((m) => ({ id: m.id, name: m.name })),
        comms.map((x) => ({ id: x.id, ownerId: x.ownerId, title: x.title, weight: x.weight, fulfilled: !!x.fulfilledAt, evidenceCount: evs.filter((e) => e.commitmentId === x.id).length })),
        revs.map((r) => ({ reviewerId: r.reviewerId, revieweeId: r.revieweeId, rating: r.rating, comment: r.comment })),
      );
      const finals = (body.decisions ?? []) as { memberId: string; final: number; reason?: string }[];
      for (const rep of report.members) {
        const f = finals.find((x) => x.memberId === rep.memberId);
        const final = f ? Number(f.final) : rep.multiplier;
        if (f && Math.abs(final - rep.multiplier) > 1e-9) { const v = validateOverride(final, f.reason); if (v) return fail(v); }
        else if (isNaN(final) || final < 0 || final > 1.1) return fail("Final multiplier must be between 0.00 and 1.10 (R17).");
        await d.insert(s.decisions).values({ projectId: project.id, memberId: rep.memberId, suggested: rep.multiplier, final, reason: f?.reason?.trim() || null });
      }
      await d.update(s.projects).set({ phase: "approved" }).where(eq(s.projects.id, project.id));
    } else {
      return fail("Unknown action.");
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Server error", 500);
  }
  return NextResponse.json(await projectState(project.id, seat.id));
}
