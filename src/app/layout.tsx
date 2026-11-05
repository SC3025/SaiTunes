import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { PlayerProvider } from "@/components/Player";
import SearchBox from "@/components/SearchBox";

export const metadata: Metadata = {
  title: "Sai Tunes",
  description: "Listen to and download every song from our department, from the early 2000s to today.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <PlayerProvider>
          <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
              <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink">♪</span>
                Sai Tunes
              </Link>
              <div className="ml-auto w-full max-w-xs">
                <SearchBox />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 pb-32 pt-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-28 text-xs text-muted">
            <Link href="/admin" className="hover:text-ink">Admin</Link>
          </footer>
        </PlayerProvider>
      </body>
    </html>
  );
}
