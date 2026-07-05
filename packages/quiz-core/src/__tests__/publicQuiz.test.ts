import { describe, expect, it } from "vitest";
import { toPublicQuiz } from "../publicQuiz";
import { sampleQuiz } from "../sampleQuiz";
import { createQuizState, answerCurrentQuestion, advance, getCurrentQuestion } from "../engine";

describe("toPublicQuiz", () => {
  it("strips correctOptionId from every question", () => {
    const publicQuiz = toPublicQuiz(sampleQuiz);
    for (const question of publicQuiz.questions) {
      expect(question).not.toHaveProperty("correctOptionId");
    }
    expect(publicQuiz.questions).toHaveLength(sampleQuiz.questions.length);
  });

  it("preserves id, title, description, and option data", () => {
    const publicQuiz = toPublicQuiz(sampleQuiz);
    expect(publicQuiz.id).toBe(sampleQuiz.id);
    expect(publicQuiz.title).toBe(sampleQuiz.title);
    expect(publicQuiz.description).toBe(sampleQuiz.description);
    expect(publicQuiz.questions[0].options).toEqual(sampleQuiz.questions[0].options);
  });

  it("is navigable with the engine's state machine like a full Quiz", () => {
    const publicQuiz = toPublicQuiz(sampleQuiz);
    let state = createQuizState(publicQuiz);
    expect(getCurrentQuestion(state, publicQuiz)?.id).toBe("q1");
    state = answerCurrentQuestion(state, publicQuiz, "a");
    state = advance(state, publicQuiz);
    expect(state.currentIndex).toBe(1);
  });
});
