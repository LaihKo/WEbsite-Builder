import { joinGame } from "@/lib/games";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Spillet blev ikke fundet", status: 404 },
  already_started: { message: "Spillet er allerede startet", status: 409 },
  full: { message: "Spillet har allerede 6 spillere", status: 409 },
  seat_conflict: { message: "Der var lige en anden, der tog den plads — prøv igen", status: 409 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (isRateLimited(`games-join:${getClientKey(request)}`, 20)) {
    return Response.json({ error: "For mange anmodninger" }, { status: 429 });
  }

  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const name = (body as { name?: unknown } | null)?.name;
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Navn er påkrævet" }, { status: 400 });
  }

  const result = await joinGame(code.toUpperCase(), name.slice(0, 40));
  if (!result.ok) {
    const { message, status } = ERROR_MESSAGES[result.error];
    return Response.json({ error: message }, { status });
  }

  return Response.json({ playerId: result.playerId, seat: result.seat }, { status: 201 });
}
