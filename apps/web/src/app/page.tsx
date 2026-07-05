import Link from "next/link";
import { sampleQuiz } from "@quiz/core";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Quiz Platform</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        A starting point for the quiz app. Try the sample quiz below to see the
        engine working end to end.
      </p>
      <Link
        href="/quiz"
        className="rounded-full bg-foreground px-6 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Take the &ldquo;{sampleQuiz.title}&rdquo; quiz
      </Link>
    </main>
  );
}
