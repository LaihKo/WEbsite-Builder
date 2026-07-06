import { isAdminRequest } from "@/lib/adminAuth";
import { deleteTiebreakerQuestion } from "@/lib/tiebreakers";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteTiebreakerQuestion(id);
  if (!deleted) {
    return Response.json({ error: "Tiebreaker question not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
