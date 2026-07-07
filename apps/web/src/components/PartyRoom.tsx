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
  inTiebreak: boolean;
  isWinner: boolean;
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

interface TiebreakGuessView {
  seat: number;
  hasAnswered: boolean;
  guess: number | null;
}

interface TiebreakView {
  prompt: string;
  participantSeats: number[];
  secondsRemaining: number | null;
  answer: number | null;
  guesses: TiebreakGuessView[];
}

interface GameStateView {
  code: string;
  status: "lobby" | "voting" | "playing" | "round-summary" | "tiebreak" | "completed";
  players: PlayerView[];
  categoryChoices: string[];
  category: string | null;
  roundIndex: number;
  totalRounds: number;
  questionsPerRound: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionIndexInRound: number;
  questionsInCurrentRound: number;
  currentQuestion: PublicQuestion | null;
  questionSecondsRemaining: number | null;
  tiebreak: TiebreakView | null;
  winnerSeats: number[];
  you: { seat: number; votedTag: string | null; isTiebreakParticipant: boolean } | null;
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
  const [tiebreakGuess, setTiebreakGuess] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number | null>(null);
  const [tiebreakSecondsLeft, setTiebreakSecondsLeft] = useState<number | null>(null);
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
      res.json().then((data: GameStateView) => {
        setState(data);
        setQuestionSecondsLeft(data.questionSecondsRemaining);
        setTiebreakSecondsLeft(data.tiebreak?.secondsRemaining ?? null);
      });
    });
  }, [code, playerId]);

  useEffect(() => {
    const interval = setInterval(() => poll(), POLL_INTERVAL_MS);
    Promise.resolve().then(() => poll());
    return () => clearInterval(interval);
  }, [poll]);

  // Ticks the countdowns down locally between polls so they read smoothly
  // instead of jumping every POLL_INTERVAL_MS; each poll resyncs them to the
  // server's clock, so drift never accumulates.
  useEffect(() => {
    const interval = setInterval(() => {
      setQuestionSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      setTiebreakSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke deltage i spillet");
      savePlayerId(code, data.playerId);
      setPlayerId(data.playerId);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Kunne ikke deltage i spillet");
    } finally {
      setJoining(false);
    }
  }

  async function postAction(path: string, body: object, fallbackError: string) {
    if (actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/games/${code}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.error ?? fallbackError);
        return;
      }
      poll();
    } finally {
      setActionPending(false);
    }
  }

  function handleStart() {
    postAction("start", { playerId }, "Kunne ikke starte afstemningen");
  }

  function handleVote(tag: string) {
    postAction("vote", { playerId, tag }, "Kunne ikke stemme");
  }

  function handleSubmitAnswer() {
    if (!state?.currentQuestion || !selectedOptionId) return;
    postAction(
      "answer",
      { playerId, questionId: state.currentQuestion.id, selectedOptionId },
      "Kunne ikke indsende svar",
    );
  }

  function handleAdvanceRound() {
    postAction("advance-round", { playerId }, "Kunne ikke fortsætte");
  }

  function handleSubmitTiebreak(event: FormEvent) {
    event.preventDefault();
    const guess = Number(tiebreakGuess);
    if (!Number.isFinite(guess)) return;
    postAction("tiebreak-answer", { playerId, guess }, "Kunne ikke indsende gæt");
  }

  function handlePlayAgain() {
    clearPlayerId(code);
    router.push("/party");
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-zinc-500">
          Spillet <span className="font-mono">{code}</span> findes ikke (eller er slut).
        </p>
        <button onClick={() => router.push("/party")} className="text-sm hover:underline">
          Tilbage til start
        </button>
      </div>
    );
  }

  if (!playerId) {
    return (
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">
          Deltag i spil <span className="font-mono">{code}</span>
        </h1>
        <input
          placeholder="Dit navn"
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
          Deltag
        </button>
      </form>
    );
  }

  if (!state) {
    return <p className="text-zinc-500">Indlæser…</p>;
  }

  const you = state.players.find((p) => p.seat === state.you?.seat) ?? null;
  const isLastRound = state.roundIndex + 1 >= state.totalRounds;

  return (
    <div className="flex flex-col gap-6">
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {state.status === "lobby" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-zinc-500">Del denne kode:</p>
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
                  {player ? `${player.name}${seat === 1 ? " (vært)" : ""}` : "venter på spiller…"}
                </li>
              );
            })}
          </ul>
          {state.isHost ? (
            <button
              onClick={handleStart}
              disabled={actionPending}
              className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
            >
              Start afstemning
            </button>
          ) : (
            <p className="text-sm text-zinc-500">Venter på, at værten starter…</p>
          )}
        </div>
      )}

      {state.status === "voting" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-zinc-500">
            Runde {state.roundIndex + 1} af {state.totalRounds}
          </p>
          <h2 className="text-xl font-semibold">Stem om en kategori</h2>
          <div className="flex w-full flex-col gap-2">
            {state.categoryChoices.map((tag) => (
              <button
                key={tag}
                onClick={() => handleVote(tag)}
                disabled={actionPending || Boolean(state.you?.votedTag)}
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
            {state.players.filter((p) => p.hasVoted).length} / {state.players.length} har stemt
          </p>
        </div>
      )}

      {state.status === "playing" && state.currentQuestion && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <p>
              Runde {state.roundIndex + 1} af {state.totalRounds} —{" "}
              <span className="capitalize">{state.category?.replace(/-/g, " ")}</span> — spørgsmål{" "}
              {state.questionIndexInRound + 1} af {state.questionsInCurrentRound}
            </p>
            <p className="font-mono tabular-nums">{questionSecondsLeft ?? "–"}s</p>
          </div>
          {you?.hasAnsweredCurrent ? (
            <p className="text-center text-zinc-500">
              Svar indsendt — venter på {state.players.filter((p) => !p.hasAnsweredCurrent).length}{" "}
              spiller(e) mere…
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
                disabled={actionPending || !selectedOptionId}
                className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
              >
                Indsend
              </button>
            </>
          )}
          <Scoreboard players={state.players} />
        </div>
      )}

      {state.status === "round-summary" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-semibold">Runde {state.roundIndex + 1} færdig!</h2>
          <Scoreboard players={state.players} />
          {state.isHost ? (
            <button
              onClick={handleAdvanceRound}
              disabled={actionPending}
              className="rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
            >
              {isLastRound ? "Se det endelige resultat" : "Start næste runde"}
            </button>
          ) : (
            <p className="text-sm text-zinc-500">Venter på, at værten fortsætter…</p>
          )}
        </div>
      )}

      {state.status === "tiebreak" && state.tiebreak && (
        <TiebreakPanel
          tiebreak={state.tiebreak}
          isParticipant={Boolean(state.you?.isTiebreakParticipant)}
          hasAnswered={state.tiebreak.guesses.find((g) => g.seat === state.you?.seat)?.hasAnswered ?? false}
          secondsLeft={tiebreakSecondsLeft}
          guess={tiebreakGuess}
          onGuessChange={setTiebreakGuess}
          onSubmit={handleSubmitTiebreak}
          submitDisabled={actionPending}
          players={state.players}
        />
      )}

      {state.status === "completed" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">Spillet er slut!</h2>
          {state.tiebreak && (
            <TiebreakReveal tiebreak={state.tiebreak} players={state.players} />
          )}
          <Scoreboard players={state.players} winnerSeats={state.winnerSeats} />
          <button onClick={handlePlayAgain} className="text-sm hover:underline">
            Spil igen
          </button>
        </div>
      )}
    </div>
  );
}

