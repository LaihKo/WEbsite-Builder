export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  points: number;
  /** Freeform lowercase labels, e.g. ["disney", "movies"] (no leading "#"). */
  tags: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export type PublicQuestion = Omit<Question, "correctOptionId">;

export interface PublicQuiz {
  id: string;
  title: string;
  description?: string;
  questions: PublicQuestion[];
}

export interface Answer {
  questionId: string;
  selectedOptionId: string;
}

export interface QuizResult {
  quizId: string;
  totalQuestions: number;
  correctCount: number;
  scorePoints: number;
  maxPoints: number;
  percentage: number;
  answers: Answer[];
}

export type QuizStatus = "in_progress" | "completed";

export interface QuizState {
  quizId: string;
  currentIndex: number;
  answers: Answer[];
  status: QuizStatus;
}
