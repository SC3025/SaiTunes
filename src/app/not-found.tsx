import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-3xl">Page not found</h1>
      <Link href="/" className="btn mt-6">All music</Link>
    </div>
  );
}
