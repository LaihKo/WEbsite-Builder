import type { QuizResult } from "@quiz/core";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export function recordAttempt(result: QuizResult, userId?: string | null) {
  const data: Prisma.QuizAttemptUncheckedCreateInput = {
    quizId: result.quizId,
    answers: result.answers as unknown as Prisma.InputJsonValue,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    scorePoints: result.scorePoints,
    maxPoints: result.maxPoints,
    percentage: result.percentage,
    userId: userId ?? null,
  };
  return prisma.quizAttempt.create({ data });
}

export function listRecentAttempts(quizId: string, limit = 10) {
  return prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
