import type { Quiz } from "@quiz/core";
import { prisma } from "./db";

export async function createQuiz(input: Omit<Quiz, "id">): Promise<Quiz> {
  const created = await prisma.quiz.create({
    data: {
      title: input.title,
      description: input.description,
      questions: {
        create: input.questions.map((question, index) => ({
          order: index,
          prompt: question.prompt,
          points: question.points,
          correctOptionId: question.correctOptionId,
          options: {
            create: question.options.map((option) => ({
              value: option.id,
              text: option.text,
            })),
          },
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    questions: created.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      points: question.points,
      correctOptionId: question.correctOptionId,
      options: question.options.map((option) => ({ id: option.value, text: option.text })),
    })),
  };
}

export async function deleteQuiz(id: string): Promise<boolean> {
  try {
    await prisma.quiz.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
