import type { Answer, Quiz, QuizResult } from "./types";

export function scoreQuiz(quiz: Quiz, answers: Answer[]): QuizResult {
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

  let correctCount = 0;
  let scorePoints = 0;
  let maxPoints = 0;

  for (const question of quiz.questions) {
    maxPoints += question.points;
    const given = answerByQuestionId.get(question.id);
    if (given && given.selectedOptionId === question.correctOptionId) {
      correctCount += 1;
      scorePoints += question.points;
    }
  }

  const percentage = maxPoints === 0 ? 0 : Math.round((scorePoints / maxPoints) * 100);

  return {
    quizId: quiz.id,
    totalQuestions: quiz.questions.length,
    correctCount,
    scorePoints,
    maxPoints,
    percentage,
    answers,
  };
}
