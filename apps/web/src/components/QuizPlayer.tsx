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
    return <p className="text-danger">{error}</p>;
  }

  if (!quiz || !quizState) {
    return <p className="text-muted">Indlæser quiz…</p>;
  }

  if (quizState.status === "completed") {
    if (submitting || !result) {
      return <p className="text-muted">Bedømmer…</p>;
    }
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold">Quiz gennemført</h2>
        <p className="text-lg text-foreground">
          {result.correctCount} / {result.totalQuestions} rigtige (
          {result.percentage}%)
        </p>
        {recentAttempts && recentAttempts.length > 1 && (
          <div className="text-sm text-muted">
            <p className="mb-1 font-medium text-foreground">Seneste forsøg</p>
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
          onClick={handleRetry}
          className="rounded-2xl border border-border bg-surface px-5 py-3.5 font-display font-bold text-foreground transition hover:bg-surface-2"
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
      <p className="text-sm text-muted">
        Spørgsmål {questionNumber} af {quiz.questions.length}
      </p>
      <h2 className="font-display text-xl font-bold">{question.prompt}</h2>
      <div className="flex flex-col gap-2.5">
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4 py-4 text-[17px] transition ${
                selected ? "border-accent bg-accent/15" : "border-border bg-surface"
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={selected}
                onChange={() => setSelectedOptionId(option.id)}
                className="sr-only"
              />
              <span
                className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-accent" : "border-white/30"
                }`}
              >
                {selected && <span className="size-2.5 rounded-full bg-accent" />}
              </span>
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!selectedOptionId}
        className="rounded-2xl bg-accent px-5 py-4 font-display text-lg font-bold text-accent-foreground shadow-[0_14px_30px_-12px_var(--accent)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint disabled:shadow-none"
      >
        {questionNumber === quiz.questions.length ? "Afslut" : "Næste"}
      </button>
    </div>
  );
}
