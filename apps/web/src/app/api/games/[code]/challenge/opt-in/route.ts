import { optIntoChallenge } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Spillet blev ikke fundet", status: 404 },
  not_in_game: { message: "Du er ikke med i dette spil", status: 403 },
  not_party_mode: { message: "Udfordringer er kun i partyversionen", status: 409 },
  not_round_summary: { message: "Spillet er ikke mellem runder", status: 409 },
  no_questions_available: { message: "Der er ikke flere spørgsmål til udfordringer", status: 409 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const playerId = (body as { playerId?: unknown } | null)?.playerId;
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId er påkrævet" }, { status: 400 });
  }

  const result = await optIntoChallenge(code.toUpperCase(), playerId);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
