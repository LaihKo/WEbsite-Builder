import { submitTiebreakAnswer } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Game not found", status: 404 },
  not_in_game: { message: "You're not in this game", status: 403 },
  not_tiebreak: { message: "This game isn't in a tiebreak", status: 409 },
  not_a_tiebreak_participant: { message: "You're not one of the tied players", status: 403 },
  already_answered: { message: "You already submitted a guess", status: 409 },
  invalid_guess: { message: "Guess must be a number", status: 400 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { playerId, guess } = (body as { playerId?: unknown; guess?: unknown } | null) ?? {};
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId is required" }, { status: 400 });
  }
  if (typeof guess !== "number" || !Number.isFinite(guess)) {
    return Response.json({ error: "guess must be a number" }, { status: 400 });
  }

  const result = await submitTiebreakAnswer(code.toUpperCase(), playerId, guess);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
