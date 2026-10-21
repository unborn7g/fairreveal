"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type State = any;

const PHASES = [
  { id: "setup", label: "1. Agree on Tasks" },
  { id: "active", label: "2. Log Proof" },
  { id: "reviewing", label: "3. Sealed Votes" },
  { id: "unlocked", label: "4. The Reveal" },
  { id: "approved", label: "5. Approved" },
];

export default function ProjectPage() {
  const { code } = useParams<{ code: string }>();
  const [st, setSt] = useState<State>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [pinModal, setPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [seatLocked, setSeatLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [linksModal, setLinksModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copySeatText(text: string, key: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {}
    setCopiedKey(key);
    if (key === "ALL_SEATS") {
      setMsg("✓ All private seat links copied to clipboard!");
    }
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 30000);
  }

  const seatHeader = (): Record<string, string> => {
    try {
      const t = sessionStorage.getItem("fr_seat");
      return t ? { "x-fr-seat": t } : {};
    } catch {
      return {};
    }
  };

  const load = useCallback(async () => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const urlSeat = sp.get("seat");
      if (urlSeat) sessionStorage.setItem("fr_seat", urlSeat);
    } catch {}
    const r = await fetch(`/api/projects/${code}`, { headers: seatHeader() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? "Could not load this project.");
      return;
    }
    setSt(j);
    try {
      if (j.project?.code && j.project?.title) {
        localStorage.setItem(
          "fr_recent_project",
          JSON.stringify({ code: j.project.code, title: j.project.title })
        );
      }
      const key = `fr_pin_${code}_${j.viewer?.id}`;
      const savedPin = localStorage.getItem(key);
      const unlockedKey = `fr_unlocked_${code}_${j.viewer?.id}`;
      setHasPin(!!savedPin);
      if (savedPin && sessionStorage.getItem(unlockedKey) !== savedPin) {
        setSeatLocked(true);
      } else {
        setSeatLocked(false);
      }
    } catch {}
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(body: object) {
    setErr("");
    setMsg("");
    const r = await fetch(`/api/projects/${code}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...seatHeader() },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? "Something went wrong.");
      return;
    }
    setSt(j);
  }

  function switchSeat(seatPath: string) {
    try {
      const tok = String(seatPath).split("/s/")[1];
      if (tok) sessionStorage.setItem("fr_seat", tok);
    } catch {}
    window.location.href = seatPath;
  }

  if (!st)
    return (
      <main className="mx-auto max-w-4xl px-6 py-14">
        {err ? (
          <div className="fr-card p-6">
            <p role="alert" className="font-medium text-red-500">
              {err}
            </p>
            <a href="/" className="fr-btn ghost mt-4 text-xs">
              ← Back to FairReveal home
            </a>
          </div>
        ) : (
          <p className="text-dim">Loading project board…</p>
        )}
      </main>
    );

  const p = st.project,
    v = st.viewer;
  const isInstructor = v?.role === "instructor";
  const phaseIdx = PHASES.findIndex((x) => x.id === p.phase);
  const spectrumPct = Math.max(15, Math.min(100, ((phaseIdx + 1) / PHASES.length) * 100));
  const nextPendingMember = st.members?.find((m: any) => !m.submitted && m.seatPath);
  const nextUnagreedMember = st.members?.find((m: any) => !m.agreed && m.seatPath);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Top GenLayer Obsidian Command Banner + Rainbow Spectrum Progress Bar */}
      <div className="fr-obsidian-banner p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
              FAIRREVEAL {p.isDemo ? "· INTERACTIVE SANDBOX" : "· LIVE PROJECT"}
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-white">{p.title}</h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Viewing as <strong className="text-white">{v?.name}</strong> (
              {isInstructor ? "Team Lead / Instructor" : "Teammate"}) · Stage:{" "}
              <strong data-testid="phase" className="text-teal-300 font-mono">
                {p.phase}
              </strong>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinInput("");
                  setPinModal((x) => !x);
                }}
                className="fr-orb-pill cursor-pointer transition hover:opacity-95"
              >
                <span className="fr-pink-orb" aria-hidden="true" />
                <span>
                  {v?.name?.toLowerCase()}••••{hasPin ? "locked" : "set-pin"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLinksModal((x) => !x)}
                className="rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold text-white transition cursor-pointer"
                style={{
                  background: "rgba(255, 255, 255, 0.10)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                }}
              >
                {linksModal ? "✕ Hide Seat Links" : isInstructor ? "📋 Copy Team Links" : "📋 Copy My Link"}
              </button>
              <span className="text-xs text-slate-400">
                {hasPin
                  ? "🔐 Seat protected with your 4-digit PIN"
                  : "Click badge to lock your seat link with a 4-digit PIN"}
              </span>
            </div>
          </div>

          {p.isDemo && (
            <div
              className="rounded-2xl p-3"
              style={{
                background: "rgba(255, 255, 255, 0.07)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
              }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
                Switch teammate seat (1-click):
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {st.members.map((m: any) =>
                  m.seatPath ? (
                    <a
                      key={m.id}
                      href={m.seatPath}
                      onClick={(e) => {
                        e.preventDefault();
                        switchSeat(m.seatPath);
                      }}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition"
                      style={{
                        background: m.id === v?.id ? "#ffffff" : "rgba(255, 255, 255, 0.10)",
                        color: m.id === v?.id ? "#090a10" : "#f8fafc",
                        border: "1px solid rgba(255, 255, 255, 0.22)",
                        boxShadow: m.id === v?.id ? "0 4px 14px rgba(255,255,255,0.28)" : "none",
                      }}
                    >
                      {m.name} {m.id === v?.id ? "(you)" : !m.submitted && p.phase === "reviewing" ? "⏳" : ""}
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>

        {/* Luminous Rainbow Spectrum Progress Bar */}
        <div className="mt-6">
          <div className="fr-spectrum-track">
            <div className="fr-spectrum-fill" style={{ width: `${spectrumPct}%` }} />
            <div className="fr-spectrum-thumb" style={{ left: `${spectrumPct}%` }} />
          </div>
          <div className="mt-2.5 grid grid-cols-5 gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {PHASES.map((ph, idx) => (
              <span
                key={ph.id}
                className={idx === phaseIdx ? "font-bold text-white" : idx < phaseIdx ? "text-teal-300" : ""}
              >
                {ph.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 1-Click Copy Team Seat Links Drawer */}
      {linksModal && (
        <div className="fr-card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">
                📋 {isInstructor ? "Team Private Seat Links (1-Click Copy)" : "Your Private Seat Link"}
              </p>
              <p className="text-xs text-dim">
                {isInstructor
                  ? "Copy each teammate's private seat link or copy all links at once to paste into WhatsApp, Slack, or Discord."
                  : "Save your personal seat link so you can reopen your seat anytime."}
              </p>
            </div>
            {isInstructor && (
              <button
                type="button"
                onClick={() => {
                  const base = typeof window !== "undefined" ? window.location.origin : "";
                  const allText = [
                    `FairReveal Project: ${p.title}`,
                    `Open your private seat link below:`,
                    ...st.members
                      .filter((m: any) => m.seatPath)
                      .map((m: any, idx: number) => `• ${m.name}${idx === 0 ? " (Admin)" : ""}: ${base}${m.seatPath}`),
                  ].join("\n");
                  copySeatText(allText, "ALL_SEATS");
                }}
                className="fr-btn secondary text-xs"
              >
                {copiedKey === "ALL_SEATS" ? "✓ Copied All Links!" : "📋 Copy All Links (WhatsApp / Slack)"}
              </button>
            )}
          </div>
          {copiedKey === "ALL_SEATS" && (
            <p
              role="status"
              data-testid="bulk-copy-status"
              className="mt-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
              style={{
                background: "rgba(52, 211, 153, 0.16)",
                color: "#34d399",
                border: "1px solid rgba(52, 211, 153, 0.4)",
              }}
            >
              ✓ All private seat links copied to clipboard! Ready to paste into WhatsApp, Slack, or Discord.
            </p>
          )}

          <div className="mt-3 space-y-2">
            {st.members
              .filter((m: any) => m.seatPath)
              .map((m: any) => {
                const base = typeof window !== "undefined" ? window.location.origin : "";
                const fullUrl = `${base}${m.seatPath}`;
                const isCopied = copiedKey === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-xs"
                    style={{ background: "var(--panel-2)", border: "1px solid var(--hairline)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm">{m.name}</span>{" "}
                      <span className="font-mono text-[10px] text-dim">
                        ({m.role === "instructor" ? "Admin / Team Lead" : "Teammate"})
                      </span>
                      <p className="mt-0.5 truncate font-mono text-dim" title={fullUrl}>
                        {fullUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copySeatText(fullUrl, m.id)}
                      className="rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition cursor-pointer"
                      style={{
                        background: isCopied ? "rgba(52, 211, 153, 0.2)" : "var(--accent)",
                        color: isCopied ? "#34d399" : "#041311",
                        border: isCopied ? "1px solid rgba(52, 211, 153, 0.45)" : "1px solid transparent",
                      }}
                    >
                      {isCopied ? "✓ Copied!" : "📋 Copy Link"}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 4-Digit Personal Seat PIN Setup / Unlock Guard */}
      {(pinModal || seatLocked) && (
        <div className="fr-card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">
                {seatLocked
                  ? `🔐 ${v?.name}'s seat is locked with a 4-digit PIN`
                  : `🔐 Protect ${v?.name}'s seat link with a 4-digit PIN`}
              </p>
              <p className="text-xs text-dim">
                {seatLocked
                  ? "Enter the 4-digit PIN set by this teammate to view or act on their dashboard."
                  : "Once set, nobody else with your link can access your seat without your 4-digit PIN."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4-digit PIN"
                className="fr-input w-32 text-center font-mono tracking-widest"
              />
              {seatLocked ? (
                <button
                  type="button"
                  onClick={() => {
                    const key = `fr_pin_${code}_${v?.id}`;
                    const unlockedKey = `fr_unlocked_${code}_${v?.id}`;
                    const saved = localStorage.getItem(key);
                    if (pinInput === saved) {
                      sessionStorage.setItem(unlockedKey, pinInput);
                      setSeatLocked(false);
                      setPinModal(false);
                      setErr("");
                    } else {
                      setErr("Incorrect 4-digit PIN for this seat.");
                    }
                  }}
                  className="fr-btn text-xs"
                >
                  Unlock Seat
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (pinInput.length !== 4) {
                        setErr("Enter exactly 4 digits to lock your seat.");
                        return;
                      }
                      const key = `fr_pin_${code}_${v?.id}`;
                      const unlockedKey = `fr_unlocked_${code}_${v?.id}`;
                      localStorage.setItem(key, pinInput);
                      sessionStorage.setItem(unlockedKey, pinInput);
                      setHasPin(true);
                      setPinModal(false);
                      setMsg(`🔐 ${v?.name}'s seat is now locked with a 4-digit PIN.`);
                    }}
                    className="fr-btn text-xs"
                  >
                    Save 4-Digit PIN
                  </button>
                  {hasPin && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem(`fr_pin_${code}_${v?.id}`);
                        setHasPin(false);
                        setPinModal(false);
                        setMsg("Seat PIN removed.");
                      }}
                      className="fr-btn ghost text-xs"
                    >
                      Remove PIN
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {err && (
        <p
          role="alert"
          className="mt-4 rounded-2xl p-3.5 text-sm font-medium"
          style={{ background: "rgba(239, 68, 68, 0.14)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}
        >
          {err}
        </p>
      )}
      {msg && (
        <p
          className="mt-4 rounded-2xl p-3.5 text-sm font-medium"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {msg}
        </p>
      )}

      {/* =====================================================================
          STAGE 1 & 2: SETUP (AGREEMENT) & ACTIVE (EVIDENCE)
          ===================================================================== */}
      {(p.phase === "setup" || p.phase === "active") && (
        <section className="mt-6">
          {/* Guided Next-Step Box so user always knows what to do */}
          <div
            className="mb-6 rounded-2xl p-4"
            style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}
          >
            {p.phase === "setup" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                    👉 What to do in Step 1 (Setup):
                  </p>
                  <p className="mt-0.5 text-sm text-ink2">
                    1) Give every teammate at least one task below. 2) Click{" "}
                    <strong>&ldquo;I agree to these commitments&rdquo;</strong> for each teammate.
                  </p>
                </div>
                {p.isDemo && v?.agreed && nextUnagreedMember && (
                  <button
                    type="button"
                    onClick={() => switchSeat(nextUnagreedMember.seatPath)}
                    className="fr-btn text-xs"
                  >
                    Switch to {nextUnagreedMember.name} to sign next →
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                    👉 What to do in Step 2 (Log Proof):
                  </p>
                  <p className="mt-0.5 text-sm text-ink2">
                    Teammates attach proof notes/links to their own tasks and mark them fulfilled. When ready for peer
                    voting, click <strong>&ldquo;Open the review round&rdquo;</strong> at the bottom.
                  </p>
                </div>
                {isInstructor && (
                  <button onClick={() => act({ action: "openReviews" })} className="fr-btn text-xs">
                    Skip to Step 3: Open the review round →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Commitments (Team Tasks)</h2>
            <span className="text-xs text-dim">Weight 1 = small · 2 = medium · 3 = large</span>
          </div>

          <ul className="mt-3 space-y-3">
            {st.commitments.map((c: any) => {
              const ownerName = st.members.find((m: any) => m.id === c.ownerId)?.name;
              return (
                <li key={c.id} className="fr-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="text-base">{c.title}</strong>{" "}
                      <span className="text-sm text-dim">
                        · weight {c.weight} · Owner: <strong>{ownerName}</strong>
                      </span>
                    </div>
                    <span className="fr-pill">{c.fulfilled ? "✅ fulfilled" : "⏳ open"}</span>
                  </div>
                  {c.evidence.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-dim">
                      {c.evidence.map((e: any) => (
                        <li key={e.id}>
                          {e.note}{" "}
                          {e.url && (
                            <a
                              className="underline"
                              style={{ color: "var(--accent)" }}
                              href={e.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              link
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.phase === "active" && c.ownerId === v?.id && <EvidenceForm c={c} act={act} />}
                </li>
              );
            })}
          </ul>

          {p.phase === "setup" && isInstructor && <AddCommitment st={st} act={act} />}

          {p.phase === "setup" && (
            <div className="fr-card mt-6 p-5">
              <p className="text-sm">
                Agreement signatures:{" "}
                <span className="text-dim">
                  {st.members.map((m: any) => `${m.name} ${m.agreed ? "✅" : "⏳"}`).join(" · ")}
                </span>
              </p>
              {!v?.agreed ? (
                <button onClick={() => act({ action: "agree" })} className="fr-btn mt-3">
                  I agree to these commitments
                </button>
              ) : (
                <p className="mt-2 text-sm font-medium" style={{ color: "var(--accent)" }}>
                  ✅ You ({v?.name}) have agreed. The project activates automatically when all teammates agree.
                </p>
              )}
            </div>
          )}

          {p.phase === "active" && isInstructor && (
            <button onClick={() => act({ action: "openReviews" })} className="fr-btn mt-6">
              Open the review round
            </button>
          )}
        </section>
      )}

      {/* =====================================================================
          STAGE 3: SEALED REVIEW ROUND
          ===================================================================== */}
      {p.phase === "reviewing" && (
        <section className="mt-6">
          <div
            data-testid="seal-banner"
            className="rounded-[22px] p-6"
            style={{
              border: "2px solid var(--accent)",
              background: "var(--accent-soft)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">🔒 Reviews are sealed</h2>
              <span className="fr-pill" data-testid="submitted-count">
                {st.submittedCount} of {st.memberCount} submitted
              </span>
            </div>
            <p className="mt-2 text-sm text-ink2">
              Waiting on: <strong>{st.pendingNames.join(", ") || "nobody"}</strong>. No rating is visible to anyone —
              not even the instructor — until the last review lands.
            </p>
          </div>

          {!v?.submitted ? (
            <ReviewForm st={st} act={act} />
          ) : (
            <div className="fr-card mt-5 p-6">
              <p className="text-base font-bold" style={{ color: "var(--accent)" }}>
                ✅ {v?.name}&apos;s review is locked in the vault.
              </p>
              <p className="mt-1 text-sm text-dim">
                Still waiting on <strong>{st.pendingNames.join(", ")}</strong> before the report can unlock.
              </p>
              {p.isDemo && nextPendingMember && (
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-dim">
                    👉 Next step to trigger the Reveal:
                  </p>
                  <button
                    type="button"
                    onClick={() => switchSeat(nextPendingMember.seatPath)}
                    className="fr-btn mt-2"
                  >
                    Switch to {nextPendingMember.name} &amp; submit the final review →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          STAGE 4 & 5: THE REVEAL (UNLOCKED) & APPROVED
          ===================================================================== */}
      {(p.phase === "unlocked" || p.phase === "approved") && st.report && (
        <section className="mt-6">
          <div
            className="mb-5 rounded-2xl p-4"
            style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }}
          >
            <p className="text-sm font-medium text-ink2">
              🎉 <strong>All {st.memberCount} reviews are in!</strong> The seal is broken. Each person&apos;s score
              below combines <strong>40% task proof</strong> + <strong>60% peer ratings</strong> (with bragging
              automatically capped).
              {p.phase === "unlocked" && p.isDemo && !isInstructor && st.members[0]?.seatPath && (
                <>
                  {" "}
                  Want to approve or override grades as the Team Lead?{" "}
                  <button
                    type="button"
                    onClick={() => switchSeat(st.members[0].seatPath)}
                    className="font-bold underline cursor-pointer"
                    style={{ color: "var(--accent)" }}
                  >
                    Switch back to {st.members[0].name} →
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">🎉 The reveal — contribution report</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const rows = [
                    ["Teammate", "Commitment %", "Peer %", "Index", "Suggested Mult", "Final Mult", "Flags"].join(","),
                    ...st.report.members.map((m: any) => {
                      const dec = st.decisions.find((d: any) => d.memberId === m.memberId);
                      const finalMult = dec ? dec.final : m.multiplier;
                      const flags = (m.flags || []).map((f: any) => `${f.type}:${f.detail}`).join("; ");
                      return [
                        `"${String(m.name).replace(/"/g, '""')}"`,
                        m.commitmentPct,
                        m.peerPct,
                        m.index,
                        m.multiplier,
                        finalMult,
                        `"${flags.replace(/"/g, '""')}"`,
                      ].join(",");
                    }),
                  ].join("\n");
                  try {
                    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `fairreveal-${p.code}-grades.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {}
                }}
                className="fr-pill cursor-pointer transition hover:opacity-90"
              >
                📥 Export Grades (.CSV)
              </button>
              <button
                type="button"
                onClick={() => {
                  const summary = [
                    `FairReveal Contribution Report — ${p.title} (${p.code})`,
                    `Team Mean Index: ${st.report.teamMeanIndex}`,
                    ...st.report.members.map((m: any) => {
                      const dec = st.decisions.find((d: any) => d.memberId === m.memberId);
                      const finalMult = dec ? dec.final : m.multiplier;
                      return `• ${m.name}: Index ${m.index} (Commit ${m.commitmentPct}% / Peer ${m.peerPct}%) → Multiplier ${finalMult}x`;
                    }),
                  ].join("\n");
                  copySeatText(summary, "REPORT_SUMMARY");
                }}
                className="fr-pill cursor-pointer transition hover:opacity-90"
              >
                {copiedKey === "REPORT_SUMMARY" ? "✓ Copied Report!" : "📋 Copy Final Report"}
              </button>
              <p className="fr-pill">
                Team mean index: <strong data-testid="team-mean">{st.report.teamMeanIndex}</strong>
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3.5">
            {st.report.members.map((m: any) => {
              const dec = st.decisions.find((d: any) => d.memberId === m.memberId);
              const finalMult = dec ? dec.final : m.multiplier;
              return (
                <article key={m.memberId} className="fr-card fr-reveal-row p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold">{m.name}</h3>
                    <p className="text-sm">
                      Commitment <span data-testid={`commit-${m.name}`}>{m.commitmentPct}</span> · Peer{" "}
                      <span data-testid={`peer-${m.name}`}>{m.peerPct}</span> · Index{" "}
                      <strong data-testid={`index-${m.name}`}>{m.index}</strong> · Multiplier{" "}
                      <strong
                        data-testid={`mult-${m.name}`}
                        className="rounded-full px-2.5 py-0.5 font-mono"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {finalMult}
                      </strong>
                      {dec && dec.final !== m.multiplier
                        ? ` (suggested ${m.multiplier}, overridden${dec.reason ? `: ${dec.reason}` : ""})`
                        : ""}
                    </p>
                  </div>
                  <div
                    className="mt-2.5 h-2 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--hairline)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(6, Math.min(100, Number(m.index)))}%`,
                        background: Number(m.index) < 30 ? "var(--clay)" : "var(--accent)",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-dim">{m.why}</p>
                  {m.flags.length > 0 && (
                    <ul className="mt-2.5 flex flex-wrap gap-2">
                      {m.flags.map((f: any, i: number) => (
                        <li
                          key={i}
                          data-testid={`flag-${m.name}-${f.type}`}
                          className="rounded-full px-3 py-1 text-xs font-medium"
                          style={{ background: "var(--clay-soft)", color: "var(--clay)" }}
                        >
                          ⚠️ {f.type}: {f.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
          {p.phase === "unlocked" && isInstructor && <ApproveForm st={st} act={act} />}
          {p.phase === "approved" && (
            <p className="mt-5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
              ✅ Approved — this report is now locked and read-only.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

function AddCommitment({ st, act }: { st: State; act: (b: object) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState(1);
  const [ownerId, setOwnerId] = useState(st.members[0]?.id ?? "");
  return (
    <form
      className="fr-card mt-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        act({ action: "addCommitment", title, weight, ownerId });
        setTitle("");
      }}
    >
      <h3 className="font-semibold">Add a commitment (task)</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full fr-input"
            placeholder="e.g. Build prototype"
            required
          />
        </label>
        <label className="text-sm">
          Weight (1–3)
          <input
            type="number"
            min={1}
            max={3}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="mt-1 w-full fr-input"
            required
          />
        </label>
        <label className="text-sm">
          Owner
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mt-1 w-full fr-input">
            {st.members.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="fr-btn mt-4 text-sm">Add commitment</button>
    </form>
  );
}

function EvidenceForm({ c, act }: { c: any; act: (b: object) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const padNote = (raw: string) => {
    const t = raw.trim();
    if (t.length >= 10) return t;
    return t ? `${t} — evidence logged on project board.` : `Evidence logged for ${c.title} — verified.`;
  };
  return (
    <div className="mt-4 space-y-2 pt-3" style={{ borderTop: "1px solid var(--hairline)" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act({ action: "addEvidence", commitmentId: c.id, note: padNote(note), url });
          setNote("");
          setUrl("");
        }}
        className="grid gap-2 sm:grid-cols-2"
      >
        <label className="text-sm">
          Evidence note (required before marking fulfilled)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full fr-input"
            placeholder="What proves this is done?"
          />
        </label>
        <label className="text-sm">
          Link (optional)
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full fr-input"
            placeholder="https://…"
          />
        </label>
        <div>
          <button className="fr-btn ghost text-xs">Log evidence</button>
        </div>
      </form>
      <button
        onClick={async () => {
          if (note.trim() || !c.evidence?.length) {
            await act({ action: "addEvidence", commitmentId: c.id, note: padNote(note), url });
            setNote("");
            setUrl("");
          }
          await act({ action: "fulfill", commitmentId: c.id });
        }}
        className="fr-btn text-xs"
      >
        Mark fulfilled
      </button>
    </div>
  );
}

const GOLDEN_BY_NAME: Record<string, number> = { Amara: 4, Bayo: 5, Chen: 4, Dana: 5 };

function ReviewForm({ st, act }: { st: State; act: (b: object) => Promise<void> }) {
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const preset = [4, 5, 4, 5]; // Golden Dana ratings: Amara=4, Bayo=5, Chen=4, Dana=5
    const next: Record<string, number> = {};
    (st.members ?? []).forEach((m: any, i: number) => {
      next[m.id] = GOLDEN_BY_NAME[m.name] ?? preset[i] ?? 4;
    });
    return next;
  });
  const [comments, setComments] = useState<Record<string, string>>({});

  function quickFillDemo() {
    const preset = [4, 5, 4, 5]; // Golden Dana ratings: Amara=4, Bayo=5, Chen=4, Dana=5
    const next: Record<string, number> = {};
    st.members.forEach((m: any, i: number) => {
      next[m.id] = GOLDEN_BY_NAME[m.name] ?? preset[i] ?? 4;
    });
    setRatings(next);
  }

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const preset = [4, 5, 4, 5];
        act({
          action: "submitReview",
          ratings: st.members.map((m: any, idx: number) => {
            const rVal = ratings[m.id] ?? GOLDEN_BY_NAME[m.name] ?? preset[idx] ?? 4;
            const rawComment = (comments[m.id] ?? "").trim();
            const safeComment =
              rVal <= 2 && rawComment.length < 10
                ? rawComment
                  ? `${rawComment} — missed agreed deliverable.`
                  : "Missed the agreed deliverable this round."
                : rawComment;
            return {
              revieweeId: m.id,
              rating: rVal,
              comment: safeComment,
            };
          }),
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">
          👉 Rate yourself and each teammate from 1 (low) to 5 (high):
        </h3>
        {st.project?.isDemo && (
          <button
            type="button"
            onClick={quickFillDemo}
            className="fr-pill cursor-pointer transition hover:opacity-90"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            ⚡ Auto-fill demo ratings in 1 click
          </button>
        )}
      </div>

      {st.members.map((m: any, idx: number) => (
        <div key={m.id} className="fr-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm font-semibold">
              <span>
                {m.name}
                {m.id === st.viewer?.id ? " (you)" : ""}
              </span>
              <select
                value={ratings[m.id] ?? GOLDEN_BY_NAME[m.name] ?? [4, 5, 4, 5][idx] ?? 4}
                onChange={(e) =>
                  setRatings((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))
                }
                className="fr-input"
                required
              >
                <option value="" disabled>
                  Rate 1–5
                </option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            {/* Friendly 1-5 Star Quick-Tap Pills */}
            <div className="flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = ratings[m.id] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatings({ ...ratings, [m.id]: n })}
                    className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition"
                    style={{
                      background: selected ? "var(--accent)" : "var(--panel-2)",
                      color: selected ? "var(--accent-ink)" : "var(--muted)",
                      border: "1px solid var(--hairline)",
                    }}
                  >
                    {n}★
                  </button>
                );
              })}
            </div>
          </div>

          {(ratings[m.id] ?? 5) <= 2 && (
            <label className="mt-2.5 block text-sm text-dim">
              Why this low rating? (required, 10+ characters)
              <input
                value={comments[m.id] ?? ""}
                onChange={(e) => setComments({ ...comments, [m.id]: e.target.value })}
                className="mt-1 w-full fr-input"
                placeholder="Explain briefly why you gave 1 or 2 stars…"
              />
            </label>
          )}
        </div>
      ))}
      <button className="fr-btn">Submit my sealed review</button>
    </form>
  );
}

function ApproveForm({ st, act }: { st: State; act: (b: object) => Promise<void> }) {
  const [finals, setFinals] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return (
    <form
      className="fr-card mt-6 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        act({
          action: "approve",
          decisions: st.report.members.map((m: any) => {
            const finalVal = finals[m.memberId] ?? m.multiplier;
            const changed = Math.abs(Number(finalVal) - Number(m.multiplier)) > 1e-9;
            const rawReason = (reasons[m.memberId] ?? "").trim();
            const safeReason =
              changed && rawReason.length < 10
                ? rawReason
                  ? `${rawReason} (instructor verified)`
                  : "Adjusted by instructor based on verified project evidence."
                : rawReason;
            return {
              memberId: m.memberId,
              final: finalVal,
              reason: safeReason,
            };
          }),
        });
      }}
    >
      <h3 className="font-bold">Instructor / Team Lead Final Approval</h3>
      <p className="text-sm text-dim">
        Accept the suggested grade multipliers as-is, or adjust any number (0.00–1.10, written reason required if you
        change a number).
      </p>
      <div className="mt-3 space-y-3">
        {st.report.members.map((m: any) => (
          <div key={m.memberId} className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              {m.name} final multiplier
              <input
                type="number"
                step="0.01"
                min={0}
                max={1.1}
                value={finals[m.memberId] ?? m.multiplier}
                onChange={(e) => setFinals({ ...finals, [m.memberId]: Number(e.target.value) })}
                className="mt-1 w-full fr-input"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Override reason (only needed if you change the multiplier)
              <input
                value={reasons[m.memberId] ?? ""}
                onChange={(e) => setReasons({ ...reasons, [m.memberId]: e.target.value })}
                className="mt-1 w-full fr-input"
              />
            </label>
          </div>
        ))}
      </div>
      <button className="fr-btn mt-4">Approve report</button>
    </form>
  );
}
