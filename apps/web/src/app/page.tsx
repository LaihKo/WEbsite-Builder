import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Quiz Platform</h1>
        <p className="max-w-md text-muted">
          1-6 spillere, hver på sin egen enhed. Stem om en kategori, og kæmp jer derefter igennem
          de samme spørgsmål sammen.
        </p>
      </div>
      <Link
        href="/party"
        className="rounded-2xl bg-accent px-8 py-4 font-display text-lg font-bold text-accent-foreground shadow-[0_14px_30px_-12px_var(--accent)] transition hover:brightness-110"
      >
        Spil
      </Link>
      <Link href="/quiz/test-example" className="text-sm text-accent hover:underline">
        Prøv et testeksempel først
      </Link>
    </main>
  );
}
