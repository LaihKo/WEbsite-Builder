"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

export interface TiebreakerQuestionView {
  id: string;
  prompt: string;
  answer: number;
}

export function AdminTiebreakerManager({ initial }: { initial: TiebreakerQuestionView[] }) {
  const [questions, setQuestions] = useState(initial);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const parsedAnswer = Number(answer);
    if (!prompt.trim() || !Number.isFinite(parsedAnswer)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tiebreakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, answer: parsedAnswer }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke tilføje spørgsmålet");
      setQuestions((prev) => [data, ...prev]);
      setPrompt("");
      setAnswer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke tilføje spørgsmålet");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/tiebreakers/${id}`, { method: "DELETE" });
    if (res.ok) setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Tiebreaker-spørgsmål</h2>
      <p className="text-sm text-zinc-500">
        Bruges kun når 2+ spillere er lige om topscoren ved slutningen af et partyspil — spillerne
        indtaster et talgæt, og det tætteste vinder.
      </p>
      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <input
          placeholder="Spørgsmål, f.eks. Hvor mange..."
          value={prompt}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setPrompt(event.target.value)}
          className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
        />
        <input
          placeholder="Referencesvar (tal)"
          type="number"
          value={answer}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setAnswer(event.target.value)}
          className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !prompt.trim() || answer.trim() === ""}
          className="self-start rounded-full bg-foreground px-5 py-2 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
        >
          Tilføj
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li
            key={q.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]"
          >
            <div>
              <p className="text-sm">{q.prompt}</p>
              <p className="text-sm text-zinc-500">Svar: {q.answer}</p>
            </div>
            <button
              onClick={() => handleDelete(q.id)}
              className="shrink-0 text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Slet
            </button>
          </li>
        ))}
        {questions.length === 0 && <p className="text-sm text-zinc-500">Ingen tiebreaker-spørgsmål endnu.</p>}
      </ul>
    </section>
  );
}
