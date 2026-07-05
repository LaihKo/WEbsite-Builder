import type { Quiz, QuizResult, QuizState } from "./types";
import { scoreQuiz } from "./scoring";

interface NavigableQuiz {
  id: string;
  questions: { id: string }[];
}

export function createQuizState<T extends NavigableQuiz>(quiz: T): QuizState {
  if (quiz.questions.length === 0) {
    throw new Error(`Quiz "${quiz.id}" has no questions`);
  }
  return {
    quizId: quiz.id,
    currentIndex: 0,
    answers: [],
    status: "in_progress",
  };
}

export function getCurrentQuestion<T extends NavigableQuiz>(
  state: QuizState,
  quiz: T,
): T["questions"][number] | null {
  return quiz.questions[state.currentIndex] ?? null;
}

export function answerCurrentQuestion<T extends NavigableQuiz>(
  state: QuizState,
  quiz: T,
  selectedOptionId: string,
): QuizState {
  if (state.status === "completed") {
    throw new Error("Cannot answer a question after the quiz is completed");
  }

  const question = getCurrentQuestion(state, quiz);
  if (!question) {
    throw new Error("No current question to answer");
  }

  const answers = state.answers.filter((a) => a.questionId !== question.id);
  answers.push({ questionId: question.id, selectedOptionId });

  return { ...state, answers };
}

export function advance<T extends NavigableQuiz>(state: QuizState, quiz: T): QuizState {
  const nextIndex = state.currentIndex + 1;
  const isLast = nextIndex >= quiz.questions.length;

  return {
    ...state,
    currentIndex: isLast ? state.currentIndex : nextIndex,
    status: isLast ? "completed" : "in_progress",
  };
}

export function getResult(state: QuizState, quiz: Quiz): QuizResult {
  if (state.status !== "completed") {
    throw new Error("Cannot get a result before the quiz is completed");
  }
  return scoreQuiz(quiz, state.answers);
}
