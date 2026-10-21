"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLDEN_TEAM = [
  {
    name: "Amara",
    role: "Team Lead",
    commitPct: 100,
    peerPct: 86.7,
    index: 92.0,
    mult: 1.1,
    why: "Finished 3/3 task weight (100%) with proof attached. Peer mean 4.47/5 → 92.0 index → 1.10×.",
    flag: null,
  },
  {
    name: "Bayo",
    role: "Teammate",
    commitPct: 75,
    peerPct: 73.8,
    index: 74.3,
    mult: 1.08,
    why: "Finished 3/4 task weight (75%). Peer mean 3.95/5 (ratings ranged 3★–5★) → 74.3 index → 1.08×.",
    flag: "disagreement (3★–5★)",
  },
  {
    name: "Chen",
    role: "Teammate",
    commitPct: 100,
    peerPct: 91.1,
    index: 94.7,
    mult: 1.1,
    why: "Finished 5/5 task weight (100%) with proof attached. Peer mean 4.64/5 → 94.7 index → 1.10×.",
    flag: null,
  },
  {
    name: "Dana",
    role: "Teammate",
    commitPct: 0,
    peerPct: 22.2,
    index: 13.3,
    mult: 0.5,
    why: "Finished 0/4 task weight (0%). Rated self 5/5 (capped at 2.17 vs peer mean 1.67) → 13.3 index → 0.50×.",
    flag: "overclaim (+3.33) · no-evidence",
  },
];

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Dashboard hero banner toggle (75% sealed vs 100% unlocked preview)
  const [bannerUnlocked, setBannerUnlocked] = useState(false);
  const [baseGrade, setBaseGrade] = useState(80);
  const [danaSelf, setDanaSelf] = useState(5);
  const [recentProj, setRecentProj] = useState<{ code: string; title: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fr_recent_project");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.code) setRecentProj(parsed);
      }
    } catch {}
  }, []);

  const peerMean = 1.67;
  const effectiveSelf = Math.min(danaSelf, +(peerMean + 0.5).toFixed(2));
  const overclaimGap = +(danaSelf - peerMean).toFixed(2);
  const spectrumPct = bannerUnlocked ? 100 : 75;

  async function demo(mode: string) {
    setBusy(mode);
    setErr("");
    const r = await fetch("/api/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) {
      setErr(j.error ?? "Could not start the demo. Is the database connected?");
      return;
    }
    try {
      if (j.instructorToken) sessionStorage.setItem("fr_seat", j.instructorToken);
    } catch {}
    router.push(`/p/${j.code}`);
  }

  return (
    <main className="mx-auto max-w-[1220px] px-4 py-6 sm:px-6 space-y-6">
      {/* =====================================================================
          1. TOP DASHBOARD WELCOME STRIP — EXPLAINS WHAT IT IS IN 5 SECONDS
          ===================================================================== */}
      <div
        id="pin-security"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs"
        style={{
          background: "rgba(59, 130, 246, 0.10)",
          border: "1px solid rgba(59, 130, 246, 0.22)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: "rgba(59, 130, 246, 0.24)", color: "#60a5fa" }}
          >
            ⓘ
          </span>
          <div>
            <strong className="font-semibold" style={{ color: "var(--foreground)" }}>
              What is FairReveal?
            </strong>
            <span className="ml-2 text-dim">
              Fair grades for group projects: agree on tasks upfront, attach proof of work, and keep peer ratings sealed
              until everyone votes. Each teammate gets a private link they can lock with a <strong>4-digit PIN</strong>.
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {recentProj && (
            <a
              href={`/p/${recentProj.code}`}
              className="fr-orb-pill transition hover:opacity-95"
              title="Jump back into your most recent project board"
            >
              <span className="fr-pink-orb" aria-hidden="true" />
              <span>↗ Resume: {recentProj.title.slice(0, 18)}</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setBannerUnlocked((v) => !v)}
            className="fr-pill cursor-pointer"
          >
            {bannerUnlocked ? "🔒 Switch Banner to 75% Sealed" : "🔓 Preview 100% Reveal on Banner"}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. OBSIDIAN DASHBOARD HERO BANNER + RAINBOW SPECTRUM BAR (image-1.png)
          ===================================================================== */}
      <section className="fr-obsidian-banner p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* Left: Giant 75.0% / 100% Display Readout */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
              SEALED PEER REVIEW · LIVE TEAM DASHBOARD
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h1
                className="font-mono font-bold tracking-tight text-white"
                style={{ fontSize: "clamp(2.8rem, 5.4vw, 4.4rem)", lineHeight: 0.98 }}
              >
                {bannerUnlocked ? "100%" : "75.0%"}
              </h1>
              <span className="text-base sm:text-lg text-slate-300 font-normal">
                {bannerUnlocked
                  ? "of team reviews submitted — fair grades unlocked"
                  : "of the team review ballots sealed in the vault"}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              <strong className="text-white">Sealed reviews. One fair reveal.</strong>{" "}
              <span className="text-slate-400">
                Nobody sees a single rating until the last teammate submits.
              </span>
            </p>
          </div>

          {/* Right: 4 Teammate Ballot Status Boxes + White Liquid-Glass Pill CTA */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: "Amara", done: true },
                { name: "Bayo", done: true },
                { name: "Chen", done: true },
                { name: "Dana", done: bannerUnlocked },
              ].map((m) => (
                <div
                  key={m.name}
                  className="fr-digit-box px-3 py-2"
                  style={{
                    borderColor: m.done ? "rgba(52, 211, 153, 0.35)" : "rgba(251, 146, 60, 0.45)",
                    background: m.done ? "rgba(52, 211, 153, 0.08)" : "rgba(251, 146, 60, 0.10)",
                  }}
                >
                  <span className="text-sm font-bold text-white">{m.name}</span>
                  <span
                    className="mt-0.5 text-[10px] font-semibold"
                    style={{ color: m.done ? "#34d399" : "#fb923c" }}
                  >
                    {m.done ? "🔒 Voted" : "⏳ Left"}
                  </span>
                </div>
              ))}
            </div>

            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
              {bannerUnlocked
                ? "ALL 4 VOTES IN · SCORES UNLOCKED"
                : "3 VOTED · WAITING ON DANA TO UNLOCK"}
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => demo("reveal")}
                disabled={!!busy}
                className="fr-btn liquid-white"
              >
                <span>▶ Watch the reveal</span>
                <span>→</span>
              </button>
              <a
                href="/new"
                className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                style={{ border: "1px solid rgba(255,255,255,0.20)" }}
              >
                Create a project →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Luminous Rainbow Spectrum Bar */}
        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400 text-[11px]">
              {bannerUnlocked ? "VAULT UNLOCKED · ALL SCORES REVEALED" : "3 OF 4 VOTED · SCORES HIDDEN UNTIL 4/4"}
            </span>
            <div className="text-right">
              <span className="font-bold text-white">
                {bannerUnlocked ? "4 / 4 BALLOTS" : "3 / 4 BALLOTS"}
              </span>
              <span className="ml-2 text-[10px] text-slate-400">SUBMITTED / TEAM TOTAL</span>
            </div>
          </div>
          <div className="fr-spectrum-track">
            <div className="fr-spectrum-fill" style={{ width: `${spectrumPct}%` }} />
            <div className="fr-spectrum-thumb" style={{ left: `${spectrumPct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400">
            <span>1 · AGREE ON TASKS</span>
            <span>2 · ATTACH PROOF</span>
            <span>3 · SEALED VOTING</span>
            <span className="text-white font-semibold">4 · THE REVEAL</span>
          </div>
        </div>
      </section>

      {busy && <p className="text-sm font-medium text-dim">Opening your interactive demo board…</p>}
      {err && (
        <p role="alert" className="text-sm font-medium text-red-500">
          {err}
        </p>
      )}

      {/* =====================================================================
          3. MIDDLE 12-COLUMN DASHBOARD SPLIT: 2×2 BENTO (LEFT) + BRAG LAB (RIGHT)
          ===================================================================== */}
      <section id="telemetry" className="grid gap-5 lg:grid-cols-12">
        {/* Left 7 Columns: 2x2 Color-Wash Bento + Live Grade Calculator */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div className="fr-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">How FairReveal protects your team</h2>
                <p className="text-xs text-dim">
                  Task proof, sealed voting, personal PIN-locked links, and fair grade multipliers
                </p>
              </div>
              <span className="fr-orb-pill">
                <span className="fr-pink-orb" aria-hidden="true" />
                <span>PIN-Lock Ready</span>
              </span>
            </div>

            {/* 2x2 Pastel & Holographic Glass Bento Cells */}
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <div className="fr-card fr-wash-amber flex items-center gap-3.5 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #fb923c, #ea580c)",
                    boxShadow: "0 6px 16px -4px rgba(234, 88, 12, 0.45)",
                  }}
                >
                  &gt;_
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">4 Seat Links</p>
                  <p className="text-xs text-dim">Private link + 4-digit PIN lock</p>
                </div>
              </div>

              <div className="fr-card fr-wash-blue flex items-center gap-3.5 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #60a5fa, #2563eb)",
                    boxShadow: "0 6px 16px -4px rgba(37, 99, 235, 0.45)",
                  }}
                >
                  🛡
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">40% + 60%</p>
                  <p className="text-xs text-dim">Task Receipts + Peer Ratings</p>
                </div>
              </div>

              <div className="fr-card fr-wash-violet flex items-center gap-3.5 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    boxShadow: "0 6px 16px -4px rgba(124, 58, 237, 0.45)",
                  }}
                >
                  ❖
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">0.50× – 1.10×</p>
                  <p className="text-xs text-dim">Fair Grade Multiplier Range</p>
                </div>
              </div>

              <div className="fr-card fr-wash-holo flex items-center gap-3.5 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #14b8a6, #0f172a)",
                    boxShadow: "0 6px 16px -4px rgba(20, 184, 166, 0.45)",
                  }}
                >
                  🔒
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">0 Early Leaks</p>
                  <p className="text-xs text-dim">Nobody sees scores until N of N</p>
                </div>
              </div>
            </div>

            {/* Golden Team Live Grade Calculator Sub-Band */}
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--hairline)" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">Example Team Grade Calculator</h3>
                  <p className="text-xs text-dim">
                    Drag the group score to see what each teammate receives after the reveal
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-dim">
                    Group Score: <strong style={{ color: "var(--foreground)" }}>{baseGrade}%</strong>
                  </span>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={baseGrade}
                    onChange={(e) => setBaseGrade(Number(e.target.value))}
                    className="w-24 accent-teal-500 cursor-pointer"
                    aria-label="Group project score"
                  />
                </div>
              </div>

              <div className="mt-3.5 grid gap-2.5 sm:grid-cols-4">
                {GOLDEN_TEAM.map((m) => {
                  const finalGrade = Math.min(100, +(baseGrade * m.mult).toFixed(1));
                  const isLow = m.index < 30;
                  return (
                    <div
                      key={m.name}
                      className="rounded-2xl p-3.5"
                      style={{
                        background: "var(--panel-2)",
                        border: isLow
                          ? "1px solid color-mix(in srgb, var(--clay) 50%, transparent)"
                          : "1px solid var(--hairline)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold">{m.name}</strong>
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                          style={{
                            background: isLow ? "var(--clay-soft)" : "var(--accent-soft)",
                            color: isLow ? "var(--clay)" : "var(--accent)",
                          }}
                        >
                          {m.mult.toFixed(2)}×
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-xl font-bold">{finalGrade}%</p>
                      <p className="text-[11px] text-dim">Score {m.index.toFixed(1)}/100</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Dark Neon Wave Card — Bragging Filter Simulator */}
        <div id="brag-filter" className="lg:col-span-5">
          <div className="fr-card h-full p-5 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Bragging Filter</h2>
              <span className="fr-pill">Auto Self-Cap</span>
            </div>

            <div
              className="mt-3 relative overflow-hidden rounded-2xl p-5 text-white"
              style={{
                background:
                  "radial-gradient(380px 220px at 85% 35%, rgba(139, 92, 246, 0.38), transparent 70%), radial-gradient(320px 200px at 20% 80%, rgba(20, 184, 166, 0.28), transparent 70%), linear-gradient(145deg, #090b12 0%, #121526 100%)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {/* Neon Wave SVG */}
              <svg
                className="pointer-events-none absolute right-0 top-2 h-44 w-56 opacity-50"
                viewBox="0 0 240 160"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 80 C 50 20, 90 140, 130 80 C 170 20, 210 140, 235 80"
                  stroke="url(#wave1)"
                  strokeWidth="3"
                />
                <path
                  d="M10 80 C 50 140, 90 20, 130 80 C 170 140, 210 20, 235 80"
                  stroke="url(#wave2)"
                  strokeWidth="3"
                />
                <defs>
                  <linearGradient id="wave1" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="0.5" stopColor="#a855f7" />
                    <stop offset="1" stopColor="#14b8a6" />
                  </linearGradient>
                  <linearGradient id="wave2" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f472b6" />
                    <stop offset="0.5" stopColor="#6366f1" />
                    <stop offset="1" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>

              <p className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-indigo-300">
                ANTI-CHEATING // SELF-RATING CAP
              </p>
              <h3 className="relative mt-1.5 text-2xl sm:text-3xl font-bold leading-tight">
                Stop 5/5
                <br />
                Self-Bragging
              </h3>
              <p className="relative mt-2 max-w-xs text-xs text-slate-300 leading-relaxed">
                What if Dana did zero work and rates herself <strong>5 / 5</strong>? FairReveal caps anyone&apos;s
                self-rating at <strong>0.5★ above their teammates&apos; average</strong>:
              </p>

              <div
                className="relative mt-4 rounded-xl p-3.5"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span>
                    Dana claims: <strong>{danaSelf.toFixed(1)} ★</strong> (Peers gave 1.67 ★)
                  </span>
                  {overclaimGap >= 1.5 ? (
                    <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      ⚠️ Flagged +{overclaimGap}★
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      ✓ Honest
                    </span>
                  )}
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={danaSelf}
                  onChange={(e) => setDanaSelf(Number(e.target.value))}
                  className="mt-2.5 w-full accent-teal-400 cursor-pointer"
                  aria-label="Dana self rating slider"
                />
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-300">
                  <span>Claimed: {danaSelf.toFixed(1)}★</span>
                  <span className="text-teal-300 font-bold">
                    Counted: {effectiveSelf.toFixed(2)}★ max
                  </span>
                </div>
              </div>

              <div className="relative mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-300">
                <span>● 4-DIGIT PIN</span>
                <span>● PROOF REQUIRED</span>
                <span>● SELF-CAP</span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-mono uppercase text-dim">HOW SEAT SECURITY WORKS</p>
              <p className="mt-0.5 text-sm font-bold">Private Link + Personal 4-Digit PIN</p>
              <p className="text-xs text-dim">
                When a teammate opens their link, they can set a 4-digit PIN so nobody else with the link can access
                their seat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. TALL EDITORIAL STAGE POSTERS (image-2.png style, FairReveal voice)
          ===================================================================== */}
      <section id="posters" className="pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">How a group project flows from start to reveal</h2>
          <a href="#sandboxes" className="text-xs font-medium text-dim hover:underline">
            Try any stage ›
          </a>
        </div>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Poster 1 */}
          <button
            type="button"
            onClick={() => demo("scratch")}
            disabled={!!busy}
            className="fr-poster text-left cursor-pointer"
            style={{
              background:
                "repeating-linear-gradient(115deg, rgba(139, 92, 246, 0.24) 0px, rgba(139, 92, 246, 0.24) 12px, rgba(30, 27, 75, 0.92) 12px, rgba(30, 27, 75, 0.92) 28px), linear-gradient(160deg, #2e1065 0%, #090a10 100%)",
            }}
          >
            <div className="flex justify-end">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs backdrop-blur-md">
                ↗
              </span>
            </div>
            <div>
              <p className="text-2xl font-black italic tracking-tight uppercase leading-none">
                STEP 1:
                <br />
                AGREE ON TASKS
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-violet-200">
                WEIGHTED 1–3 POINTS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold">
                1
              </span>
              <span className="text-xs font-semibold">Setup Board</span>
            </div>
          </button>

          {/* Poster 2 */}
          <button
            type="button"
            onClick={() => demo("evidence")}
            disabled={!!busy}
            className="fr-poster text-left cursor-pointer"
            style={{
              background:
                "radial-gradient(240px 180px at 80% 25%, rgba(225, 29, 72, 0.28), transparent 70%), linear-gradient(160deg, #141418 0%, #070709 100%)",
            }}
          >
            <div className="flex justify-end">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs backdrop-blur-md">
                ↗
              </span>
            </div>
            <div>
              <p className="text-xl font-normal text-slate-300">
                No receipt,
                <br />
                <strong className="text-white font-semibold">no &ldquo;Done&rdquo; button…</strong>
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Teammates must paste a proof note or link before marking any task finished.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold">
                2
              </span>
              <span className="text-xs font-semibold">Evidence Stage</span>
            </div>
          </button>

          {/* Poster 3 */}
          <button
            type="button"
            onClick={() => demo("reveal")}
            disabled={!!busy}
            className="fr-poster text-left cursor-pointer"
            style={{
              background:
                "radial-gradient(240px 200px at 80% 80%, rgba(185, 28, 28, 0.65), transparent 70%), linear-gradient(155deg, #cbd5e1 0%, #475569 52%, #1e1b24 100%)",
            }}
          >
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-900 bg-white/75 px-2 py-0.5 rounded">
                STEP 3 · SEALED
              </span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-black/25 text-xs backdrop-blur-md">
                ↗
              </span>
            </div>
            <div>
              <p className="font-mono text-xs text-white/90">3 OF 4 IN · 1 PENDING</p>
              <p className="mt-1 text-xl font-bold leading-tight text-white">
                Nobody can peek until the last vote lands.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold">
                3
              </span>
              <span className="text-xs font-semibold">Locked Ballot Vault</span>
            </div>
          </button>

          {/* Poster 4 */}
          <a
            href="#brag-filter"
            className="fr-poster text-left"
            style={{
              background:
                "radial-gradient(220px 220px at 85% 20%, rgba(16, 185, 129, 0.30), transparent 70%), radial-gradient(200px 180px at 70% 85%, rgba(245, 158, 11, 0.25), transparent 70%), #08090c",
            }}
          >
            <div className="flex justify-end">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs backdrop-blur-md">
                ↗
              </span>
            </div>
            <div>
              <span className="inline-block h-0.5 w-6 bg-emerald-400 mb-3" />
              <p className="font-serif text-xl leading-snug text-slate-100">
                Everyone&apos;s a 5/5
                <br />
                until receipts
                <br />
                are checked.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lime-400 text-black text-[11px] font-bold">
                ⚖️
              </span>
              <span className="text-xs font-semibold">Bragging Filter</span>
            </div>
          </a>

          {/* Poster 5 */}
          <div
            className="fr-poster text-left"
            style={{
              background:
                "radial-gradient(260px 220px at 80% 75%, rgba(16, 185, 129, 0.32), transparent 70%), linear-gradient(165deg, #050807 0%, #071712 100%)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-400">
                ✦ STEP 4 · REVEAL
              </span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs backdrop-blur-md">
                ↗
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight">
                One <em className="font-serif font-normal text-emerald-400">fair reveal</em> for the whole team.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Submit Dana&apos;s final vote and watch all 4 scores unlock at once.
              </p>
              <button
                type="button"
                onClick={() => demo("reveal")}
                disabled={!!busy}
                className="fr-btn mt-4 w-full text-xs"
              >
                ▶ Try 10-Sec Reveal
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Instant Demo</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. BOTTOM 3-CARD ACTION ROW (EXACT TESTSPRITE ENTRY BUTTONS)
          ===================================================================== */}
      <section id="sandboxes" className="pt-6 pb-8">
        <h2 className="text-center text-2xl sm:text-3xl font-bold">Try a live demo or start your own team</h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-dim">
          Pick any stage below to open an interactive board — no signup required
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => demo("scratch")}
            disabled={!!busy}
            className="fr-card fr-card-interactive fr-wash-amber p-6 text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold text-orange-400"
                style={{ background: "rgba(251, 146, 60, 0.18)" }}
              >
                &gt;_
              </span>
              <span className="text-lg font-bold">Start from scratch</span>
            </div>
            <p className="mt-3 text-sm text-dim">
              A blank demo team in the setup stage. Add tasks (weight 1–3) and collect team signatures.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Open Setup Board →
            </span>
          </button>

          <button
            onClick={() => demo("evidence")}
            disabled={!!busy}
            className="fr-card fr-card-interactive fr-wash-blue p-6 text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-sky-400"
                style={{ background: "rgba(56, 189, 248, 0.18)" }}
              >
                🛡
              </span>
              <span className="text-lg font-bold">Evidence stage</span>
            </div>
            <p className="mt-3 text-sm text-dim">
              Agreement signed, evidence partly logged. Attach proof links, mark tasks fulfilled, and open reviews.
            </p>
            <span className="mt-4 inline-block text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Open Evidence Board →
            </span>
          </button>

          <button
            onClick={() => demo("reveal")}
            disabled={!!busy}
            className="fr-card fr-card-interactive fr-wash-holo p-6 text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                ▶
              </span>
              <span className="text-lg font-bold">▶ Watch the reveal</span>
            </div>
            <p className="mt-3 text-sm text-dim">
              One review left. Switch to Dana, submit the final review in 1 click, and watch the sealed report unlock!
            </p>
            <span className="mt-4 inline-block text-xs font-bold underline" style={{ color: "var(--accent)" }}>
              Launch 1-Click Reveal →
            </span>
          </button>
        </div>

        <p className="mt-8 text-center font-mono text-[11px] text-dim">
          FairReveal Protocol R10–R16 · API withholds <code>report: null</code> until <code>N/N</code> ballots seal ·{" "}
          <code>R13</code> caps self-rating at <code>peerMean + 0.50</code> · <code>R16</code> scopes raw ballot rows to
          Instructor only.
        </p>
      </section>
    </main>
  );
}
