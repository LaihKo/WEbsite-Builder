import { createGame } from "@/lib/games";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (isRateLimited(`games-create:${getClientKey(request)}`, 10)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body as { name?: unknown } | null)?.name;
  const hostName = typeof name === "string" ? name.slice(0, 40) : "";

  const { code, playerId } = await createGame(hostName);
  return Response.json({ code, playerId, seat: 1 }, { status: 201 });
}
