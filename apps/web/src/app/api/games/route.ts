import { createGame, type GameMode } from "@/lib/games";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (isRateLimited(`games-create:${getClientKey(request)}`, 10)) {
    return Response.json({ error: "For mange anmodninger" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const { name, mode } = (body as { name?: unknown; mode?: unknown } | null) ?? {};
  const hostName = typeof name === "string" ? name.slice(0, 40) : "";
  const gameMode: GameMode = mode === "party" ? "party" : "regular";

  const { code, playerId } = await createGame(hostName, gameMode);
  return Response.json({ code, playerId, seat: 1 }, { status: 201 });
}
