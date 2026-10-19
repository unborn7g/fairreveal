"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  async function demo(mode: string) {
    setBusy(mode); setErr("");
    const r = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) { setErr(j.error ?? "Could not start the demo. Is the database connected?"); return; }
    router.push(`/p/${j.code}`);
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">FairReveal</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight">Sealed reviews. One fair reveal.</h1>
      <p className="mt-4 text-lg text-neutral-600">
        FairReveal turns a group agreement into an evidence-backed contribution record — then unlocks sealed peer
        reviews only after <em>everyone</em> has submitted. Nobody sees a single rating until the last one lands.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <button onClick={() => demo("scratch")} disabled={!!busy} className="rounded-2xl border p-5 text-left shadow-sm hover:shadow disabled:opacity-50">
          <span className="font-semibold">Start from scratch</span>
          <p className="mt-1 text-sm text-neutral-500">A blank demo team in the setup stage.</p>
        </button>
        <button onClick={() => demo("evidence")} disabled={!!busy} className="rounded-2xl border p-5 text-left shadow-sm hover:shadow disabled:opacity-50">
          <span className="font-semibold">Evidence stage</span>
          <p className="mt-1 text-sm text-neutral-500">Agreement signed, evidence partly logged.</p>
        </button>
        <button onClick={() => demo("reveal")} disabled={!!busy} className="rounded-2xl bg-teal-700 p-5 text-left text-white shadow hover:bg-teal-800 disabled:opacity-50">
          <span className="font-semibold">▶ Watch the reveal</span>
          <p className="mt-1 text-sm text-teal-100">One review left. Submit it and the report unlocks.</p>
        </button>
      </div>
      {busy && <p className="mt-4 text-sm text-neutral-500">Preparing your demo…</p>}
      {err && <p role="alert" className="mt-4 text-sm text-red-600">{err}</p>}
      <p className="mt-10 text-sm text-neutral-500">
        Running a real project? <a className="font-semibold text-teal-700 underline" href="/new">Create a project →</a>
      </p>
    </main>
  );
}
