"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { savePlayerId } from "@/lib/partyStorage";

export default function PartyLandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke oprette spillet");
      savePlayerId(data.code, data.playerId);
      router.push(`/party/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette spillet");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke deltage i spillet");
      savePlayerId(code, data.playerId);
      router.push(`/party/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke deltage i spillet");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Partyquiz</h1>
        <p className="mt-1 text-sm text-zinc-500">
          1-6 spillere, hver på sin egen enhed. Stem om en kategori, og kæmp jer derefter igennem
          de samme spørgsmål sammen.
        </p>
      </div>

      <input
        placeholder="Dit navn"
        value={name}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
        className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
        >
          Opret et nyt spil
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
        eller
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
      </div>

      <form onSubmit={handleJoin} className="flex flex-col gap-3">
        <input
          placeholder="Spilkode"
          value={joinCode}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setJoinCode(event.target.value)}
          className="rounded-lg border border-black/[.08] px-4 py-2 uppercase tracking-widest dark:border-white/[.145] dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={submitting || !name.trim() || !joinCode.trim()}
          className="rounded-full border border-black/[.08] px-5 py-3 transition-colors enabled:hover:bg-black/[.04] disabled:opacity-40 dark:border-white/[.145] dark:enabled:hover:bg-[#1a1a1a]"
        >
          Deltag i et spil
        </button>
      </form>
    </main>
  );
}
