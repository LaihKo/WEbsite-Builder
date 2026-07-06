import { prisma } from "./db";

export interface TiebreakerQuestionSummary {
  id: string;
  prompt: string;
  answer: number;
  createdAt: Date;
}

export async function listTiebreakerQuestions(): Promise<TiebreakerQuestionSummary[]> {
  return prisma.tiebreakerQuestion.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createTiebreakerQuestion(prompt: string, answer: number): Promise<TiebreakerQuestionSummary> {
  return prisma.tiebreakerQuestion.create({ data: { prompt, answer } });
}

export async function deleteTiebreakerQuestion(id: string): Promise<boolean> {
  try {
    await prisma.tiebreakerQuestion.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
