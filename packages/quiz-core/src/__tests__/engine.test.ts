import { describe, expect, it } from "vitest";
import {
  advance,
  answerCurrentQuestion,
  createQuizState,
  getCurrentQuestion,
  getResult,
} from "../engine";
import { sampleQuiz } from "../sampleQuiz";
import type { Quiz } from "../types";

describe("quiz engine", () => {
  it("walks through a quiz question by question and produces a final result", () => {
    let state = createQuizState(sampleQuiz);
    expect(getCurrentQuestion(state, sampleQuiz)?.id).toBe("q1");

    state = answerCurrentQuestion(state, sampleQuiz, "a"); // correct
    state = advance(state, sampleQuiz);
    expect(state.status).toBe("in_progress");
    expect(getCurrentQuestion(state, sampleQuiz)?.id).toBe("q2");

    state = answerCurrentQuestion(state, sampleQuiz, "a"); // wrong (correct is "c")
    state = advance(state, sampleQuiz);

    state = answerCurrentQuestion(state, sampleQuiz, "b"); // correct
    state = advance(state, sampleQuiz);

    expect(state.status).toBe("completed");
    const result = getResult(state, sampleQuiz);
    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(3);
  });

  it("changing an answer before advancing replaces the previous one, not duplicates it", () => {
    let state = createQuizState(sampleQuiz);
    state = answerCurrentQuestion(state, sampleQuiz, "b");
    state = answerCurrentQuestion(state, sampleQuiz, "a");
    expect(state.answers).toHaveLength(1);
    expect(state.answers[0].selectedOptionId).toBe("a");
  });

  it("throws when answering after the quiz is already completed", () => {
    let state = createQuizState(sampleQuiz);
    for (let i = 0; i < sampleQuiz.questions.length; i++) {
      state = answerCurrentQuestion(state, sampleQuiz, "a");
      state = advance(state, sampleQuiz);
    }
    expect(() => answerCurrentQuestion(state, sampleQuiz, "a")).toThrow();
  });

  it("throws when reading a result before completion", () => {
    const state = createQuizState(sampleQuiz);
    expect(() => getResult(state, sampleQuiz)).toThrow();
  });

  it("rejects quizzes with no questions at creation time", () => {
    const emptyQuiz: Quiz = { id: "empty", title: "Empty", questions: [] };
    expect(() => createQuizState(emptyQuiz)).toThrow();
  });
});
