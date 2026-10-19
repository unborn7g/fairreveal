# FairReveal — Sealed reviews. One fair reveal.

FairReveal turns a group agreement into an evidence-backed contribution record, then unlocks sealed peer reviews **only after everyone submits**. Nobody — not even the instructor — sees a single rating until the last review lands.

**Live app:** _deployed URL goes here_ · **Try the reveal:** open the live app → **▶ Watch the reveal** → submit Dana's review → the report unlocks.

## How it works
1. **Agree** — instructor creates a project (3–6 members), assigns commitments (owner + weight 1–3); everyone clicks "I agree"; commitments freeze.
2. **Evidence** — owners log evidence against commitments, then mark them fulfilled (≥1 evidence required).
3. **Review** — instructor opens the round; each member rates themself and every teammate (1–5; a comment is required for ratings ≤2).
4. **Sealed** — the app shows only "n of m submitted" and who is pending. No ratings, comments, or aggregates leak in the UI *or* the API.
5. **Report** — the final submission unlocks: commitment %, peer %, index, suggested multiplier (clamped 0.50–1.10), flags (overclaim / disagreement / no-evidence), and a plain-language "why" per person.
6. **Approve** — instructor accepts or overrides each multiplier (override needs a reason); the report becomes read-only.

Identity is by private **seat links** (`/s/{128-bit token}`) — no passwords, no signup, real role permissions.

## Rules & test coverage (R1–R18)
| ID | Rule | Covered by |
|---|---|---|
| R1 | 3–6 members; each owns ≥1 commitment before agreement | unit + UI suite |
| R2 | Commitment title 3–80 chars, weight 1–3, one owner | unit + UI suite |
| R3 | Active only when every member agreed; commitments then read-only | UI suite |
| R4 | Only the owner logs evidence (UI + API 403) | UI/API suite |
| R5 | Evidence note ≥10 chars; link must be http(s) | unit + UI suite |
| R6 | Fulfil requires ≥1 evidence entry | UI suite |
| R7 | Only instructor opens reviews, only from Active | UI suite |
| R8 | Ratings 1–5 for self + all teammates; comment required ≤2 | unit + UI suite |
| R9 | One submission per member, immutable | UI suite |
| R10 | **Seal:** nothing visible (UI + API) until all submitted | UI/API suite |
| R11 | **Unlock:** final submission reveals immediately | UI suite |
| R12–R14 | Commitment %, peer %, index, multiplier clamp 0.50–1.10 | unit (golden example) |
| R15 | Flags: overclaim ≥1.5 gap · disagreement range ≥2 · no-evidence | unit (golden example) |
| R16 | Members see aggregates only; who-rated-what is instructor-only | UI suite |
| R17 | Instructor approval; override 0.00–1.10 + reason; then read-only | unit + UI suite |
| R18 | Bad/wrong-project seat token → 404 | UI/API suite |

Golden-example unit tests (`lib/rules.test.ts`) assert the exact worked numbers: team mean index **68.58**, Amara **92.0 / 1.10**, Bayo **74.3 / 1.08** + disagreement, Chen **94.7 / 1.10**, Dana **13.3 / 0.50** + overclaim + no-evidence.

## The loop
_Links to the PRs where the TestSprite check ran — including the one where it caught a real failure that then went green — go here._

## Stack
Next.js (App Router, TypeScript) · Tailwind · Postgres (Neon) via Drizzle · Vitest · Vercel.

## Run locally
```bash
npm install
cp .env.example .env   # set DATABASE_URL (Neon)
npm run db:push        # create tables
npm run dev            # http://localhost:3000
npm run check          # typecheck + unit tests
```
