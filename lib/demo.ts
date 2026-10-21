import { eq } from "drizzle-orm";
import { db, ensureSchema, s } from "../db";
import { uid, token, code } from "./server";

// Demo seeding: every sandbox is a fresh project in a known state (plan §3).
const NAMES = ["Amara", "Bayo", "Chen", "Dana"];
const GOLDEN_COMMITMENTS: [number, string, number, boolean][] = [
  [0, "Research brief", 2, true], [0, "Interview notes", 1, true],
  [1, "Slide deck", 3, true], [1, "Speaker script", 1, false],
  [2, "Prototype", 3, true], [2, "Test plan", 2, true],
  [3, "Visual design", 2, false], [3, "Rehearsal", 2, false],
];
const GRID: Record<number, number[]> = { 0: [4, 3, 5, 2], 1: [4, 4, 4, 2], 2: [4, 3, 5, 1], 3: [4, 5, 4, 5] };

export async function createDemo(mode: "scratch" | "evidence" | "reveal") {
  await ensureSchema();
  const d = db();
  const pid = uid(), pcode = code();
  await d.insert(s.projects).values({ id: pid, code: pcode, title: "Demo Team — Product Launch", phase: "setup", isDemo: true });
  const mems = [];
  for (let i = 0; i < 4; i++) {
    const m = { id: uid(), projectId: pid, name: NAMES[i], role: i === 0 ? "instructor" : "member", token: token() };
    await d.insert(s.members).values(m);
    mems.push(m);
  }
  if (mode === "scratch") return { code: pcode, instructorToken: mems[0].token };

  const now = new Date();
  for (const m of mems) await d.update(s.members).set({ agreedAt: now }).where(eq(s.members.id, m.id));
  const comms = [];
  for (const [oi, title, weight, fulfilled] of GOLDEN_COMMITMENTS) {
    const isFulfilled = mode === "evidence" && title === "Interview notes" ? false : fulfilled;
    const c = { id: uid(), projectId: pid, ownerId: mems[oi].id, title, weight, fulfilledAt: isFulfilled ? now : null };
    await d.insert(s.commitments).values(c);
    comms.push({ ...c, ownerIdx: oi });
  }
  for (const c of comms) {
    if (c.ownerIdx === 3) continue; // golden: Dana has no evidence
    await d.insert(s.evidence).values({ id: uid(), commitmentId: c.id, authorId: mems[c.ownerIdx].id, note: `Evidence logged for ${c.title.toLowerCase()} — see project board.`, url: "https://example.com/evidence" });
  }
  if (mode === "evidence") {
    await d.update(s.projects).set({ phase: "active" }).where(eq(s.projects.id, pid));
    return { code: pcode, instructorToken: mems[0].token };
  }
  await d.update(s.projects).set({ phase: "reviewing" }).where(eq(s.projects.id, pid));
  for (let r = 0; r < 3; r++) {
    for (let e = 0; e < 4; e++) {
      const rating = GRID[r][e];
      await d.insert(s.reviews).values({ id: uid(), projectId: pid, reviewerId: mems[r].id, revieweeId: mems[e].id, rating, comment: rating <= 2 ? "Missed the agreed deliverable this round." : null });
    }
    await d.update(s.members).set({ submittedAt: now }).where(eq(s.members.id, mems[r].id));
  }
  return { code: pcode, instructorToken: mems[0].token, danaToken: mems[3].token };
}
