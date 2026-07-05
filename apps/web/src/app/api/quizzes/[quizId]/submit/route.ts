import { getQuizById, scoreQuiz, type Answer } from "@quiz/core";

function isValidAnswers(value: unknown): value is Answer[] {
  return (
    Array.isArray(value) &&
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
  if (!isValidAnswers(answers)) {
    return Response.json(
      { error: "Body must be { answers: { questionId: string, selectedOptionId: string }[] }" },
      { status: 400 },
    );
  }

  return Response.json(scoreQuiz(quiz, answers));
}
