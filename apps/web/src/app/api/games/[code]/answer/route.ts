import { submitAnswer } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Game not found", status: 404 },
  not_in_game: { message: "You're not in this game", status: 403 },
  not_playing: { message: "This game isn't in the playing phase", status: 409 },
  not_current_question: { message: "That isn't the current question anymore", status: 409 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { playerId, questionId, selectedOptionId } =
    (body as { playerId?: unknown; questionId?: unknown; selectedOptionId?: unknown } | null) ?? {};
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId is required" }, { status: 400 });
  }
  if (typeof questionId !== "string" || !questionId) {
    return Response.json({ error: "questionId is required" }, { status: 400 });
  }
  if (typeof selectedOptionId !== "string" || !selectedOptionId) {
    return Response.json({ error: "selectedOptionId is required" }, { status: 400 });
  }

  const result = await submitAnswer(code.toUpperCase(), playerId, questionId, selectedOptionId);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
