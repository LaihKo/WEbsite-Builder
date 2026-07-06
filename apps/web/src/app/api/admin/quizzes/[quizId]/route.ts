import { isAdminRequest } from "@/lib/adminAuth";
import { deleteQuiz } from "@/lib/quizAdmin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;
  const deleted = await deleteQuiz(quizId);
  if (!deleted) {
    return Response.json({ error: "Quiz not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