function TiebreakPanel({
  tiebreak,
  isParticipant,
  hasAnswered,
  secondsLeft,
  guess,
  onGuessChange,
  onSubmit,
  submitDisabled,
  players,
}: {
  tiebreak: TiebreakView;
  isParticipant: boolean;
  hasAnswered: boolean;
  secondsLeft: number | null;
  guess: string;
  onGuessChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  submitDisabled: boolean;
  players: PlayerView[];
}) {
  const tiedNames = tiebreak.participantSeats
    .map((seat) => players.find((p) => p.seat === seat)?.name ?? `Plads ${seat}`)
    .join(" og ");
  const answeredCount = tiebreak.guesses.filter((g) => g.hasAnswered).length;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-zinc-500">
        {tiedNames} er lige om førstepladsen — nærmeste gæt vinder!
      </p>
      <div className="flex items-center justify-between w-full text-sm text-zinc-500">
        <span>Tiebreaker</span>
        <span className="font-mono tabular-nums">{secondsLeft ?? "–"}s</span>
      </div>
      <h2 className="text-xl font-medium">{tiebreak.prompt}</h2>

      {isParticipant ? (
        hasAnswered ? (
          <p className="text-zinc-500">Gæt indsendt — venter på {answeredCount < tiebreak.participantSeats.length ? "de andre spillere, der er lige med dig" : "resultatet"}…</p>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Dit gæt"
              value={guess}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onGuessChange(event.target.value)}
              autoFocus
              className="rounded-lg border border-black/[.08] px-4 py-2 text-center dark:border-white/[.145] dark:bg-transparent"
            />
            <button
              type="submit"
              disabled={submitDisabled || guess.trim() === ""}
              className="self-center rounded-full bg-foreground px-5 py-3 text-background transition-colors enabled:hover:bg-[#383838] disabled:opacity-40 dark:enabled:hover:bg-[#ccc]"
            >
              Indsend gæt
            </button>
          </form>
        )
      ) : (
        <p className="text-zinc-500">
          Du er ikke lige med om førstepladsen — du kan følge med, men kun {tiedNames} kan svare på denne.
        </p>
      )}
    </div>
  );
}

function TiebreakReveal({ tiebreak, players }: { tiebreak: TiebreakView; players: PlayerView[] }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-black/[.08] p-4 text-left text-sm dark:border-white/[.145]">
      <p className="font-medium">Tiebreaker: {tiebreak.prompt}</p>
      <p className="text-zinc-500">Referencesvar: {tiebreak.answer}</p>
      <ul className="flex flex-col gap-1">
        {tiebreak.guesses.map((g) => (
          <li key={g.seat} className="flex justify-between">
            <span>{players.find((p) => p.seat === g.seat)?.name ?? `Plads ${g.seat}`}</span>
            <span className="text-zinc-500">{g.guess ?? "intet gæt"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Scoreboard({ players, winnerSeats }: { players: PlayerView[]; winnerSeats?: number[] }) {
  const ranked = players.slice().sort((a, b) => b.scorePoints - a.scorePoints);
  const topScore = ranked[0]?.scorePoints;
  return (
    <ul className="flex w-full flex-col gap-1 text-sm">
      {ranked.map((player, index) => {
        const isWinner = winnerSeats ? winnerSeats.includes(player.seat) : false;
        const isLeader = !winnerSeats?.length && topScore > 0 && player.scorePoints === topScore;
        return (
          <li
            key={player.seat}
            className="flex items-center justify-between rounded-lg border border-black/[.08] px-3 py-2 dark:border-white/[.145]"
          >
            <span>
              {index + 1}. {player.name}
              {isWinner ? " — vinder" : isLeader ? " — fører" : ""}
            </span>
            <span className="text-zinc-500">{player.scorePoints} point</span>
          </li>
        );
      })}
    </ul>
  );
}
