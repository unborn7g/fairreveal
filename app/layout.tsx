import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairReveal — Sealed reviews. One fair reveal.",
  description: "FairReveal turns a group agreement into an evidence-backed contribution record, then unlocks sealed peer reviews only after everyone submits.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
