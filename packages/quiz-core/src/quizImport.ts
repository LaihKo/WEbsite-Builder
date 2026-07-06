import type { Question, Quiz } from "./types";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
const OPTION_VALUES = ["a", "b", "c", "d"] as const;

export interface QuestionRow {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  points?: number;
  /** Raw cell value, e.g. "disney, movies" or "#disney #movies". */
  tags?: string;
}

/** Splits a raw tags cell on commas/whitespace, strips "#", lowercases, dedupes. */
export function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,\s]+/)) {
    const tag = part.trim().replace(/^#+/, "").toLowerCase();
    if (tag) seen.add(tag);
  }
  return Array.from(seen);
}

export interface QuizImportInput {
  title: string;
  description?: string;
  rows: QuestionRow[];
}

export interface QuizImportError {
  /** 1-based row number within the question rows, or 0 for a quiz-level error. */
  row: number;
  message: string;
}

export type QuizImportResult =
  | { quiz: Omit<Quiz, "id">; errors: [] }
  | { quiz?: undefined; errors: QuizImportError[] };

export function buildQuizFromRows(input: QuizImportInput): QuizImportResult {
  const errors: QuizImportError[] = [];

  if (!input.title.trim()) {
    errors.push({ row: 0, message: "Quiz title is required" });
  }
  if (input.rows.length === 0) {
    errors.push({ row: 0, message: "At least one question row is required" });
  }

  const questions: Question[] = [];

  input.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const options = [row.optionA, row.optionB, row.optionC, row.optionD];

    if (!row.prompt?.trim()) {
      errors.push({ row: rowNumber, message: "Question text is empty" });
      return;
    }
    if (options.some((option) => !option?.trim())) {
      errors.push({ row: rowNumber, message: "All four options (A-D) must be filled in" });
      return;
    }

    const correctLetter = row.correctAnswer?.trim().toUpperCase();
    const letterIndex = OPTION_LETTERS.indexOf(correctLetter as (typeof OPTION_LETTERS)[number]);
    if (letterIndex === -1) {
      errors.push({
        row: rowNumber,
        message: `Correct answer must be one of A, B, C, D (got "${row.correctAnswer ?? ""}")`,
      });
      return;
    }

    const points = row.points && row.points > 0 ? Math.round(row.points) : 1;

    questions.push({
      id: `q${rowNumber}`,
      prompt: row.prompt.trim(),
      options: options.map((text, i) => ({ id: OPTION_VALUES[i], text: text.trim() })),
      correctOptionId: OPTION_VALUES[letterIndex],
      points,
      tags: parseTags(row.tags),
    });
  });

  if (errors.length > 0) {
    return { errors };
  }

  return {
    quiz: {
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      questions,
    },
    errors: [],
  };
}
