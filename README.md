# FairReveal — Sealed reviews. One fair reveal.

FairReveal turns a group agreement into an evidence-backed contribution record — then unlocks sealed peer reviews **only after everyone has submitted**. Nobody (not even the instructor) sees a single rating until the final ballot lands.

- **Live App:** `https://fairreveal.vercel.app` *(update with final Vercel URL if different)*
- **3-Click Golden Demo:** Open `/` → click **`▶ Watch the reveal`** → click **`Switch to Dana & submit the final review →`** → click **`⚡ Auto-fill demo ratings in 1 click`** → click **`Submit my sealed review`** → watch the sealed report unlock with exact golden math.

---

## Why FairReveal Exists

Group project peer evaluations break in four predictable ways:
1. **Early leaks & retaliation:** If scores are visible before everyone votes, teammates copy or retaliate.
2. **Self-rating inflation ("Bragging"):** A freerider who did zero work rates themselves `5/5` to pull up their average.
3. **Empty "Done" checkboxes:** Tasks get marked complete without any receipt or link attached.
4. **Drive-by 1-star ratings:** Low scores are given without any written justification.

FairReveal solves all four with an **18-rule deterministic protocol (`R1–R18`)**:
- **Upfront Handshake (`R1–R3`):** Every member (3–6 per team) must own at least one weighted deliverable (`1–3`) and sign the agreement before the project activates. Once all sign, commitments freeze.
- **Receipts Gate (`R4–R6`):** Only the task owner can log evidence (note ≥ 10 chars, optional `http(s)` link), and the API blocks marking any task fulfilled (`HTTP 400`) unless at least one evidence entry is attached.
- **Server-Enforced Ballot Seal (`R7–R11`):** While the review round is open (`phase = "reviewing"`), `GET /api/projects/[code]` strips all ratings, comments, and reports (`report: null`, `reviewDetail: null`) until `N of N` members have submitted. The final submission unlocks the report in the same transaction (`phase = "unlocked"`).
- **Bragging Filter & Bounded Multiplier (`R12–R15`):**
  - `CommitmentPct` (40% weight) = fulfilled weight ÷ owned weight × 100
  - `PeerPct` (60% weight) = `((effectivePeerMean - 1) / 4) * 100`, where a member's self-rating is capped at **`peerMeanWithoutSelf + 0.5`**
  - `Index` = `0.4 * CommitmentPct + 0.6 * PeerPct`
  - `Multiplier` = `clamp(round(Index / TeamMeanIndex, 2), 0.50, 1.10)`
  - Automatic flags: **`overclaim`** (`selfRating - peerMean ≥ 1.5`), **`disagreement`** (`maxPeer - minPeer ≥ 2`), and **`no-evidence`** (`0` evidence entries on a commitment).
- **Instructor Approval & Audit Trail (`R16–R18`):** Raw review rows (`reviewDetail`) are visible only to the instructor (`R16`). The instructor can approve suggested multipliers or override within `0.00–1.10` with a mandatory 10+ character reason (`R17`). Capability seat links (`/s/{128-bit token}`) provide passwordless role permissions (`R18`).

---

## Golden Example ("Demo Team — Product Launch")

Both our Vitest suite (`lib/rules.test.ts`, 13/13 tests) and the **`▶ Watch the reveal`** sandbox assert these exact worked values when Dana submits `[4, 5, 4, 5]`:

| Member | Role | Commitment % | Peer % (Self-Capped) | Contribution Index | Suggested Multiplier | Flags |
|---|---|---:|---:|---:|---:|---|
| **Amara** | Instructor | `100` | `86.7` | **`92`** | **`1.1`** | — |
| **Bayo** | Member | `75` | `73.8` | **`74.3`** | **`1.08`** | `disagreement` |
| **Chen** | Member | `100` | `91.1` | **`94.7`** | **`1.1`** | — |
| **Dana** | Member | `0` | `22.2` | **`13.3`** | **`0.5`** | `overclaim`, `no-evidence` (×2) |

