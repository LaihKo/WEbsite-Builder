import { castVote } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Game not found", status: 404 },
  not_in_game: { message: "You're not in this game", status: 403 },
  not_voting: { message: "This game isn't in the voting phase", status: 409 },
  invalid_category: { message: "That category isn't one of the choices for this game", status: 400 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { playerId, tag } = (body as { playerId?: unknown; tag?: unknown } | null) ?? {};
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId is required" }, { status: 400 });
  }
  if (typeof tag !== "string" || !tag) {
    return Response.json({ error: "tag is required" }, { status: 400 });
  }

  const result = await castVote(code.toUpperCase(), playerId, tag);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
