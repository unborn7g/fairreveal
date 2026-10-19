"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type State = any;

export default function ProjectPage() {
  const { code } = useParams<{ code: string }>();
  const [st, setSt] = useState<State>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${code}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Could not load this project."); return; }
    setSt(j);
  }, [code]);
  useEffect(() => { load(); }, [load]);

  async function act(body: object) {
    setErr(""); setMsg("");
    const r = await fetch(`/api/projects/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Something went wrong."); return; }
    setSt(j);
  }

  if (!st) return <main className="mx-auto max-w-4xl px-6 py-14">{err ? <p role="alert" className="text-red-600">{err}</p> : "Loading…"}</main>;
  const p = st.project, v = st.viewer;
  const isInstructor = v?.role === "instructor";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">FairReveal {p.isDemo ? "· demo" : ""}</p>
      <h1 className="mt-1 text-3xl font-bold">{p.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        You are <strong>{v?.name}</strong> ({v?.role}) · Stage: <strong data-testid="phase">{p.phase}</strong>
      </p>
      {p.isDemo && isInstructor && (
        <p className="mt-2 text-sm">View as: {st.members.map((m: any) => m.seatPath ? <a key={m.id} className="mr-2 text-teal-700 underline" href={m.seatPath}>{m.name}</a> : null)}</p>
      )}
      {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {msg && <p className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{msg}</p>}

      {(p.phase === "setup" || p.phase === "active") && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Commitments</h2>
          <ul className="mt-3 space-y-3">
            {st.commitments.map((c: any) => (
              <li key={c.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <span><strong>{c.title}</strong> <span className="text-neutral-500">· weight {c.weight} · {st.members.find((m: any) => m.id === c.ownerId)?.name}</span></span>
                  <span>{c.fulfilled ? "✅ fulfilled" : "⏳ open"}</span>
                </div>
                {c.evidence.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600">
                    {c.evidence.map((e: any) => <li key={e.id}>{e.note} {e.url && <a className="text-teal-700 underline" href={e.url} target="_blank">link</a>}</li>)}
                  </ul>
                )}
                {p.phase === "active" && c.ownerId === v?.id && !c.fulfilled && <EvidenceForm c={c} act={act} />}
              </li>
            ))}
          </ul>
          {p.phase === "setup" && isInstructor && <AddCommitment st={st} act={act} />}
          {p.phase === "setup" && (
            <div className="mt-6 rounded-2xl border p-4">
              <p className="text-sm">Agreement: {st.members.map((m: any) => `${m.name} ${m.agreed ? "✅" : "…"}`).join(" · ")}</p>
              {!v?.agreed
                ? <button onClick={() => act({ action: "agree" })} className="mt-3 rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white">I agree to these commitments</button>
                : <p className="mt-2 text-sm text-teal-700">You have agreed. The project activates when everyone agrees.</p>}
            </div>
          )}
          {p.phase === "active" && isInstructor && (
            <button onClick={() => act({ action: "openReviews" })} className="mt-6 rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white">Open the review round</button>
          )}
        </section>
      )}

      {p.phase === "reviewing" && (
        <section className="mt-8">
          <div data-testid="seal-banner" className="rounded-2xl border-2 border-teal-700 bg-teal-50 p-5">
            <h2 className="text-xl font-semibold">🔒 Reviews are sealed</h2>
            <p className="mt-1 text-sm"><span data-testid="submitted-count">{st.submittedCount} of {st.memberCount} submitted</span>. Pending: {st.pendingNames.join(", ") || "nobody"}.
              No rating is visible to anyone — not even the instructor — until the last review lands.</p>
          </div>
          {!v?.submitted ? <ReviewForm st={st} act={act} /> : <p className="mt-4 text-sm text-teal-700">✅ Your review is in and sealed. Waiting for the rest of the team…</p>}
        </section>
      )}

      {(p.phase === "unlocked" || p.phase === "approved") && st.report && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">🎉 The reveal — contribution report</h2>
          <p className="text-sm text-neutral-500">Team mean index: <span data-testid="team-mean">{st.report.teamMeanIndex}</span></p>
          <div className="mt-4 space-y-3">
            {st.report.members.map((m: any) => {
              const dec = st.decisions.find((d: any) => d.memberId === m.memberId);
              return (
                <article key={m.memberId} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{m.name}</h3>
                    <p className="text-sm">Commitment <span data-testid={`commit-${m.name}`}>{m.commitmentPct}</span> · Peer <span data-testid={`peer-${m.name}`}>{m.peerPct}</span> · Index <strong data-testid={`index-${m.name}`}>{m.index}</strong> · Multiplier <strong data-testid={`mult-${m.name}`}>{dec ? dec.final : m.multiplier}</strong>{dec && dec.final !== m.multiplier ? ` (suggested ${m.multiplier}, overridden${dec.reason ? `: ${dec.reason}` : ""})` : ""}</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{m.why}</p>
                  {m.flags.length > 0 && <ul className="mt-2 space-y-1">{m.flags.map((f: any, i: number) => <li key={i} data-testid={`flag-${m.name}-${f.type}`} className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">⚠️ {f.type}: {f.detail}</li>)}</ul>}
                </article>
              );
            })}
          </div>
          {p.phase === "unlocked" && isInstructor && <ApproveForm st={st} act={act} />}
          {p.phase === "approved" && <p className="mt-4 text-sm font-medium text-teal-700">Approved — this report is now read-only.</p>}
        </section>
      )}
    </main>
  );
}

function AddCommitment({ st, act }: { st: State; act: (b: object) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [weight, setWeight] = useState(1); const [ownerId, setOwnerId] = useState(st.members[0]?.id ?? "");
  return (
    <form className="mt-4 rounded-2xl border p-4" onSubmit={(e) => { e.preventDefault(); act({ action: "addCommitment", title, weight, ownerId }); }}>
      <h3 className="font-semibold">Add a commitment</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-sm">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border p-2" required /></label>
        <label className="text-sm">Weight (1–3)<input type="number" min={1} max={3} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2" required /></label>
        <label className="text-sm">Owner<select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mt-1 w-full rounded-lg border p-2">{st.members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      </div>
      <button className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Add commitment</button>
    </form>
  );
}

function EvidenceForm({ c, act }: { c: any; act: (b: object) => Promise<void> }) {
  const [note, setNote] = useState(""); const [url, setUrl] = useState("");
  return (
    <div className="mt-3 space-y-2">
      <form onSubmit={(e) => { e.preventDefault(); act({ action: "addEvidence", commitmentId: c.id, note, url }); }} className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">Evidence note<input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="What proves this is done?" /></label>
        <label className="text-sm">Link (optional)<input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="https://…" /></label>
        <button className="rounded-lg border px-3 py-2 text-sm font-medium">Log evidence</button>
      </form>
      <button onClick={() => act({ action: "fulfill", commitmentId: c.id })} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">Mark fulfilled</button>
    </div>
  );
}

function ReviewForm({ st, act }: { st: State; act: (b: object) => Promise<void> }) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  return (
    <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); act({ action: "submitReview", ratings: st.members.map((m: any) => ({ revieweeId: m.id, rating: ratings[m.id] ?? 0, comment: comments[m.id] ?? "" })) }); }}>
      <h3 className="font-semibold">Your sealed review — rate yourself and every teammate (1–5)</h3>
      {st.members.map((m: any) => (
        <div key={m.id} className="rounded-2xl border p-3">
          <label className="text-sm font-medium">{m.name}{m.id === st.viewer?.id ? " (you)" : ""}
            <select value={ratings[m.id] ?? ""} onChange={(e) => setRatings({ ...ratings, [m.id]: Number(e.target.value) })} className="ml-2 rounded-lg border p-2" required>
              <option value="" disabled>Rate 1–5</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {(ratings[m.id] ?? 5) <= 2 && (
            <label className="mt-2 block text-sm">Why this low rating? (required, 10+ characters)
              <input value={comments[m.id] ?? ""} onChange={(e) => setComments({ ...comments, [m.id]: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
          )}
        </div>
      ))}
      <button className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">Submit my sealed review</button>
    </form>
  );
}

function ApproveForm({ st, act }: { st: State; act: (b: object) => Promise<void> }) {
  const [finals, setFinals] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return (
    <form className="mt-6 rounded-2xl border p-4" onSubmit={(e) => { e.preventDefault(); act({ action: "approve", decisions: st.report.members.map((m: any) => ({ memberId: m.memberId, final: finals[m.memberId] ?? m.multiplier, reason: reasons[m.memberId] ?? "" })) }); }}>
      <h3 className="font-semibold">Instructor approval</h3>
      <p className="text-sm text-neutral-500">Accept the suggested multipliers, or override (0.00–1.10, reason required).</p>
      <div className="mt-3 space-y-2">
        {st.report.members.map((m: any) => (
          <div key={m.memberId} className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm">{m.name} final multiplier<input type="number" step="0.01" min={0} max={1.1} value={finals[m.memberId] ?? m.multiplier} onChange={(e) => setFinals({ ...finals, [m.memberId]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2" /></label>
            <label className="text-sm sm:col-span-2">Override reason (if changed)<input value={reasons[m.memberId] ?? ""} onChange={(e) => setReasons({ ...reasons, [m.memberId]: e.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label>
          </div>
        ))}
      </div>
      <button className="mt-4 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">Approve report</button>
    </form>
  );
}
