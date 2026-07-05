import { describe, expect, it } from "vitest";
import { scoreQuiz } from "../scoring";
import type { Quiz } from "../types";

const quiz: Quiz = {
  id: "q",
  title: "Test Quiz",
  questions: [
    {
      id: "q1",
      prompt: "1+1?",
      options: [
        { id: "a", text: "2" },
        { id: "b", text: "3" },
      ],
      correctOptionId: "a",
      points: 2,
    },
    {
      id: "q2",
      prompt: "2+2?",
      options: [
        { id: "a", text: "4" },
        { id: "b", text: "5" },
      ],
      correctOptionId: "a",
      points: 1,
    },
  ],
};

describe("scoreQuiz", () => {
  it("scores all-correct answers at 100%", () => {
    const result = scoreQuiz(quiz, [
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionId: "a" },
    ]);
    expect(result.correctCount).toBe(2);
    expect(result.scorePoints).toBe(3);
    expect(result.maxPoints).toBe(3);
    expect(result.percentage).toBe(100);
  });

  it("scores partial-correct answers proportionally by points", () => {
    const result = scoreQuiz(quiz, [
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionId: "b" },
    ]);
    expect(result.correctCount).toBe(1);
    expect(result.scorePoints).toBe(2);
    expect(result.percentage).toBe(67);
  });

  it("treats missing answers as incorrect rather than throwing", () => {
    const result = scoreQuiz(quiz, [{ questionId: "q1", selectedOptionId: "a" }]);
    expect(result.correctCount).toBe(1);
    expect(result.scorePoints).toBe(2);
    expect(result.totalQuestions).toBe(2);
  });

  it("ignores answers for unknown question ids", () => {
    const result = scoreQuiz(quiz, [{ questionId: "unknown", selectedOptionId: "a" }]);
    expect(result.correctCount).toBe(0);
    expect(result.scorePoints).toBe(0);
  });

  it("returns 0% for a quiz with no questions instead of dividing by zero", () => {
    const emptyQuiz: Quiz = { id: "empty", title: "Empty", questions: [] };
    const result = scoreQuiz(emptyQuiz, []);
    expect(result.percentage).toBe(0);
    expect(result.maxPoints).toBe(0);
  });
});
