import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Newsreader } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/components/Player";
import SearchBox from "@/components/SearchBox";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"], style: ["normal", "italic"] });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Sai Tunes",
  description: "Listen to and download the department's music.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable}`}>
      <body className="antialiased min-h-screen">
        <PlayerProvider>
          <header className="mx-auto max-w-5xl px-4 pt-6">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b-[3px] border-double border-line pb-4">
              <Link href="/" className="group">
                <div className="font-display text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
                  Sai <span className="italic text-accent">Tunes</span>
                </div>
              </Link>
              <div className="ml-auto w-full sm:w-64">
                <SearchBox />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 pb-36 pt-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-32">
            <div className="flex justify-end border-t border-line pt-3 text-sm text-muted">
              <Link href="/admin" className="smallcaps hover:text-ink">Admin</Link>
            </div>
          </footer>
        </PlayerProvider>
      </body>
    </html>
  );
}
