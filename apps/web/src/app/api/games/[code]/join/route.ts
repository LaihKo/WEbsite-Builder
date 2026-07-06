import { joinGame } from "@/lib/games";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Game not found", status: 404 },
  already_started: { message: "This game has already started", status: 409 },
  full: { message: "This game already has 6 players", status: 409 },
  seat_conflict: { message: "Someone just took that spot — try again", status: 409 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (isRateLimited(`games-join:${getClientKey(request)}`, 20)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body as { name?: unknown } | null)?.name;
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const result = await joinGame(code.toUpperCase(), name.slice(0, 40));
  if (!result.ok) {
    const { message, status } = ERROR_MESSAGES[result.error];
    return Response.json({ error: message }, { status });
  }

  return Response.json({ playerId: result.playerId, seat: result.seat }, { status: 201 });
}
