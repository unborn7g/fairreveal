"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch {}
}

export default function NewProject() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [names, setNames] = useState("Amara\nBayo\nChen\nDana");
  const [err, setErr] = useState("");
  const [seats, setSeats] = useState<{ name: string; path: string }[] | null>(null);
  const [pcode, setPcode] = useState("");
  const [origin, setOrigin] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  function markCopied(key: string) {
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const memberNames = names
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, memberNames }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error ?? "Could not create the project.");
      return;
    }
    setSeats(j.seats);
    setPcode(j.code);
    try {
      const firstTok = j.seats?.[0]?.path?.split("/s/")?.[1];
      if (firstTok) sessionStorage.setItem("fr_seat", firstTok);
      if (j.code) {
        localStorage.setItem("fr_recent_project", JSON.stringify({ code: j.code, title }));
      }
    } catch {}
  }

  if (seats) {
    const base = origin || "";
    const allFormatted = [
      `FairReveal Project: ${title || "Team Board"}`,
      `Open your personal seat link below (you can lock your seat with a 4-digit PIN inside):`,
      ...seats.map(
        (x, i) => `• ${x.name}${i === 0 ? " (Admin / Team Lead)" : ""}: ${base}${x.path}`
      ),
    ].join("\n");

    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="fr-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="fr-pill">Seats generated · 128-bit capability links</span>
            <button
              type="button"
              onClick={() => {
                copyText(allFormatted);
                markCopied("ALL");
              }}
              className="fr-btn secondary text-xs"
            >
              {copiedKey === "ALL"
                ? "✓ Copied All Links!"
                : "📋 Copy All Links (WhatsApp / Slack)"}
            </button>
          </div>

          <h1 className="mt-3 text-3xl font-bold">Your project is ready</h1>
          <p className="mt-2 text-dim">
            Click <strong>Copy Link</strong> next to each person to send them their private seat link, or copy all links at once.
          </p>

          <ul className="mt-6 space-y-3">
            {seats.map((x, idx) => {
              const fullUrl = `${base}${x.path}`;
              const isCopied = copiedKey === x.path;
              return (
                <li
                  key={x.path}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm"
                  style={{ background: "var(--panel-2)", border: "1px solid var(--hairline)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base">{x.name}</strong>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase"
                        style={{
                          background: idx === 0 ? "rgba(45, 212, 191, 0.14)" : "var(--bg-wash-2)",
                          color: idx === 0 ? "var(--accent)" : "var(--ink-2)",
                          border: "1px solid var(--hairline)",
                        }}
                      >
                        {idx === 0 ? "👑 Admin / Team Lead (You)" : "Teammate"}
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate font-mono text-xs"
                      style={{ color: "var(--ink-3)" }}
                      title={fullUrl}
                    >
                      {fullUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        copyText(fullUrl);
                        markCopied(x.path);
                      }}
                      className="rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold transition cursor-pointer"
                      style={{
                        background: isCopied
                          ? "rgba(52, 211, 153, 0.2)"
                          : "var(--accent)",
                        color: isCopied ? "#34d399" : "#041311",
                        border: isCopied
                          ? "1px solid rgba(52, 211, 153, 0.45)"
                          : "1px solid transparent",
                      }}
                    >
                      {isCopied ? "✓ Copied!" : "📋 Copy Link"}
                    </button>
                    <a
                      href={x.path}
                      className="rounded-full px-3 py-1.5 font-mono text-xs transition"
                      style={{
                        background: "var(--bg-wash-2)",
                        color: "var(--ink-2)",
                        border: "1px solid var(--hairline)",
                      }}
                    >
                      Open ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => router.push(`/p/${pcode}`)} className="fr-btn">
              Open the project →
            </button>
            <button
              type="button"
              onClick={() => {
                copyText(allFormatted);
                markCopied("ALL");
              }}
              className="fr-btn ghost text-xs"
            >
              {copiedKey === "ALL" ? "✓ All 4 Links Copied!" : "📋 Copy All for Group Chat"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="fr-card p-6 sm:p-8">
        <span className="fr-pill">New Team Board</span>
        <h1 className="mt-3 text-3xl font-bold">Create a project</h1>
        <p className="mt-1 text-sm text-dim">
          Define your project and 3–6 team seats. The first name becomes the instructor/lead.
        </p>
        <form onSubmit={create} className="mt-6 space-y-5">
          <div>
            <label htmlFor="title" className="text-sm font-medium">
              Project title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1.5 w-full fr-input"
              placeholder="e.g. Final-year project — Team 7"
            />
          </div>
          <div>
            <label htmlFor="members" className="text-sm font-medium">
              Members (one per line, 3–6 — first name is the instructor)
            </label>
            <textarea
              id="members"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              rows={6}
              className="mt-1.5 w-full fr-input"
            />
          </div>
          {err && (
            <p role="alert" className="text-sm text-red-500">
              {err}
            </p>
          )}
          <button className="fr-btn">Create project</button>
        </form>
      </div>
    </main>
  );
}
