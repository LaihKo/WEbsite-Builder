import { describe, expect, it } from "vitest";
import { buildQuizFromRows, parseTags, type QuestionRow } from "../quizImport";

function validRow(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    prompt: "What is the capital of France?",
    optionA: "Paris",
    optionB: "Berlin",
    optionC: "Madrid",
    optionD: "Rome",
    correctAnswer: "A",
    ...overrides,
  };
}

describe("buildQuizFromRows", () => {
  it("builds a quiz from valid rows", () => {
    const result = buildQuizFromRows({
      title: "Geography",
      description: "A quiz",
      rows: [validRow(), validRow({ prompt: "2nd question", correctAnswer: "c" })],
    });

    expect(result.errors).toEqual([]);
    expect(result.quiz?.title).toBe("Geography");
    expect(result.quiz?.questions).toHaveLength(2);
    expect(result.quiz?.questions[0]).toEqual({
      id: "q1",
      prompt: "What is the capital of France?",
      options: [
        { id: "a", text: "Paris" },
        { id: "b", text: "Berlin" },
        { id: "c", text: "Madrid" },
        { id: "d", text: "Rome" },
      ],
      correctOptionId: "a",
      points: 1,
      tags: [],
    });
    // lowercase correct-answer letters are accepted
    expect(result.quiz?.questions[1].correctOptionId).toBe("c");
  });

  it("parses a tags cell into lowercase, deduped, hash-stripped tags", () => {
    const result = buildQuizFromRows({
      title: "Q",
      rows: [validRow({ tags: "#Disney, Movies #movies" })],
    });
    expect(result.quiz?.questions[0].tags).toEqual(["disney", "movies"]);
  });

  it("defaults to no tags when the cell is blank", () => {
    const result = buildQuizFromRows({ title: "Q", rows: [validRow()] });
    expect(result.quiz?.questions[0].tags).toEqual([]);
  });

  it("defaults points to 1 and rounds fractional points", () => {
    const result = buildQuizFromRows({ title: "Q", rows: [validRow({ points: 2.6 })] });
    expect(result.quiz?.questions[0].points).toBe(3);
  });

  it("rejects a missing title", () => {
    const result = buildQuizFromRows({ title: "  ", rows: [validRow()] });
    expect(result.quiz).toBeUndefined();
    expect(result.errors).toContainEqual({ row: 0, message: "Quiz title is required" });
  });

  it("rejects an empty row set", () => {
    const result = buildQuizFromRows({ title: "Q", rows: [] });
    expect(result.errors).toContainEqual({
      row: 0,
      message: "At least one question row is required",
    });
  });

  it("rejects a row with a blank option", () => {
    const result = buildQuizFromRows({ title: "Q", rows: [validRow({ optionC: "" })] });
    expect(result.quiz).toBeUndefined();
    expect(result.errors).toEqual([
      { row: 1, message: "All four options (A-D) must be filled in" },
    ]);
  });

  it("rejects a row with an invalid correct-answer letter", () => {
    const result = buildQuizFromRows({ title: "Q", rows: [validRow({ correctAnswer: "E" })] });
    expect(result.errors).toEqual([
      { row: 1, message: 'Correct answer must be one of A, B, C, D (got "E")' },
    ]);
  });

  it("collects errors across multiple rows instead of stopping at the first", () => {
    const result = buildQuizFromRows({
      title: "Q",
      rows: [validRow({ prompt: "" }), validRow({ correctAnswer: "z" })],
    });
    expect(result.errors).toEqual([
      { row: 1, message: "Question text is empty" },
      { row: 2, message: 'Correct answer must be one of A, B, C, D (got "z")' },
    ]);
  });
});

describe("parseTags", () => {
  it("splits on commas and whitespace, strips '#', lowercases, and dedupes", () => {
    expect(parseTags("#Disney, Movies #movies")).toEqual(["disney", "movies"]);
  });

  it("returns an empty array for undefined or blank input", () => {
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("   ")).toEqual([]);
  });
});
