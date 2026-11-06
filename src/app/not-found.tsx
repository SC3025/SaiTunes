import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="font-display text-6xl italic text-gold">❦</div>
      <h1 className="mt-4 font-display text-3xl">This page isn&apos;t in the book</h1>
      <p className="mt-2 italic text-muted">It may have been moved or removed.</p>
      <Link href="/" className="btn mt-6">Back to the contents</Link>
    </div>
  );
}
