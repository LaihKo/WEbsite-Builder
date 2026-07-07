import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Quiz Platform</h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          1-6 spillere, hver på sin egen enhed. Stem om en kategori, og kæmp jer derefter igennem
          de samme spørgsmål sammen.
        </p>
      </div>
      <Link
        href="/party"
        className="rounded-full bg-foreground px-8 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Spil
      </Link>
      <Link href="/quiz/test-example" className="text-sm text-zinc-500 hover:underline">
        Prøv et testeksempel først
      </Link>
    </main>
  );
}
