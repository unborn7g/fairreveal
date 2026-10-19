// FairReveal — pure rules engine (R1–R18 from FAIRTEAM-PLAN.md).
// No DB, no clock, no randomness: every function is deterministic and unit-tested.

export interface MemberIn { id: string; name: string }
export interface CommitmentIn { id: string; ownerId: string; title: string; weight: number; fulfilled: boolean; evidenceCount: number }
export interface ReviewIn { reviewerId: string; revieweeId: string; rating: number; comment?: string | null }

export interface MemberReport {
  memberId: string; name: string;
  commitmentPct: number; peerMean: number; peerPct: number; index: number;
  rawRatio: number; multiplier: number;
  flags: { type: "overclaim" | "disagreement" | "no-evidence"; detail: string }[];
  why: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// R1/R2 validation
export function validateProject(memberCount: number): string | null {
  if (memberCount < 3 || memberCount > 6) return "A project needs 3–6 members (R1).";
  return null;
}
export function validateCommitment(title: string, weight: number): string | null {
  if (!title || title.trim().length < 3 || title.trim().length > 80) return "Commitment title must be 3–80 characters (R2).";
  if (!Number.isInteger(weight) || weight < 1 || weight > 3) return "Weight must be an integer 1–3 (R2).";
  return null;
}
// R5
export function validateEvidence(note: string, url?: string | null): string | null {
  if (!note || note.trim().length < 10) return "Evidence note must be at least 10 characters (R5).";
  if (url && !/^https?:\/\/.+/i.test(url.trim())) return "Evidence link must start with http:// or https:// (R5).";
  return null;
}
// R8
export function validateReview(ratings: { rating: number; comment?: string | null }[]): string | null {
  for (const x of ratings) {
    if (!Number.isInteger(x.rating) || x.rating < 1 || x.rating > 5) return "Every rating must be an integer 1–5 (R8).";
    if (x.rating <= 2 && (!x.comment || x.comment.trim().length < 10)) return "A rating of 2 or lower needs a comment of at least 10 characters (R8).";
  }
  return null;
}
// R17
export function validateOverride(final: number, reason?: string | null): string | null {
  if (typeof final !== "number" || isNaN(final) || final < 0 || final > 1.1) return "Final multiplier must be between 0.00 and 1.10 (R17).";
  if (!reason || reason.trim().length < 10) return "An override needs a reason of at least 10 characters (R17).";
  return null;
}

// R12–R15
export function computeReport(members: MemberIn[], commitments: CommitmentIn[], reviews: ReviewIn[]): { teamMeanIndex: number; members: MemberReport[] } {
  const reports: MemberReport[] = members.map((m) => {
    const owned = commitments.filter((c) => c.ownerId === m.id);
    const ownedW = owned.reduce((s, c) => s + c.weight, 0);
    const doneW = owned.filter((c) => c.fulfilled).reduce((s, c) => s + c.weight, 0);
    const commitmentPct = ownedW === 0 ? 0 : r1((doneW / ownedW) * 100); // R12
    const peerRatings = reviews.filter((x) => x.revieweeId === m.id && x.reviewerId !== m.id).map((x) => x.rating);
    const peerMeanRaw = peerRatings.length ? peerRatings.reduce((a, b) => a + b, 0) / peerRatings.length : 0;
    const peerPct = r1((peerMeanRaw / 5) * 100); // R13
    const index = r1(0.6 * commitmentPct + 0.4 * peerPct); // R14 (first half)
    const self = reviews.find((x) => x.reviewerId === m.id && x.revieweeId === m.id)?.rating;

    const flags: MemberReport["flags"] = [];
    if (self !== undefined && peerRatings.length && self - peerMeanRaw >= 1.5)
      flags.push({ type: "overclaim", detail: `Rated themself ${self}, teammates averaged ${r1(peerMeanRaw)}.` }); // R15
    if (peerRatings.length && Math.max(...peerRatings) - Math.min(...peerRatings) >= 2)
      flags.push({ type: "disagreement", detail: `Teammate ratings ranged ${Math.min(...peerRatings)}–${Math.max(...peerRatings)}.` }); // R15
    for (const c of owned.filter((c) => c.evidenceCount === 0))
      flags.push({ type: "no-evidence", detail: `No evidence logged for: ${c.title}.` }); // R15

    return { memberId: m.id, name: m.name, commitmentPct, peerMean: r1(peerMeanRaw), peerPct, index, rawRatio: 0, multiplier: 0, flags, why: "" };
  });

  const teamMeanIndex = reports.length ? r2(reports.reduce((s, x) => s + x.index, 0) / reports.length) : 0;
  for (const rep of reports) {
    rep.rawRatio = teamMeanIndex === 0 ? 0 : r2(rep.index / teamMeanIndex);
    rep.multiplier = r2(clamp(rep.index / (teamMeanIndex || 1), 0.5, 1.1)); // R14 clamp 0.50–1.10
    const m = members.find((x) => x.id === rep.memberId)!;
    const owned = commitments.filter((c) => c.ownerId === m.id);
    const done = owned.filter((c) => c.fulfilled);
    const ownedW = owned.reduce((s, c) => s + c.weight, 0);
    const doneW = done.reduce((s, c) => s + c.weight, 0);
    const parts = [`Completed ${done.length} of ${owned.length} commitments (${doneW}/${ownedW} weight) for a commitment score of ${rep.commitmentPct}.`];
    const noEv = owned.filter((c) => c.evidenceCount === 0).map((c) => c.title);
    if (noEv.length) parts.push(`No evidence logged for: ${noEv.join(", ")}.`);
    const self = reviews.find((x) => x.reviewerId === m.id && x.revieweeId === m.id)?.rating;
    if (self !== undefined) parts.push(`Rated themself ${self}, teammates averaged ${rep.peerMean}.`);
    rep.why = parts.join(" ");
  }
  return { teamMeanIndex, members: reports };
}
