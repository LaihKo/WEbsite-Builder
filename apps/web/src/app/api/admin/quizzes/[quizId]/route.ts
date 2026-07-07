import { isAdminRequest } from "@/lib/adminAuth";
import { deleteQuiz, moveQuizToFolder } from "@/lib/quizAdmin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const { quizId } = await params;
  const deleted = await deleteQuiz(quizId);
  if (!deleted) {
    return Response.json({ error: "Quizzen blev ikke fundet" }, { status: 404 });
  }
  return Response.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON-body" }, { status: 400 });
  }

  const folder = (body as { folder?: unknown } | null)?.folder;
  if (folder !== null && typeof folder !== "string") {
    return Response.json({ error: "mappe skal være en tekststreng eller null" }, { status: 400 });
  }

  const { quizId } = await params;
  const moved = await moveQuizToFolder(quizId, folder?.trim() || null);
  if (!moved) {
    return Response.json({ error: "Quizzen blev ikke fundet" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
