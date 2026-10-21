import { randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, s } from "../db";
import { computeReport } from "./rules";

export const uid = () => randomUUID();
export const token = () => randomBytes(16).toString("hex"); // 128-bit seat token (plan §3)
export const code = () => randomBytes(4).toString("hex");

export async function getProject(code_: string) {
  const [p] = await db().select().from(s.projects).where(eq(s.projects.code, code_));
  return p ?? null;
}
export async function getSeat(tok: string | undefined | null) {
  if (!tok) return null;
  const [m] = await db().select().from(s.members).where(eq(s.members.token, tok));
  return m ?? null;
}

export async function projectState(projectId: string, viewerId: string | null) {
  const d = db();
  const [project] = await d.select().from(s.projects).where(eq(s.projects.id, projectId));
  const mems = await d.select().from(s.members).where(eq(s.members.projectId, projectId));
  const comms = await d.select().from(s.commitments).where(eq(s.commitments.projectId, projectId));
  const evs = comms.length ? await d.select().from(s.evidence) : [];
  const myEvs = evs.filter((e) => comms.some((c) => c.id === e.commitmentId));
  const unlocked = project.phase === "unlocked" || project.phase === "approved";
  const viewer = mems.find((m) => m.id === viewerId) ?? null;
  const isInstructor = viewer?.role === "instructor";

  let report = null, reviewDetail = null;
  if (unlocked) {
    const revs = await d.select().from(s.reviews).where(eq(s.reviews.projectId, projectId));
    report = computeReport(
      mems.map((m) => ({ id: m.id, name: m.name })),
      comms.map((c) => ({ id: c.id, ownerId: c.ownerId, title: c.title, weight: c.weight, fulfilled: !!c.fulfilledAt, evidenceCount: myEvs.filter((e) => e.commitmentId === c.id).length })),
      revs.map((r) => ({ reviewerId: r.reviewerId, revieweeId: r.revieweeId, rating: r.rating, comment: r.comment })),
    );
    if (isInstructor) reviewDetail = revs; // R16: who-rated-what is instructor-only
  }
  const decs = unlocked ? await d.select().from(s.decisions).where(eq(s.decisions.projectId, projectId)) : [];

  return {
    project: { code: project.code, title: project.title, phase: project.phase, isDemo: project.isDemo },
    viewer: viewer ? { id: viewer.id, name: viewer.name, role: viewer.role, agreed: !!viewer.agreedAt, submitted: !!viewer.submittedAt } : null,
    members: mems.map((m) => ({ id: m.id, name: m.name, role: m.role, agreed: !!m.agreedAt, submitted: !!m.submittedAt, seatPath: project.isDemo || isInstructor || m.id === viewerId ? `/s/${m.token}` : undefined })),
    commitments: comms.map((c) => ({ id: c.id, ownerId: c.ownerId, title: c.title, weight: c.weight, fulfilled: !!c.fulfilledAt, evidence: myEvs.filter((e) => e.commitmentId === c.id).map((e) => ({ id: e.id, authorId: e.authorId, note: e.note, url: e.url })) })),
    submittedCount: mems.filter((m) => m.submittedAt).length,
    memberCount: mems.length,
    pendingNames: mems.filter((m) => !m.submittedAt).map((m) => m.name),
    report, reviewDetail,
    decisions: decs.map((x) => ({ memberId: x.memberId, suggested: x.suggested, final: x.final, reason: x.reason })),
  };
}
