import Link from "next/link";
import { listQuizzes } from "@/lib/quizzes";

export default async function Home() {
  const quizzes = await listQuizzes();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Quiz Platform</h1>
      {quizzes.length === 0 ? (
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          No quizzes have been published yet — check back soon.
        </p>
      ) : (
        <ul className="flex w-full max-w-md flex-col gap-3">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <Link
                href={`/quiz/${quiz.id}`}
                className="flex flex-col rounded-lg border border-black/[.08] px-5 py-3 text-left transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                <span className="font-medium">{quiz.title}</span>
                <span className="text-sm text-zinc-500">{quiz.questionCount} questions</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
