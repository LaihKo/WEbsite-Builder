import { buildQuizFromRows } from "@quiz/core";
import { isAdminRequest } from "@/lib/adminAuth";
import { parseQuizWorkbook } from "@/lib/parseQuizWorkbook";
import { createQuiz } from "@/lib/quizAdmin";
import { listQuizzes } from "@/lib/quizzes";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function GET() {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await listQuizzes());
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const folder = formData.get("folder");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "An .xlsx file is required" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File is too large (max 2 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows;
  try {
    rows = await parseQuizWorkbook(buffer);
  } catch {
    return Response.json(
      { error: "Could not read the uploaded file — is it a valid .xlsx?" },
      { status: 400 },
    );
  }

  const result = buildQuizFromRows({
    title,
    description: typeof description === "string" ? description : undefined,
    rows,
  });

  if (!result.quiz) {
    return Response.json({ error: "Validation failed", details: result.errors }, { status: 422 });
  }

  const quiz = await createQuiz(result.quiz, typeof folder === "string" && folder.trim() ? folder.trim() : null);
  return Response.json(
    { id: quiz.id, title: quiz.title, questionCount: quiz.questions.length },
    { status: 201 },
  );
}
