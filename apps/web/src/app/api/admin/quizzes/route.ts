import { buildQuizFromRows } from "@quiz/core";
import { isAdminRequest } from "@/lib/adminAuth";
import { parseQuizWorkbook } from "@/lib/parseQuizWorkbook";
import { createQuiz } from "@/lib/quizAdmin";
import { listQuizzes } from "@/lib/quizzes";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Ikke logget ind" }, { status: 401 });
  }
  return Response.json(await listQuizzes());
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Ugyldige formulardata" }, { status: 400 });
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const folder = formData.get("folder");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Titel er påkrævet" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "En .xlsx-fil er påkrævet" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Filen er for stor (maks. 2 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows;
  try {
    rows = await parseQuizWorkbook(buffer);
  } catch {
    return Response.json(
      { error: "Kunne ikke læse den uploadede fil — er det en gyldig .xlsx?" },
      { status: 400 },
    );
  }

  const result = buildQuizFromRows({
    title,
    description: typeof description === "string" ? description : undefined,
    rows,
  });

  if (!result.quiz) {
    return Response.json({ error: "Validering mislykkedes", details: result.errors }, { status: 422 });
  }

  const quiz = await createQuiz(result.quiz, typeof folder === "string" && folder.trim() ? folder.trim() : null);
  return Response.json(
    { id: quiz.id, title: quiz.title, questionCount: quiz.questions.length },
    { status: 201 },
  );
}
