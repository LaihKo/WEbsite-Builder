import { toPublicQuiz } from "@quiz/core";
import { getQuizById } from "@/lib/quizzes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const quiz = await getQuizById(quizId);

  if (!quiz) {
    return Response.json({ error: "Quiz not found" }, { status: 404 });
  }

  return Response.json(toPublicQuiz(quiz));
}
