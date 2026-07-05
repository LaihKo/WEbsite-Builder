"use client";

import { useState } from "react";
import {
  advance,
  answerCurrentQuestion,
  createQuizState,
  getCurrentQuestion,
  getResult,
  type Quiz,
} from "@quiz/core";

export function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const [state, setState] = useState(() => createQuizState(quiz));
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  if (state.status === "completed") {
    const result = getResult(state, quiz);
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-semibold">Quiz complete</h2>
        <p className="text-lg">
          {result.correctCount} / {result.totalQuestions} correct (
          {result.percentage}%)
        </p>
        <button
          className="rounded-full border border-black/[.08] px-5 py-2 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          onClick={() => {
            setState(createQuizState(quiz));
            setSelectedOptionId(null);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const question = getCurrentQuestion(state, quiz);
  if (!question) return null;

  const questionNumber = state.currentIndex + 1;

  function handleSubmit() {
    if (!selectedOptionId) return;
    const answered = answerCurrentQuestion(state, quiz, selectedOptionId);
    setState(advance(answered, quiz));
    setSelectedOptionId(null);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <p className="text-sm text-zinc-500">
        Question {questionNumber} of {quiz.questions.length}
      </p>
      <h2 className="text-xl font-medium">{question.prompt}</h2>
      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className={`cursor-pointer rounded-lg border px-4 py-3 transition-colors ${
              selectedOptionId === option.id
                ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                : "border-black/[.08] dark:border-white/[.145]"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={option.id}
              checked={selectedOptionId === option.id}
              onChange={() => setSelectedOptionId(option.id)}
              className="mr-2"
            />
            {option.text}
          </label>
        ))}
      </div>
      <button
        className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
        disabled={!selectedOptionId}
        onClick={handleSubmit}
      >
        {questionNumber === quiz.questions.length ? "Finish" : "Next"}
      </button>
    </div>
  );
}
