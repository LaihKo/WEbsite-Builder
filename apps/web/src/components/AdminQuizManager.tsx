"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { QuizImportError } from "@quiz/core";

export interface QuizSummaryView {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
}

export function AdminQuizManager({ initialQuizzes }: { initialQuizzes: QuizSummaryView[] }) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<QuizImportError[] | null>(null);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors(null);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("file", file);

      const res = await fetch("/api/admin/quizzes", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.details) setFieldErrors(data.details);
        throw new Error(data?.error ?? "Upload failed");
      }
      setTitle("");
      setDescription("");
      setFile(null);

      const listRes = await fetch("/api/admin/quizzes");
      if (listRes.ok) setQuizzes(await listRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this quiz? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
    if (res.ok) setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button onClick={handleLogout} className="text-sm text-zinc-500 hover:underline">
          Sign out
        </button>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Upload a quiz</h2>
          <a href="/api/admin/template" className="text-sm text-zinc-500 hover:underline">
            Download template (.xlsx)
          </a>
        </div>
        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <input
            placeholder="Quiz title"
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
            required
            className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
          />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
            className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
          />
          <input
            type="file"
            accept=".xlsx"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
            required
            className="text-sm"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {fieldErrors && fieldErrors.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-400">
              {fieldErrors.map((fieldError, index) => (
                <li key={index}>
                  {fieldError.row > 0 ? `Row ${fieldError.row}: ` : ""}
                  {fieldError.message}
                </li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            disabled={submitting || !file || !title}
            className="self-start rounded-full bg-foreground px-5 py-2 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
          >
            {submitting ? "Uploading…" : "Upload"}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Quizzes ({quizzes.length})</h2>
        {quizzes.length === 0 && <p className="text-sm text-zinc-500">No quizzes yet.</p>}
        <ul className="flex flex-col gap-2">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex items-center justify-between rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]"
            >
              <div>
                <p className="font-medium">{quiz.title}</p>
                <p className="text-sm text-zinc-500">{quiz.questionCount} questions</p>
              </div>
              <div className="flex items-center gap-4">
                <a href={`/quiz/${quiz.id}`} className="text-sm hover:underline">
                  Take
                </a>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
