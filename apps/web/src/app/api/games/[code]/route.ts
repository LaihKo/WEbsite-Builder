import { getGameState } from "@/lib/games";
import { isRateLimited } from "@/lib/rateLimit";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Keyed by game code, not client IP: up to 6 players on the same wifi/NAT
  // all poll this endpoint, so an IP-keyed limit would rate-limit the whole
  // room instead of guarding against abuse of one specific game.
  if (isRateLimited(`games-poll:${code.toUpperCase()}`, 600)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const playerId = new URL(request.url).searchParams.get("playerId") ?? undefined;

  const state = await getGameState(code.toUpperCase(), playerId);
  if (!state) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  return Response.json(state);
}
