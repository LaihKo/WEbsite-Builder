import { submitChallengeAnswer } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Spillet blev ikke fundet", status: 404 },
  not_in_game: { message: "Du er ikke med i dette spil", status: 403 },
  no_active_challenge: { message: "Du er ikke i gang med en udfordring", status: 409 },
  not_round_summary: { message: "Spillet er ikke mellem runder", status: 409 },
  not_current_question: { message: "Det er ikke det aktuelle spørgsmål i udfordringen længere", status: 409 },
  challenge_expired: { message: "Tiden løb ud på udfordringen", status: 409 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const { playerId, questionId, selectedOptionId } =
    (body as { playerId?: unknown; questionId?: unknown; selectedOptionId?: unknown } | null) ?? {};
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId er påkrævet" }, { status: 400 });
  }
  if (typeof questionId !== "string" || !questionId) {
    return Response.json({ error: "questionId er påkrævet" }, { status: 400 });
  }
  if (typeof selectedOptionId !== "string" || !selectedOptionId) {
    return Response.json({ error: "Valgt svarmulighed er påkrævet" }, { status: 400 });
  }

  const result = await submitChallengeAnswer(code.toUpperCase(), playerId, questionId, selectedOptionId);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
