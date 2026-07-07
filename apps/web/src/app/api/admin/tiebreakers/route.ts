import { isAdminRequest } from "@/lib/adminAuth";
import { createTiebreakerQuestion, listTiebreakerQuestions } from "@/lib/tiebreakers";

const MAX_PROMPT_LENGTH = 500;

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await listTiebreakerQuestions());
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, answer } = (body as { prompt?: unknown; answer?: unknown } | null) ?? {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return Response.json({ error: `Prompt is too long (max ${MAX_PROMPT_LENGTH} characters)` }, { status: 400 });
  }
  if (typeof answer !== "number" || !Number.isFinite(answer)) {
    return Response.json({ error: "Answer must be a number" }, { status: 400 });
  }

  const question = await createTiebreakerQuestion(prompt.trim(), answer);
  return Response.json(question, { status: 201 });
}
