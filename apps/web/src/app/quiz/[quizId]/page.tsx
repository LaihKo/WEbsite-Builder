import { QuizPlayer } from "@/components/QuizPlayer";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <QuizPlayer quizId={quizId} />
    </main>
  );
}
