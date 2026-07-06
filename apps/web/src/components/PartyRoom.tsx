"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clearPlayerId, loadPlayerId, savePlayerId } from "@/lib/partyStorage";

const POLL_INTERVAL_MS = 1500;

interface PlayerView {
  seat: number;
  name: string;
  hasVoted: boolean;
  hasAnsweredCurrent: boolean;
  correctCount: number;
  scorePoints: number;
}

interface PublicOption {
  id: string;
  text: string;
}

interface PublicQuestion {
  id: string;
  prompt: string;
  points: number;
  tags: string[];
  options: PublicOption[];
}

interface GameStateView {
  code: string;
  status: "lobby" | "voting" | "playing" | "completed";
  players: PlayerView[];
  categoryChoices: string[];
  category: string | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null;
  you: { seat: number; votedTag: string | null } | null;
  isHost: boolean;
}

export function PartyRoom({ code }: { code: string }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [state, setState] = useState<GameStateView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lastQuestionId = useRef<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => setPlayerId(loadPlayerId(code)));
  }, [code]);

  const poll = useCallback(() => {
    const url = playerId ? `/api/games/${code}?playerId=${playerId}` : `/api/games/${code}`;
    fetch(url).then((res) => {
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      res.json().then((data: GameStateView) => setState(data));
    });
  }, [code, playerId]);

  useEffect(() => {
    const interval = setInterval(() => poll(), POLL_INTERVAL_MS);
    Promise.resolve().then(() => poll());
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    const currentId = state?.currentQuestion?.id ?? null;
    if (currentId !== lastQuestionId.current) {
      lastQuestionId.current = currentId;
      setSelectedOptionId(null);
    }
  }, [state?.currentQuestion?.id]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to join game");
      savePlayerId(code, data.playerId);
      setPlayerId(data.playerId);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    setActionError(null);
    const res = await fetch(`/api/games/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setActionError(data?.error ?? "Failed to start voting");
      return;
    }
    poll();
  }

  async function handleVote(tag: string) {
    setActionError(null);
    const res = await fetch(`/api/games/${code}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, tag }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setActionError(data?.error ?? "Failed to vote");
      return;
    }
    poll();
  }

  async function handleSubmitAnswer() {
    if (!state?.currentQuestion || !selectedOptionId) return;
    setActionError(null);
    const res = await fetch(`/api/games/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        questionId: state.currentQuestion.id,
        selectedOptionId,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setActionError(data?.error ?? "Failed to submit answer");
      return;
    }
    poll();
  }

  function handlePlayAgain() {
    clearPlayerId(code);
    router.push("/party");
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-zinc-500">
          Game <span className="font-mono">{code}</span> doesn&apos;t exist (or has ended).
        </p>
        <button onClick={() => router.push("/party")} className="text-sm hover:underline">
          Back to start
        </button>
      </div>
    );
  }

  if (!playerId) {
    return (
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">
          Join game <span className="font-mono">{code}</span>
        </h1>
        <input
          placeholder="Your name"
          value={joinName}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setJoinName(event.target.value)}
          autoFocus
          className="rounded-lg border border-black/[.08] px-4 py-2 dark:border-white/[.145] dark:bg-transparent"
        />
        {joinError && <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>}
        <button
          type="submit"
          disabled={joining || !joinName.trim()}
          className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
        >
          Join
        </button>
      </form>
    );
  }

  if (!state) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  const you = state.players.find((p) => p.seat === state.you?.seat) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {state.status === "lobby" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-zinc-500">Share this code:</p>
          <p className="text-4xl font-mono font-bold tracking-widest">{code}</p>
          <ul className="flex w-full flex-col gap-1">
            {Array.from({ length: 6 }, (_, i) => i + 1).map((seat) => {
              const player = state.players.find((p) => p.seat === seat);
              return (
                <li
                  key={seat}
                  className={`rounded-lg border px-4 py-2 text-left ${
                    player
                      ? "border-black/[.08] dark:border-white/[.145]"
                      : "border-dashed border-black/[.08] text-zinc-400 dark:border-white/[.145]"
                  }`}
                >
                  {player ? `${player.name}${seat === 1 ? " (host)" : ""}` : "waiting for player…"}
                </li>
              );
            })}
          </ul>
          {state.isHost ? (
            <button
              onClick={handleStart}
              className="rounded-full bg-foreground px-5 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Start voting
            </button>
          ) : (
            <p className="text-sm text-zinc-500">Waiting for the host to start…</p>
          )}
        </div>
      )}

      {state.status === "voting" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-semibold">Vote for a category</h2>
          <div className="flex w-full flex-col gap-2">
            {state.categoryChoices.map((tag) => (
              <button
                key={tag}
                onClick={() => handleVote(tag)}
                disabled={Boolean(state.you?.votedTag)}
                className={`rounded-lg border px-4 py-3 capitalize transition-colors disabled:cursor-not-allowed ${
                  state.you?.votedTag === tag
                    ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                    : "border-black/[.08] enabled:hover:bg-black/[.04] dark:border-white/[.145] dark:enabled:hover:bg-[#1a1a1a]"
                }`}
              >
                {tag.replace(/-/g, " ")}
              </button>
            ))}
          </div>
          <p className="text-sm text-zinc-500">
            {state.players.filter((p) => p.hasVoted).length} / {state.players.length} voted
          </p>
        </div>
      )}

      {state.status === "playing" && state.currentQuestion && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-zinc-500">
            Category: <span className="capitalize">{state.category?.replace(/-/g, " ")}</span> —
            question {state.currentQuestionIndex + 1} of {state.totalQuestions}
          </p>
          {you?.hasAnsweredCurrent ? (
            <p className="text-center text-zinc-500">
              Answer submitted — waiting for {state.players.filter((p) => !p.hasAnsweredCurrent).length}{" "}
              more player(s)…
            </p>
          ) : (
            <>
              <h2 className="text-xl font-medium">{state.currentQuestion.prompt}</h2>
              <div className="flex flex-col gap-2">
                {state.currentQuestion.options.map((option) => (
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
                      name="option"
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
                onClick={handleSubmitAnswer}
                disabled={!selectedOptionId}
                className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
              >
                Submit
              </button>
            </>
          )}
          <Scoreboard players={state.players} />
        </div>
      )}

      {state.status === "completed" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">Game over!</h2>
          <Scoreboard players={state.players} />
          <button onClick={handlePlayAgain} className="text-sm hover:underline">
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

function Scoreboard({ players }: { players: PlayerView[] }) {
  const ranked = players.slice().sort((a, b) => b.scorePoints - a.scorePoints);
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {ranked.map((player, index) => (
        <li
          key={player.seat}
          className="flex items-center justify-between rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145]"
        >
          <span>
            {index + 1}. {player.name}
          </span>
          <span className="text-zinc-500">{player.scorePoints} pts</span>
        </li>
      ))}
    </ul>
  );
}
