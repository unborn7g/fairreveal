import { describe, it, expect } from "vitest";
import { computeReport, validateEvidence, validateReview, validateOverride, validateCommitment } from "./rules";

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
