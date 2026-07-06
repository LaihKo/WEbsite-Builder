import { startVoting } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Game not found", status: 404 },
  not_in_game: { message: "You're not in this game", status: 403 },
  not_host: { message: "Only the host (Player 1) can start voting", status: 403 },
  already_started: { message: "Voting has already started", status: 409 },
  no_categories_available: { message: "No question categories exist yet", status: 409 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const playerId = (body as { playerId?: unknown } | null)?.playerId;
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId is required" }, { status: 400 });
  }

  const result = await startVoting(code.toUpperCase(), playerId);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
