"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { QuizImportError } from "@quiz/core";

export interface QuizSummaryView {
  id: string;
  title: string;
  description?: string;
  folder: string | null;
  questionCount: number;
}

interface BulkUploadResult {
  name: string;
  status: "success" | "error";
  message?: string;
}

function titleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.xlsx$/i, "");
  return withoutExtension
    .replace(/[-_]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

async function uploadQuizFile(
  file: File,
  title: string,
  folder: string,
): Promise<{ ok: boolean; message?: string }> {
  const formData = new FormData();
  formData.set("title", title);
  formData.set("description", "");
  formData.set("folder", folder);
  formData.set("file", file);

  const res = await fetch("/api/admin/quizzes", { method: "POST", body: formData });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => null);
  const message: string | undefined = data?.details?.length
    ? data.details.map((d: QuizImportError) => (d.row > 0 ? `Række ${d.row}: ${d.message}` : d.message)).join("; ")
    : data?.error;
  return { ok: false, message: message ?? "Upload mislykkedes" };
}

const NO_FOLDER = "Ingen mappe";

const adminInput =
  "rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground outline-none transition-colors focus:border-accent placeholder:text-faint";
const adminButton =
  "self-start rounded-xl bg-accent px-5 py-2.5 font-display font-bold text-accent-foreground transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint";
const adminCard = "rounded-xl border border-border bg-surface px-4 py-3";

