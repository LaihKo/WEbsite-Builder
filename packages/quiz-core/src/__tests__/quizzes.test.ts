import { describe, expect, it } from "vitest";
import { getQuizById, listQuizzes } from "../quizzes";
import { sampleQuiz } from "../sampleQuiz";

describe("quiz repository", () => {
  it("finds the sample quiz by id", () => {
    expect(getQuizById(sampleQuiz.id)).toBe(sampleQuiz);
  });

  it("returns undefined for an unknown id", () => {
    expect(getQuizById("does-not-exist")).toBeUndefined();
  });

  it("lists all known quizzes", () => {
    expect(listQuizzes()).toContain(sampleQuiz);
  });
});
