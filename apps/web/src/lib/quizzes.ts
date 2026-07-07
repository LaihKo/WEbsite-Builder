import type { Quiz } from "@quiz/core";
import { prisma } from "./db";

export interface QuizSummary {
  id: string;
  title: string;
  description?: string;
  folder: string | null;
  questionCount: number;
  createdAt: Date;
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { options: true } } },
  });
  if (!quiz) return null;

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? undefined,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      points: question.points,
      correctOptionId: question.correctOptionId,
      tags: question.tags,
      options: question.options
        .slice()
        .sort((a, b) => a.value.localeCompare(b.value))
        .map((option) => ({ id: option.value, text: option.text })),
    })),
  };
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? undefined,
    folder: quiz.folder,
    questionCount: quiz._count.questions,
    createdAt: quiz.createdAt,
  }));
}
