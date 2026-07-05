import { sampleQuiz } from "@quiz/core";
import { QuizPlayer } from "@/components/QuizPlayer";

export default function QuizPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <QuizPlayer quiz={sampleQuiz} />
    </main>
  );
}
