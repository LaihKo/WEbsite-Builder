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
      <h2 className="font-display text-lg font-bold">Tiebreaker-spørgsmål</h2>
      <p className="text-sm text-muted">
        Bruges kun når 2+ spillere er lige om topscoren ved slutningen af et partyspil — spillerne
        indtaster et talgæt, og det tætteste vinder.
      </p>
      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <input
          placeholder="Spørgsmål, f.eks. Hvor mange..."
          value={prompt}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setPrompt(event.target.value)}
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent placeholder:text-faint"
        />
        <input
          placeholder="Referencesvar (tal)"
          type="number"
          value={answer}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setAnswer(event.target.value)}
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent placeholder:text-faint"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !prompt.trim() || answer.trim() === ""}
          className="self-start rounded-xl bg-accent px-5 py-2.5 font-display font-bold text-accent-foreground transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint"
        >
          Tilføj
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li
            key={q.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div>
              <p className="text-sm text-foreground">{q.prompt}</p>
              <p className="text-sm text-muted">Svar: {q.answer}</p>
            </div>
            <button onClick={() => handleDelete(q.id)} className="shrink-0 text-sm text-danger hover:underline">
              Slet
            </button>
          </li>
        ))}
        {questions.length === 0 && <p className="text-sm text-muted">Ingen tiebreaker-spørgsmål endnu.</p>}
      </ul>
    </section>
  );
}
