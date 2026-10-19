"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProject() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [names, setNames] = useState("Amara\nBayo\nChen\nDana");
  const [err, setErr] = useState("");
  const [seats, setSeats] = useState<{ name: string; path: string }[] | null>(null);
  const [pcode, setPcode] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const memberNames = names.split("\n").map((x) => x.trim()).filter(Boolean);
    const r = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, memberNames }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Could not create the project."); return; }
    setSeats(j.seats); setPcode(j.code);
  }
  if (seats) return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-bold">Your project is ready</h1>
      <p className="mt-2 text-neutral-600">Send each person their private seat link. Whoever opens a link sits in that seat — no passwords.</p>
      <ul className="mt-6 space-y-2">
        {seats.map((x) => (
          <li key={x.path} className="rounded-xl border p-3 text-sm"><strong>{x.name}</strong> — <span className="break-all text-teal-700">{x.path}</span></li>
        ))}
      </ul>
      <button onClick={() => router.push(`/p/${pcode}`)} className="mt-6 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">Open the project →</button>
    </main>
  );
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-bold">Create a project</h1>
      <form onSubmit={create} className="mt-6 space-y-5">
        <div>
          <label htmlFor="title" className="font-medium">Project title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full rounded-xl border p-3" placeholder="e.g. Final-year project — Team 7" />
        </div>
        <div>
          <label htmlFor="members" className="font-medium">Members (one per line, 3–6 — first name is the instructor)</label>
          <textarea id="members" value={names} onChange={(e) => setNames(e.target.value)} rows={6} className="mt-1 w-full rounded-xl border p-3" />
        </div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">Create project</button>
      </form>
    </main>
  );
}
