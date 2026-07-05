import { QuizPlayer } from "@/components/QuizPlayer";

const QUIZ_ID = "geography-basics";

export default function QuizPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <QuizPlayer quizId={QUIZ_ID} />
    </main>
  );
}
