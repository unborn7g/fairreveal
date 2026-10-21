import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { computeReport, validateEvidence, validateReview, validateOverride, validateCommitment, validateProject } from "./rules";
import { createDemo } from "./demo";
import { getProject, getSeat, projectState } from "./server";
import { db, s } from "../db";

// Golden example from FAIRTEAM-PLAN.md §4 — exact assertion values.
const members = [
  { id: "amara", name: "Amara" }, { id: "bayo", name: "Bayo" },
  { id: "chen", name: "Chen" }, { id: "dana", name: "Dana" },
];
const commitments = [
  { id: "c1", ownerId: "amara", title: "Research brief", weight: 2, fulfilled: true, evidenceCount: 1 },
  { id: "c2", ownerId: "amara", title: "Interview notes", weight: 1, fulfilled: true, evidenceCount: 1 },
  { id: "c3", ownerId: "bayo", title: "Slide deck", weight: 3, fulfilled: true, evidenceCount: 1 },
  { id: "c4", ownerId: "bayo", title: "Speaker script", weight: 1, fulfilled: false, evidenceCount: 1 },
  { id: "c5", ownerId: "chen", title: "Prototype", weight: 3, fulfilled: true, evidenceCount: 1 },
  { id: "c6", ownerId: "chen", title: "Test plan", weight: 2, fulfilled: true, evidenceCount: 1 },
  { id: "c7", ownerId: "dana", title: "Visual design", weight: 2, fulfilled: false, evidenceCount: 0 },
  { id: "c8", ownerId: "dana", title: "Rehearsal", weight: 2, fulfilled: false, evidenceCount: 0 },
];
// reviewer -> [Amara, Bayo, Chen, Dana]
const grid: Record<string, number[]> = { amara: [4, 3, 5, 2], bayo: [4, 4, 4, 2], chen: [4, 3, 5, 1], dana: [4, 5, 4, 5] };
const reviews = Object.entries(grid).flatMap(([reviewerId, rs]) =>
  members.map((m, i) => ({ reviewerId, revieweeId: m.id, rating: rs[i] })));

describe("golden example", () => {
  const { teamMeanIndex, members: rep } = computeReport(members, commitments, reviews);
  const by = (id: string) => rep.find((x) => x.memberId === id)!;
  it("team mean index is 68.58", () => expect(teamMeanIndex).toBe(68.58));
  it("Amara 92.0 / 1.10 capped, no flags", () => {
    expect(by("amara").index).toBe(92.0); expect(by("amara").multiplier).toBe(1.10); expect(by("amara").flags).toHaveLength(0);
  });
  it("Bayo 74.3 / 1.08 + disagreement", () => {
    expect(by("bayo").index).toBe(74.3); expect(by("bayo").multiplier).toBe(1.08);
    expect(by("bayo").flags.map((f) => f.type)).toContain("disagreement");
  });
  it("Chen 94.7 / 1.10 capped", () => {
    expect(by("chen").index).toBe(94.7); expect(by("chen").multiplier).toBe(1.10);
  });
  it("Dana 13.3 / 0.50 floor + overclaim + 2x no-evidence", () => {
    expect(by("dana").index).toBe(13.3); expect(by("dana").multiplier).toBe(0.50);
    const t = by("dana").flags.map((f) => f.type);
    expect(t).toContain("overclaim"); expect(t.filter((x) => x === "no-evidence")).toHaveLength(2);
  });
});

describe("validation rules", () => {
  it("R1 project team size 3–6", () => {
    expect(validateProject(2)).toBeTruthy();
    expect(validateProject(7)).toBeTruthy();
    expect(validateProject(4)).toBeNull();
  });
  it("R5 short note / bad link", () => {
    expect(validateEvidence("short")).toBeTruthy();
    expect(validateEvidence("a long enough note", "ftp://x")).toBeTruthy();
    expect(validateEvidence("a long enough note", "https://x.dev")).toBeNull();
  });
  it("R8 low rating needs comment", () => {
    expect(validateReview([{ rating: 2 }])).toBeTruthy();
    expect(validateReview([{ rating: 2, comment: "missed two sessions" }])).toBeNull();
    expect(validateReview([{ rating: 5 }])).toBeNull();
  });
  it("R17 override bounds + reason", () => {
    expect(validateOverride(1.2, "a proper reason here")).toBeTruthy();
    expect(validateOverride(1.0, "short")).toBeTruthy();
    expect(validateOverride(1.0, "a proper reason here")).toBeNull();
  });
  it("R2 commitment bounds", () => {
    expect(validateCommitment("ab", 2)).toBeTruthy();
    expect(validateCommitment("Good title", 4)).toBeTruthy();
    expect(validateCommitment("Good title", 2)).toBeNull();
  });
});

describe("end-to-end seal & sandbox workflow (R10, R11, R16)", () => {
  it("scratch sandbox starts in setup phase with 4 seats", async () => {
    const demo = await createDemo("scratch");
    const proj = await getProject(demo.code);
    const seat = await getSeat(demo.instructorToken);
    expect(proj?.phase).toBe("setup");
    const st = await projectState(proj!.id, seat!.id);
    expect(st.members).toHaveLength(4);
    expect(st.commitments).toHaveLength(0);
  });

  it("evidence sandbox starts in active phase with 8 golden commitments", async () => {
    const demo = await createDemo("evidence");
    const proj = await getProject(demo.code);
    const seat = await getSeat(demo.instructorToken);
    const st = await projectState(proj!.id, seat!.id);
    expect(st.project.phase).toBe("active");
    expect(st.commitments).toHaveLength(8);
  });

  it("reveal sandbox enforces seal at 3/4 (R10) and unlocks golden report on 4/4 (R11, R16)", async () => {
    const demo = await createDemo("reveal");
    const proj = await getProject(demo.code);
    const amara = await getSeat(demo.instructorToken);
    const dana = await getSeat(demo.danaToken);

    // R10: While 3/4 submitted, report and reviewDetail are null even for instructor
    const sealed = await projectState(proj!.id, amara!.id);
    expect(sealed.project.phase).toBe("reviewing");
    expect(sealed.submittedCount).toBe(3);
    expect(sealed.pendingNames).toEqual(["Dana"]);
    expect(sealed.report).toBeNull();
    expect(sealed.reviewDetail).toBeNull();

    // Simulate Dana's 4th submission and unlock (R11)
    const d = db();
    const ratings = [4, 5, 4, 5];
    for (let i = 0; i < sealed.members.length; i++) {
      await d.insert(s.reviews).values({
        id: `rev-dana-${i}-${demo.code}`,
        projectId: proj!.id,
        reviewerId: dana!.id,
        revieweeId: sealed.members[i].id,
        rating: ratings[i],
        comment: null,
      });
    }
    await d.update(s.members).set({ submittedAt: new Date() }).where(eq(s.members.id, dana!.id));
    await d.update(s.projects).set({ phase: "unlocked" }).where(eq(s.projects.id, proj!.id));

    // Instructor sees report AND 16 raw review rows (R16)
    const unlockedInstructor = await projectState(proj!.id, amara!.id);
    expect(unlockedInstructor.report?.teamMeanIndex).toBe(68.58);
    expect(unlockedInstructor.reviewDetail).toHaveLength(16);

    // Member Dana sees report but NOT raw reviewDetail (R16)
    const unlockedMember = await projectState(proj!.id, dana!.id);
    expect(unlockedMember.report?.teamMeanIndex).toBe(68.58);
    expect(unlockedMember.reviewDetail).toBeNull();
  });
});
