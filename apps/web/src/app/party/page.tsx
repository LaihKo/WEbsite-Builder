"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { savePlayerId } from "@/lib/partyStorage";

type Mode = "regular" | "party";

export default function PartyLandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
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
        body: JSON.stringify({ name, mode }),
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
      {mode === null && <ModePicker onPick={setMode} />}

      <div className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent-2/25 bg-accent-2/10 px-3 py-1.5 text-xs font-semibold text-accent-2">
          <span className="h-1.5 w-1.5 animate-kz-blink rounded-full bg-accent-2" />
          1-6 spillere · hver på sin telefon
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Partyquiz</h1>
        <p className="text-sm text-muted">
          Stem om en kategori, og kæmp jer derefter igennem de samme spørgsmål sammen.
        </p>
      </div>

      {mode !== null && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
          <span className="text-muted">
            Tilstand: <span className="font-semibold text-foreground">{modeLabel(mode)}</span>
          </span>
          <button onClick={() => setMode(null)} className="font-semibold text-accent hover:underline">
            Skift
          </button>
        </div>
      )}

      <input
        placeholder="Dit navn"
        value={name}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
        className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground outline-none transition-colors focus:border-accent placeholder:text-faint"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={submitting || !name.trim() || mode === null}
          className="rounded-2xl bg-accent px-5 py-4 font-display text-lg font-bold text-accent-foreground shadow-[0_14px_30px_-12px_var(--accent)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint disabled:shadow-none"
        >
          Opret et nyt spil
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-faint">
        <div className="h-px flex-1 bg-border" />
        eller
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleJoin} className="flex flex-col gap-3">
        <input
          placeholder="Spilkode"
          value={joinCode}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setJoinCode(event.target.value)}
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-center font-mono uppercase tracking-[0.4em] text-foreground outline-none transition-colors focus:border-accent placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={submitting || !name.trim() || !joinCode.trim()}
          className="rounded-2xl border border-border bg-surface px-5 py-3.5 font-display font-bold text-foreground transition enabled:hover:bg-surface-2 disabled:opacity-40"
        >
          Deltag i et spil
        </button>
      </form>
    </main>
  );
}

function modeLabel(mode: Mode): string {
  return mode === "party" ? "Partyversion 🍻" : "Almindelig version";
}

function ModePicker({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="font-display text-xl font-bold">Vælg spiltilstand</h2>
          <p className="text-sm text-muted">Du kan skifte igen inden du opretter spillet.</p>
        </div>
        <button
          onClick={() => onPick("party")}
          className="flex flex-col items-start gap-1 rounded-2xl border-[1.5px] border-border bg-background px-5 py-4 text-left transition hover:border-accent-2 hover:bg-accent-2/10"
        >
          <span className="font-display text-lg font-bold">🍻 Partyversion</span>
          <span className="text-sm text-muted">Drukspil — udfordringer mellem runderne for bonuspoint.</span>
        </button>
        <button
          onClick={() => onPick("regular")}
          className="flex flex-col items-start gap-1 rounded-2xl border-[1.5px] border-border bg-background px-5 py-4 text-left transition hover:border-accent hover:bg-accent/10"
        >
          <span className="font-display text-lg font-bold">🎯 Almindelig version</span>
          <span className="text-sm text-muted">Almindeligt partyquiz uden drukspil.</span>
        </button>
      </div>
    </div>
  );
}
