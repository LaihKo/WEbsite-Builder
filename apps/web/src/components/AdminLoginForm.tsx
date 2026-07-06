"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Login failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <input
        type="password"
        autoFocus
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !password}
        className="rounded-full bg-foreground px-5 py-2 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
