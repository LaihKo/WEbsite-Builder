import { startVoting } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Spillet blev ikke fundet", status: 404 },
  not_in_game: { message: "Du er ikke med i dette spil", status: 403 },
  not_host: { message: "Kun værten (spiller 1) kan starte afstemningen", status: 403 },
  already_started: { message: "Afstemningen er allerede startet", status: 409 },
  no_categories_available: { message: "Der findes endnu ingen spørgsmålskategorier", status: 409 },
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

  const result = await startVoting(code.toUpperCase(), playerId);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