- **Team Mean Index:** **`68.58`** (`data-testid="team-mean"`)

---

## Deterministic `data-testid` Selectors & TestSprite Suite Coverage

Every interactive sandbox (`Start from scratch`, `Evidence stage`, `▶ Watch the reveal`) creates an isolated project board so parallel or repeated TestSprite browser runs never collide and require **zero login walls**.

### Key DOM Selectors on `/p/[code]`
- `data-testid="phase"` → current phase (`setup` | `active` | `reviewing` | `unlocked` | `approved`)
- `data-testid="seal-banner"` → visible only during `reviewing` stage
- `data-testid="submitted-count"` → `"3 of 4 submitted"`
- `data-testid="team-mean"` → `"68.58"` (after reveal)
- `data-testid="commit-Amara"`, `data-testid="peer-Amara"`, `data-testid="index-Amara"`, `data-testid="mult-Amara"` (and `Bayo`, `Chen`, `Dana`)
- `data-testid="flag-Bayo-disagreement"`, `data-testid="flag-Dana-overclaim"`, `data-testid="flag-Dana-no-evidence"`

### Rules & Automated Test Matrix (`R1–R18`)

| ID | Rule | Verification Layer |
|---|---|---|
| **R1** | 3–6 members; every member must own ≥1 commitment before agreement | Vitest + TestSprite UI (`Start from scratch`) |
| **R2** | Commitment title 3–80 chars, integer weight 1–3, valid member owner | Vitest + TestSprite UI |
| **R3** | Project transitions `setup → active` only when all members agree; commitments then freeze | Vitest + TestSprite UI |
| **R4** | Only the commitment owner can log evidence (`403` for other seats) | API Contract + UI (`Evidence stage`) |
| **R5** | Evidence note ≥ 10 chars; optional URL must start with `http://` or `https://` | Vitest + TestSprite UI |
| **R6** | Fulfilment requires ≥ 1 evidence entry (`400` if zero evidence) | API Contract + TestSprite UI |
| **R7** | Only instructor can open the review round, and only from `active` phase | API Contract + TestSprite UI |
| **R8** | Reviewer must rate self + all teammates `1–5`; rating `≤ 2` requires comment ≥ 10 chars | Vitest + TestSprite UI |
| **R9** | Reviews are immutable once submitted (`400` on duplicate submission) | API Contract + TestSprite UI |
| **R10** | **The Seal:** UI and API return `report: null` and `reviewDetail: null` while `< N` submitted | Vitest + API Contract + TestSprite UI |
| **R11** | **The Reveal:** Final submission immediately transitions `reviewing → unlocked` with full report | Vitest + TestSprite UI (`Watch the reveal`) |
| **R12–R15** | Exact 40/60 formula, self-cap (`peerMean + 0.5`), multiplier clamp (`0.50–1.10`), and flags | Vitest (Golden 13/13) + TestSprite UI |
| **R16** | `reviewDetail` (who rated whom) is returned only to the instructor seat | Vitest + API Contract |
| **R17** | Instructor approval locks phase to `approved`; overrides require `0.00–1.10` + 10+ char reason | Vitest + TestSprite UI |
| **R18** | Missing or invalid `/s/{token}` or project access without seat returns `404` | API Contract + TestSprite UI |

---

## Tech Stack & Local Setup

- **Framework:** Next.js 16 (App Router, TypeScript) + React 19 + Tailwind CSS v4
- **Database:** Neon Serverless Postgres + Drizzle ORM (`db/schema.ts`, migration in `drizzle/0000_rare_weapon_omega.sql`), with automatic zero-config in-memory fallback when `DATABASE_URL` is omitted locally.
- **Testing:** Vitest (`lib/rules.test.ts` — 13 unit & workflow tests) + TestSprite 3.0 PR Auto-Test Suite.

```bash
npm install
npm test          # runs 13 Vitest unit + seal workflow tests
npm run check     # tsc --noEmit + vitest run
npm run build     # production Next.js build
npm run dev       # http://localhost:3000
```
