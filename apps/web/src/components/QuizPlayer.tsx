"use client";

import { useEffect, useState } from "react";
import {
  advance,
  answerCurrentQuestion,
  createQuizState,
  getCurrentQuestion,
  type Answer,
  type PublicQuiz,
  type QuizResult,
  type QuizState,
} from "@quiz/core";

interface RecentAttempt {
  id: string;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "lige nu";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min. siden`;
  const hours = Math.round(minutes / 60);
  return `${hours} t. siden`;
}

export function QuizPlayer({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quizzes/${quizId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Kunne ikke indlæse quizzen (${res.status})`);
        return res.json();
      })
      .then((data: PublicQuiz) => {
        if (cancelled) return;
        setQuiz(data);
        setQuizState(createQuizState(data));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  async function submitAnswers(answers: Answer[]) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error(`Kunne ikke bedømme quizzen (${res.status})`);
      setResult(await res.json());

      const attemptsRes = await fetch(`/api/quizzes/${quizId}/attempts`);
      if (attemptsRes.ok) setRecentAttempts(await attemptsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke bedømme quizzen");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!selectedOptionId || !quiz || !quizState) return;
    const answered = answerCurrentQuestion(quizState, quiz, selectedOptionId);
    const isLastQuestion = quizState.currentIndex + 1 >= quiz.questions.length;
    setQuizState(advance(answered, quiz));
    setSelectedOptionId(null);
    if (isLastQuestion) {
      void submitAnswers(answered.answers);
    }
  }

  function handleRetry() {
    if (!quiz) return;
    setQuizState(createQuizState(quiz));
    setSelectedOptionId(null);
    setResult(null);
    setRecentAttempts(null);
  }

  if (error) {
    return <p className="text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!quiz || !quizState) {
    return <p className="text-zinc-500">Indlæser quiz…</p>;
  }

  if (quizState.status === "completed") {
    if (submitting || !result) {
      return <p className="text-zinc-500">Bedømmer…</p>;
    }
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-semibold">Quiz gennemført</h2>
        <p className="text-lg">
          {result.correctCount} / {result.totalQuestions} rigtige (
          {result.percentage}%)
        </p>
        {recentAttempts && recentAttempts.length > 1 && (
          <div className="text-sm text-zinc-500">
            <p className="mb-1 font-medium">Seneste forsøg</p>
            <ul className="flex flex-col gap-0.5">
              {recentAttempts.map((attempt) => (
                <li key={attempt.id}>
                  {attempt.percentage}% ({attempt.correctCount}/{attempt.totalQuestions}) —{" "}
                  {timeAgo(attempt.createdAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          className="rounded-full border border-black/[.08] px-5 py-2 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          onClick={handleRetry}
        >
          Prøv igen
        </button>
      </div>
    );
  }

  const question = getCurrentQuestion(quizState, quiz);
  if (!question) return null;

  const questionNumber = quizState.currentIndex + 1;

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <p className="text-sm text-zinc-500">
        Spørgsmål {questionNumber} af {quiz.questions.length}
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
        {questionNumber === quiz.questions.length ? "Afslut" : "Næste"}
      </button>
    </div>
  );
}
