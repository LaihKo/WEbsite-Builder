import { listRecentAttempts } from "@/lib/attempts";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";
import { getQuizById } from "@/lib/quizzes";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  if (isRateLimited(`attempts:${getClientKey(request)}`, 30)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { quizId } = await params;
  const quiz = await getQuizById(quizId);

  if (!quiz) {
    return Response.json({ error: "Quiz not found" }, { status: 404 });
  }

  return Response.json(await listRecentAttempts(quizId));
}
