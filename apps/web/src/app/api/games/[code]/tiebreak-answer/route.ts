import { submitTiebreakAnswer } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Spillet blev ikke fundet", status: 404 },
  not_in_game: { message: "Du er ikke med i dette spil", status: 403 },
  not_tiebreak: { message: "Spillet er ikke i en tiebreaker", status: 409 },
  not_a_tiebreak_participant: { message: "Du er ikke en af de spillere, der er lige om førstepladsen", status: 403 },
  already_answered: { message: "Du har allerede indsendt et gæt", status: 409 },
  invalid_guess: { message: "Gættet skal være et tal", status: 400 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const { playerId, guess } = (body as { playerId?: unknown; guess?: unknown } | null) ?? {};
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId er påkrævet" }, { status: 400 });
  }
  if (typeof guess !== "number" || !Number.isFinite(guess)) {
    return Response.json({ error: "gættet skal være et tal" }, { status: 400 });
  }

  const result = await submitTiebreakAnswer(code.toUpperCase(), playerId, guess);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
