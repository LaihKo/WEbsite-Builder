import type { QuizResult } from "@quiz/core";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export function recordAttempt(result: QuizResult) {
  return prisma.quizAttempt.create({
    data: {
      quizId: result.quizId,
      answers: result.answers as unknown as Prisma.InputJsonValue,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      scorePoints: result.scorePoints,
      maxPoints: result.maxPoints,
      percentage: result.percentage,
    },
  });
}

export function listRecentAttempts(quizId: string, limit = 10) {
  return prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
