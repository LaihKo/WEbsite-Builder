import { getQuizById, scoreQuiz, type Answer } from "@quiz/core";
import { auth } from "@/auth";
import { recordAttempt } from "@/lib/attempts";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";

function isValidAnswers(value: unknown, maxLength: number): value is Answer[] {
  return (
    Array.isArray(value) &&
    value.length <= maxLength &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).questionId === "string" &&
        typeof (item as Record<string, unknown>).selectedOptionId === "string",
    )
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  if (isRateLimited(`submit:${getClientKey(request)}`, 10)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { quizId } = await params;
  const quiz = getQuizById(quizId);

  if (!quiz) {
    return Response.json({ error: "Quiz not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const answers = (body as { answers?: unknown } | null)?.answers;
  if (!isValidAnswers(answers, quiz.questions.length)) {
    return Response.json(
      {
        error: `Body must be { answers: { questionId: string, selectedOptionId: string }[] } with at most ${quiz.questions.length} entries`,
      },
      { status: 400 },
    );
  }

  const session = await auth();
  const result = scoreQuiz(quiz, answers);
  const attempt = await recordAttempt(result, session?.user?.id);

  return Response.json({ ...result, attemptId: attempt.id, createdAt: attempt.createdAt });
}
