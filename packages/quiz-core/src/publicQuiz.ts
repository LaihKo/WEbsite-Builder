import type { PublicQuiz, Quiz } from "./types";

export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map(({ correctOptionId: _correctOptionId, ...question }) => question),
  };
}