export function AdminQuizManager({ initialQuizzes }: { initialQuizzes: QuizSummaryView[] }) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<QuizImportError[] | null>(null);

  const [bulkFolder, setBulkFolder] = useState("");
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState<BulkUploadResult[]>([]);

  const folderNames = useMemo(
    () => Array.from(new Set(quizzes.map((q) => q.folder).filter((f): f is string => Boolean(f)))).sort(),
    [quizzes],
  );

  const groupedQuizzes = useMemo(() => {
    const groups = new Map<string, QuizSummaryView[]>();
    for (const quiz of quizzes) {
      const key = quiz.folder ?? NO_FOLDER;
      const group = groups.get(key) ?? [];
      group.push(quiz);
      groups.set(key, group);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === NO_FOLDER) return 1;
      if (b === NO_FOLDER) return -1;
      return a.localeCompare(b);
    });
  }, [quizzes]);

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
      formData.set("folder", folder);
      formData.set("file", file);

      const res = await fetch("/api/admin/quizzes", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.details) setFieldErrors(data.details);
        throw new Error(data?.error ?? "Upload mislykkedes");
      }
      setTitle("");
      setDescription("");
      setFile(null);

      const listRes = await fetch("/api/admin/quizzes");
      if (listRes.ok) setQuizzes(await listRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload mislykkedes");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkUpload(event: FormEvent) {
    event.preventDefault();
    if (bulkFiles.length === 0) return;
    setBulkSubmitting(true);
    setBulkProgress(0);
    setBulkResults([]);

    const results: BulkUploadResult[] = [];
    for (const file of bulkFiles) {
      const { ok, message } = await uploadQuizFile(file, titleFromFilename(file.name), bulkFolder);
      results.push({ name: file.name, status: ok ? "success" : "error", message });
      setBulkResults([...results]);
      setBulkProgress(results.length);
    }

    setBulkFiles([]);
    setBulkSubmitting(false);

    const listRes = await fetch("/api/admin/quizzes");
    if (listRes.ok) setQuizzes(await listRes.json());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Slet denne quiz? Dette kan ikke fortrydes.")) return;
    const res = await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
    if (res.ok) setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
  }

  async function handleMove(id: string, newFolder: string) {
    const value = newFolder.trim() || null;
    const res = await fetch(`/api/admin/quizzes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: value }),
    });
    if (res.ok) setQuizzes((prev) => prev.map((quiz) => (quiz.id === id ? { ...quiz, folder: value } : quiz)));
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <button onClick={handleLogout} className="text-sm text-accent hover:underline">
          Log ud
        </button>
      </div>

      <datalist id="quiz-folder-names">
        {folderNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Upload en quiz</h2>
          <a href="/api/admin/template" className="text-sm text-accent hover:underline">
            Download skabelon (.xlsx)
          </a>
        </div>
        <form onSubmit={handleUpload} className="flex flex-col gap-3">
          <input
            placeholder="Quiztitel"
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
            required
            className={adminInput}
          />
          <input
            placeholder="Beskrivelse (valgfri)"
            value={description}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
            className={adminInput}
          />
          <input
            placeholder="Mappe (valgfri)"
            list="quiz-folder-names"
            value={folder}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFolder(event.target.value)}
            className={adminInput}
          />
          <input
            type="file"
            accept=".xlsx"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
            required
            className="text-sm text-muted"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {fieldErrors && fieldErrors.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-danger">
              {fieldErrors.map((fieldError, index) => (
                <li key={index}>
                  {fieldError.row > 0 ? `Række ${fieldError.row}: ` : ""}
                  {fieldError.message}
                </li>
              ))}
            </ul>
          )}
          <button type="submit" disabled={submitting || !file || !title} className={adminButton}>
            {submitting ? "Uploader…" : "Upload"}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold">Bulk-upload</h2>
        <p className="text-sm text-muted">
          Vælg flere .xlsx-filer på én gang — hver bliver sin egen quiz, opkaldt efter filnavnet.
        </p>
        <form onSubmit={handleBulkUpload} className="flex flex-col gap-3">
          <input
            placeholder="Mappe til denne batch (valgfri)"
            list="quiz-folder-names"
            value={bulkFolder}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setBulkFolder(event.target.value)}
            className={adminInput}
          />
          <input
            type="file"
            accept=".xlsx"
            multiple
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setBulkFiles(event.target.files ? Array.from(event.target.files) : [])
            }
            className="text-sm text-muted"
          />
          <button type="submit" disabled={bulkSubmitting || bulkFiles.length === 0} className={adminButton}>
            {bulkSubmitting
              ? `Uploader ${bulkProgress}/${bulkFiles.length}…`
              : bulkFiles.length > 0
                ? `Upload ${bulkFiles.length} quizzer`
                : "Upload quizzer"}
          </button>
          {bulkResults.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {bulkResults.map((result, index) => (
                <li key={index} className={result.status === "success" ? "text-muted" : "text-danger"}>
                  {result.status === "success" ? "✓" : "✗"} {result.name}
                  {result.message ? ` — ${result.message}` : ""}
                </li>
              ))}
            </ul>
          )}
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Quizzer ({quizzes.length})</h2>
        {quizzes.length === 0 && <p className="text-sm text-muted">Ingen quizzer endnu.</p>}
        <div className="flex flex-col gap-2">
          {groupedQuizzes.map(([folderName, folderQuizzes]) => (
            <details key={folderName} className={adminCard}>
              <summary className="cursor-pointer font-medium text-foreground">
                {folderName} ({folderQuizzes.length})
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {folderQuizzes.map((quiz) => (
                  <QuizRow key={quiz.id} quiz={quiz} onDelete={handleDelete} onMove={handleMove} />
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuizRow({
  quiz,
  onDelete,
  onMove,
}: {
  quiz: QuizSummaryView;
  onDelete: (id: string) => void;
  onMove: (id: string, folder: string) => void;
}) {
  const [moveValue, setMoveValue] = useState(quiz.folder ?? "");
  const [moving, setMoving] = useState(false);

  async function handleMoveClick() {
    setMoving(true);
    try {
      await onMove(quiz.id, moveValue);
    } finally {
      setMoving(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">{quiz.title}</p>
        <p className="text-sm text-muted">{quiz.questionCount} spørgsmål</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          placeholder="Flyt til mappe…"
          list="quiz-folder-names"
          value={moveValue}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setMoveValue(event.target.value)}
          className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          onClick={handleMoveClick}
          disabled={moving || moveValue === (quiz.folder ?? "")}
          className="text-sm text-accent enabled:hover:underline disabled:text-faint"
        >
          Flyt
        </button>
        <a href={`/quiz/${quiz.id}`} className="text-sm text-accent hover:underline">
          Tag quizzen
        </a>
        <button onClick={() => onDelete(quiz.id)} className="text-sm text-danger hover:underline">
          Slet
        </button>
      </div>
    </li>
  );
}
