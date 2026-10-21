import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairReveal — Sealed reviews. One fair reveal.",
  description:
    "FairReveal turns a group agreement into an evidence-backed contribution record, then unlocks sealed peer reviews only after everyone submits.",
};

const themeScript = `
(function(){
  try {
    var saved = localStorage.getItem('fr_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    document.addEventListener('click', function(e) {
      var btn = e.target && e.target.closest && e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('fr_theme', next); } catch(_) {}
    });
  } catch(_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {/* Bigger 64px Dashboard Header with iOS 26 Frosted Glass */}
        <header
          className="sticky top-0 z-50 flex h-16 items-center justify-between px-4 sm:px-6"
          style={{
            background: "var(--nav-bg)",
            backdropFilter: "blur(28px) saturate(195%)",
            WebkitBackdropFilter: "blur(28px) saturate(195%)",
            borderBottom: "1px solid var(--hairline)",
          }}
        >
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 14px -4px rgba(20,184,166,0.5)",
                }}
              >
                ⛨
              </span>
              <span>
                FairReveal<span style={{ color: "var(--clay)" }}>.</span>
              </span>
            </a>

            <div
              className="hidden md:flex items-center gap-2.5 pl-3 text-xs text-dim"
              style={{ borderLeft: "1px solid var(--hairline)" }}
            >
              <span
                className="inline-flex h-6 items-center gap-1.5 rounded-lg px-2.5 font-semibold"
                style={{ background: "rgba(139, 92, 246, 0.16)", color: "#a78bfa" }}
              >
                ⌂ Home
              </span>
              <span className="hidden lg:inline">Sealed Group Contribution Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Image-3 Exact Pink-Magenta Glowing Orb Pill */}
            <a
              href="/#pin-security"
              className="fr-orb-pill hidden sm:inline-flex transition hover:opacity-95"
              title="Every teammate seat link can be locked with a personal 4-digit PIN"
            >
              <span className="fr-pink-orb" aria-hidden="true" />
              <span>seat••••pin</span>
            </a>

            {/* Sun / Moon Sliding Knob Toggle (Dark Default) */}
            <button
              type="button"
              data-theme-toggle
              className="fr-theme-switch"
              aria-label="Toggle dark or light mode"
              title="Switch between Dark and Light mode"
            >
              <span className="fr-icon-sun" aria-hidden="true">☀️</span>
              <span className="fr-icon-moon" aria-hidden="true">🌙</span>
              <span className="fr-knob" aria-hidden="true" />
            </button>

            <a
              href="/new"
              className="fr-btn"
              style={{ padding: "9px 18px", fontSize: "0.86rem" }}
            >
              + Create Project
            </a>
          </div>
        </header>

        {/* Proper GenLayer-Style Dashboard Shell: Left Sidebar + Right Workspace */}
        <div className="flex flex-1">
          <aside
            className="hidden lg:flex w-56 shrink-0 flex-col justify-between p-4 text-xs"
            style={{
              background: "var(--shell-bg)",
              borderRight: "1px solid var(--hairline)",
            }}
          >
            <div className="space-y-6">
              {/* Group 1: Dashboard */}
              <div className="space-y-1">
                <a
                  href="/"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold transition"
                  style={{
                    background: "rgba(139, 92, 246, 0.14)",
                    color: "var(--foreground)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                  }}
                >
                  <span style={{ color: "#a78bfa" }}>❖</span>
                  <span>Dashboard Home</span>
                </a>
                <a
                  href="/#telemetry"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-dim transition hover:bg-white/5"
                >
                  <span>◎</span>
                  <span>Team Score Calculator</span>
                </a>
                <a
                  href="/#posters"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-dim transition hover:bg-white/5"
                >
                  <span>▣</span>
                  <span>4-Stage Visual Guide</span>
                </a>
                <a
                  href="/#sandboxes"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-dim transition hover:bg-white/5"
                >
                  <span>⚡</span>
                  <span>1-Click Live Demos</span>
                </a>
              </div>

              {/* Group 2: Project Stages */}
              <div>
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-dim">
                  How a Team Uses It
                </p>
                <div className="space-y-1">
                  <a
                    href="/#sandboxes"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-ink2 transition hover:bg-white/5"
                  >
                    <span className="font-mono text-[11px]" style={{ color: "#fb923c" }}>&gt;_</span>
                    <span>1 · Agree on Tasks</span>
                  </a>
                  <a
                    href="/#sandboxes"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-ink2 transition hover:bg-white/5"
                  >
                    <span style={{ color: "#38bdf8" }}>🛡</span>
                    <span>2 · Attach Proof</span>
                  </a>
                  <a
                    href="/#brag-filter"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-ink2 transition hover:bg-white/5"
                  >
                    <span style={{ color: "#a78bfa" }}>🔒</span>
                    <span>3 · Sealed Voting</span>
                  </a>
                  <a
                    href="/#sandboxes"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-semibold transition"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    <span>🎉</span>
                    <span>4 · Simultaneous Reveal</span>
                  </a>
                </div>
              </div>

              {/* Group 3: Security */}
              <div>
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-dim">
                  Seat Security
                </p>
                <div className="space-y-1">
                  <a
                    href="/#pin-security"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-ink2 transition hover:bg-white/5"
                  >
                    <span>🔐</span>
                    <span>4-Digit Seat PIN Lock</span>
                  </a>
                  <a
                    href="/new"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-ink2 transition hover:bg-white/5"
                  >
                    <span>＋</span>
                    <span>Start New Team Board</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
              <a
                href="/#posters"
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-dim transition hover:opacity-100"
              >
                <span>ⓘ</span>
                <span>How FairReveal works</span>
              </a>
            </div>
          </aside>

          {/* Main Dashboard Workspace */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
