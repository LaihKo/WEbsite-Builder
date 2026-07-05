import type { Quiz } from "./types";
import { sampleQuiz } from "./sampleQuiz";

const quizzesById = new Map<string, Quiz>([[sampleQuiz.id, sampleQuiz]]);

export function getQuizById(id: string): Quiz | undefined {
  return quizzesById.get(id);
}

export function listQuizzes(): Quiz[] {
  return Array.from(quizzesById.values());
}
