import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/adminAuth";
import { listQuizzes } from "@/lib/quizzes";
import { listTiebreakerQuestions } from "@/lib/tiebreakers";
import { AdminQuizManager } from "@/components/AdminQuizManager";
import { AdminTiebreakerManager } from "@/components/AdminTiebreakerManager";

export default async function AdminPage() {
  if (!(await isAdminRequest())) {
    redirect("/admin/login");
  }

  const [quizzes, tiebreakers] = await Promise.all([listQuizzes(), listTiebreakerQuestions()]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <AdminQuizManager
        initialQuizzes={quizzes.map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questionCount: quiz.questionCount,
        }))}
      />
      <AdminTiebreakerManager initial={tiebreakers} />
    </main>
  );
}
