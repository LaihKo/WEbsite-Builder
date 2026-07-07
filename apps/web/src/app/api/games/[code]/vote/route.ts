import { castVote } from "@/lib/games";

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  not_found: { message: "Spillet blev ikke fundet", status: 404 },
  not_in_game: { message: "Du er ikke med i dette spil", status: 403 },
  not_voting: { message: "Spillet er ikke i afstemningsfasen", status: 409 },
  invalid_category: { message: "Den kategori er ikke et af valgene i dette spil", status: 400 },
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const { playerId, tag } = (body as { playerId?: unknown; tag?: unknown } | null) ?? {};
  if (typeof playerId !== "string" || !playerId) {
    return Response.json({ error: "playerId er påkrævet" }, { status: 400 });
  }
  if (typeof tag !== "string" || !tag) {
    return Response.json({ error: "Kategori er påkrævet" }, { status: 400 });
  }

  const result = await castVote(code.toUpperCase(), playerId, tag);
  if (!result.ok) {
    const mapped = ERROR_MESSAGES[result.error] ?? { message: result.error, status: 400 };
    return Response.json({ error: mapped.message }, { status: mapped.status });
  }
  return Response.json({ ok: true });
}
