import { getQuizById } from "@quiz/core";
import { listRecentAttempts } from "@/lib/attempts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  const quiz = getQuizById(quizId);

  if (!quiz) {
    return Response.json({ error: "Quiz not found" }, { status: 404 });
  }

  return Response.json(await listRecentAttempts(quizId));
}
