"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clearPlayerId, loadPlayerId, savePlayerId } from "@/lib/partyStorage";
import { CountdownRing } from "./CountdownRing";

const POLL_INTERVAL_MS = 1500;
const QUESTION_TIMER_SECONDS = 30;
const TIEBREAK_TIMER_SECONDS = 45;
const QUESTIONS_PER_CHALLENGE = 3;

type ChallengeStatus = "none" | "in-progress" | "success" | "failed";

interface PlayerView {
  seat: number;
  name: string;
  hasVoted: boolean;
  hasAnsweredCurrent: boolean;
  correctCount: number;
  scorePoints: number;
  inTiebreak: boolean;
  isWinner: boolean;
  challengeStatus: ChallengeStatus;
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

interface ChallengeView {
  questionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null;
  secondsRemaining: number | null;
  completed: boolean;
  correct: boolean | null;
}

interface GameStateView {
  code: string;
  mode: "regular" | "party";
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
  you: {
    seat: number;
    votedTag: string | null;
    isTiebreakParticipant: boolean;
    challenge: ChallengeView | null;
  } | null;
  isHost: boolean;
}

const primaryButton =
  "rounded-2xl bg-accent px-5 py-4 font-display text-lg font-bold text-accent-foreground shadow-[0_14px_30px_-12px_var(--accent)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint disabled:shadow-none";
const textInput =
  "rounded-2xl border border-border bg-surface px-4 py-4 text-foreground outline-none transition-colors focus:border-accent placeholder:text-faint";

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
  const [challengeSecondsLeft, setChallengeSecondsLeft] = useState<number | null>(null);
  const [challengeOptionId, setChallengeOptionId] = useState<string | null>(null);
  const lastQuestionId = useRef<string | null>(null);
  const lastChallengeQuestionId = useRef<string | null>(null);

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
        setChallengeSecondsLeft(data.you?.challenge?.secondsRemaining ?? null);
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
      setChallengeSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
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

  useEffect(() => {
    const currentId = state?.you?.challenge?.currentQuestion?.id ?? null;
    if (currentId !== lastChallengeQuestionId.current) {
      lastChallengeQuestionId.current = currentId;
      setChallengeOptionId(null);
    }
  }, [state?.you?.challenge?.currentQuestion?.id]);

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

  function handleOptIntoChallenge() {
    postAction("challenge/opt-in", { playerId }, "Kunne ikke deltage i udfordringen");
  }

  function handleSubmitChallengeAnswer() {
    const questionId = state?.you?.challenge?.currentQuestion?.id;
    if (!questionId || !challengeOptionId) return;
    postAction(
      "challenge/answer",
      { playerId, questionId, selectedOptionId: challengeOptionId },
      "Kunne ikke indsende svar",
    );
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
        <p className="text-muted">
          Spillet <span className="font-mono">{code}</span> findes ikke (eller er slut).
        </p>
        <button onClick={() => router.push("/party")} className="text-sm text-accent hover:underline">
          Tilbage til start
        </button>
      </div>
    );
  }

  if (!playerId) {
    return (
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <h1 className="font-display text-xl font-bold">
          Deltag i spil <span className="font-mono">{code}</span>
        </h1>
        <input
          placeholder="Dit navn"
          value={joinName}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setJoinName(event.target.value)}
          autoFocus
          className={textInput}
        />
        {joinError && <p className="text-sm text-danger">{joinError}</p>}
        <button type="submit" disabled={joining || !joinName.trim()} className={primaryButton}>
          Deltag
        </button>
      </form>
    );
  }

  if (!state) {
    return <p className="text-muted">Indlæser…</p>;
  }

  const you = state.players.find((p) => p.seat === state.you?.seat) ?? null;
  const isLastRound = state.roundIndex + 1 >= state.totalRounds;

  return (
    <div className="flex flex-col gap-6">
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {state.status === "lobby" && (
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="text-sm text-muted">Del denne kode</p>
          <p className="font-mono text-5xl font-bold tracking-[0.3em] text-accent-2 [text-shadow:0_0_30px_rgba(198,255,61,.35)]">
            {code}
          </p>
          <ul className="flex w-full flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => i + 1).map((seat) => {
              const player = state.players.find((p) => p.seat === seat);
              return (
                <li
                  key={seat}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[15px] ${
                    player
                      ? "border-[1.5px] border-border bg-surface text-foreground"
                      : "border-[1.5px] border-dashed border-border text-faint"
                  }`}
                >
                  {player ? (
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] font-display font-bold ${
                        seat === 1 ? "bg-accent-2 text-accent-2-foreground" : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {player.name[0]?.toUpperCase()}
                    </span>
                  ) : (
                    <span className="size-8 shrink-0" />
                  )}
                  {player ? `${player.name}${seat === 1 ? " (vært)" : ""}` : "venter på spiller…"}
                </li>
              );
            })}
          </ul>
          {state.isHost ? (
            <button onClick={handleStart} disabled={actionPending} className={`w-full ${primaryButton}`}>
              Start afstemning
            </button>
          ) : (
            <p className="text-sm text-muted">Venter på, at værten starter…</p>
          )}
        </div>
      )}

      {state.status === "voting" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-mono text-[13px] tracking-wide text-accent">
            RUNDE {state.roundIndex + 1} AF {state.totalRounds}
          </p>
          <h2 className="font-display text-[30px] font-extrabold tracking-tight">Stem om en kategori</h2>
          <div className="flex w-full flex-col gap-2.5">
            {state.categoryChoices.map((tag) => {
              const selected = state.you?.votedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleVote(tag)}
                  disabled={actionPending || Boolean(state.you?.votedTag)}
                  className={`flex items-center justify-between rounded-2xl border-[1.5px] px-5 py-4 font-display text-lg font-bold capitalize transition disabled:cursor-not-allowed ${
                    selected
                      ? "border-accent-2 bg-accent-2/10"
                      : "border-border bg-surface enabled:hover:bg-surface-2"
                  }`}
                >
                  <span>{tag.replace(/-/g, " ")}</span>
                  {selected && <span className="text-xl text-accent-2">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <span className="h-1.5 w-1.5 animate-kz-blink rounded-full bg-accent-2" />
            <span className="font-mono text-foreground">
              {state.players.filter((p) => p.hasVoted).length} / {state.players.length}
            </span>{" "}
            har stemt
          </div>
        </div>
      )}

      {state.status === "playing" && state.currentQuestion && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between font-mono text-[11px] tracking-wide text-faint">
            <span>
              RUNDE {state.roundIndex + 1}/{state.totalRounds} · {state.category?.replace(/-/g, " ").toUpperCase()}
            </span>
            <span>
              SPM {state.questionIndexInRound + 1}/{state.questionsInCurrentRound}
            </span>
          </div>

          <div className="flex justify-center">
            <CountdownRing seconds={questionSecondsLeft} max={QUESTION_TIMER_SECONDS} />
          </div>

          {you?.hasAnsweredCurrent ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-border bg-surface p-5 text-center">
              <span className="text-2xl">✅</span>
              <div className="font-display text-lg font-bold">Svar indsendt</div>
              <div className="text-sm text-muted">
                Venter på {state.players.filter((p) => !p.hasAnsweredCurrent).length} spiller(e) mere…
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-center font-display text-[22px] font-bold leading-tight tracking-tight">
                {state.currentQuestion.prompt}
              </h2>
              <div className="flex flex-col gap-2.5">
                {state.currentQuestion.options.map((option) => {
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
                        name="option"
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
                onClick={handleSubmitAnswer}
                disabled={actionPending || !selectedOptionId}
                className={primaryButton}
              >
                Indsend
              </button>
            </>
          )}
        </div>
      )}

      {state.status === "round-summary" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">🏁</div>
          <h2 className="font-display text-[30px] font-extrabold tracking-tight">
            Runde {state.roundIndex + 1} færdig!
          </h2>
          <Scoreboard players={state.players} showChallengeBadges={state.mode === "party"} />

          {state.mode === "party" && (
            <ChallengePanel
              challenge={state.you?.challenge ?? null}
              secondsLeft={challengeSecondsLeft}
              selectedOptionId={challengeOptionId}
              onSelectOption={setChallengeOptionId}
              onOptIn={handleOptIntoChallenge}
              onSubmit={handleSubmitChallengeAnswer}
              actionPending={actionPending}
            />
          )}

          {state.isHost ? (
            <button onClick={handleAdvanceRound} disabled={actionPending} className={`w-full ${primaryButton}`}>
              {isLastRound ? "Se det endelige resultat" : "Start næste runde"}
            </button>
          ) : (
            <p className="text-sm text-muted">Venter på, at værten fortsætter…</p>
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
          <div className="text-[44px]">🏆</div>
          <h2 className="font-display text-[30px] font-extrabold tracking-tight">Spillet er slut!</h2>
          {state.tiebreak && (
            <TiebreakReveal tiebreak={state.tiebreak} players={state.players} winnerSeats={state.winnerSeats} />
          )}
          <Scoreboard players={state.players} winnerSeats={state.winnerSeats} />
          <button onClick={handlePlayAgain} className="text-sm text-accent hover:underline">
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
      <div className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-danger">
        ⚡ OMKAMP
      </div>
      <p className="text-[15px] leading-snug text-muted">
        <span className="font-semibold text-accent-2">{tiedNames}</span> er lige om førstepladsen — nærmeste gæt
        vinder!
      </p>

      <div className="flex justify-center">
        <CountdownRing seconds={secondsLeft} max={TIEBREAK_TIMER_SECONDS} size={104} />
      </div>

      <h2 className="font-display text-xl font-bold leading-tight tracking-tight">{tiebreak.prompt}</h2>

      {isParticipant ? (
        hasAnswered ? (
          <div className="flex w-full flex-col gap-1.5 rounded-2xl border-[1.5px] border-border bg-surface p-5 text-left">
            <div className="font-display text-[17px] font-bold">Gæt indsendt ✅</div>
            <div className="text-sm text-muted">
              Venter på {answeredCount < tiebreak.participantSeats.length ? "de andre spillere, der er lige med dig" : "resultatet"}…
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Dit gæt"
              value={guess}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onGuessChange(event.target.value)}
              autoFocus
              className={`${textInput} text-center font-mono text-2xl font-bold`}
            />
            <button type="submit" disabled={submitDisabled || guess.trim() === ""} className={primaryButton}>
              Indsend gæt
            </button>
          </form>
        )
      ) : (
        <p className="w-full rounded-2xl border border-dashed border-border bg-[color-mix(in_srgb,var(--surface)_65%,transparent)] p-5 text-left text-sm leading-snug text-muted">
          👀 Du er ikke lige med om førstepladsen — du kan følge med, men kun{" "}
          <span className="font-semibold text-accent-2">{tiedNames}</span> kan svare på denne.
        </p>
      )}
    </div>
  );
}

function TiebreakReveal({
  tiebreak,
  players,
  winnerSeats,
}: {
  tiebreak: TiebreakView;
  players: PlayerView[];
  winnerSeats: number[];
}) {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">Omkamp</p>
      <p className="text-[13px] leading-snug text-muted">{tiebreak.prompt}</p>
      <div className="flex items-center justify-between rounded-xl border border-accent-2/25 bg-accent-2/10 px-3.5 py-2.5">
        <span className="text-[13px] font-semibold text-accent-2">Referencesvar</span>
        <span className="font-mono text-xl font-bold text-accent-2">{tiebreak.answer}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {tiebreak.guesses.map((g) => {
          const isClosest = winnerSeats.includes(g.seat) && g.guess !== null;
          return (
            <li key={g.seat} className="flex items-center justify-between px-0.5 py-1 text-sm">
              <span className="flex items-center gap-2">
                <span>{players.find((p) => p.seat === g.seat)?.name ?? `Plads ${g.seat}`}</span>
                {isClosest && <span className="text-xs font-semibold text-accent-2">nærmest</span>}
              </span>
              <span className="font-mono text-muted">{g.guess ?? "intet gæt"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Scoreboard({
  players,
  winnerSeats,
  showChallengeBadges = false,
}: {
  players: PlayerView[];
  winnerSeats?: number[];
  showChallengeBadges?: boolean;
}) {
  const ranked = players.slice().sort((a, b) => b.scorePoints - a.scorePoints);
  const topScore = ranked[0]?.scorePoints;
  return (
    <ul className="flex w-full flex-col gap-1.5">
      {ranked.map((player, index) => {
        const isWinner = winnerSeats ? winnerSeats.includes(player.seat) : false;
        const isLeader = !winnerSeats?.length && topScore > 0 && player.scorePoints === topScore;
        return (
          <li
            key={player.seat}
            className={`flex items-center justify-between rounded-xl border-[1.5px] px-4 py-3 ${
              isWinner ? "border-accent-2 bg-accent-2/10" : "border-border bg-surface"
            }`}
          >
            <span className="flex items-center gap-2.5 text-[15px]">
              <span className="font-mono text-xs text-faint">{index + 1}</span>
              <span className="font-medium text-foreground">{player.name}</span>
              {showChallengeBadges && player.challengeStatus !== "none" && (
                <span className="text-xs" title="Udfordring">
                  {player.challengeStatus === "in-progress" && "🍻"}
                  {player.challengeStatus === "success" && "🍻✅"}
                  {player.challengeStatus === "failed" && "🍻❌"}
                </span>
              )}
              {(isWinner || isLeader) && (
                <span className="text-xs font-semibold text-accent-2">{isWinner ? "vinder" : "fører"}</span>
              )}
            </span>
            <span className="font-mono font-bold text-foreground">
              {player.scorePoints} <span className="text-[11px] font-medium text-faint">point</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ChallengePanel({
  challenge,
  secondsLeft,
  selectedOptionId,
  onSelectOption,
  onOptIn,
  onSubmit,
  actionPending,
}: {
  challenge: ChallengeView | null;
  secondsLeft: number | null;
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
  onOptIn: () => void;
  onSubmit: () => void;
  actionPending: boolean;
}) {
  if (!challenge) {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-accent-2/30 bg-accent-2/5 p-5 text-center">
        <span className="text-2xl">🍻</span>
        <p className="text-sm leading-snug text-muted">
          Udfordring: {QUESTIONS_PER_CHALLENGE} spørgsmål — svar rigtigt på alle og få et ekstra point. Kræver 2
          slurke for at deltage.
        </p>
        <button
          onClick={onOptIn}
          disabled={actionPending}
          className="w-full rounded-xl bg-accent-2 px-5 py-3.5 font-display font-bold text-accent-2-foreground transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Deltag i udfordringen
        </button>
      </div>
    );
  }

  if (challenge.completed) {
    return (
      <div
        className={`flex w-full flex-col items-center gap-1 rounded-2xl border-[1.5px] p-5 text-center ${
          challenge.correct ? "border-accent-2 bg-accent-2/10" : "border-border bg-surface"
        }`}
      >
        <span className="text-2xl">{challenge.correct ? "✅" : "❌"}</span>
        <div className="font-display text-lg font-bold">
          {challenge.correct ? "Rigtigt! +1 bonuspoint" : "Ikke helt — ingen bonus denne gang"}
        </div>
      </div>
    );
  }

  if (!challenge.currentQuestion) return null;

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border-[1.5px] border-accent-2/30 bg-accent-2/5 p-5">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-wide text-faint">
        <span>🍻 UDFORDRING</span>
        <span>
          SPM {challenge.questionIndex + 1}/{challenge.totalQuestions}
        </span>
      </div>
      <div className="flex justify-center">
        <CountdownRing seconds={secondsLeft} max={QUESTION_TIMER_SECONDS} size={90} />
      </div>
      <h3 className="text-center font-display text-lg font-bold leading-tight">{challenge.currentQuestion.prompt}</h3>
      <div className="flex flex-col gap-2">
        {challenge.currentQuestion.options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-[15px] transition ${
                selected ? "border-accent-2 bg-accent-2/15" : "border-border bg-surface"
              }`}
            >
              <input
                type="radio"
                name="challenge-option"
                value={option.id}
                checked={selected}
                onChange={() => onSelectOption(option.id)}
                className="sr-only"
              />
              <span
                className={`flex size-[20px] shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-accent-2" : "border-white/30"
                }`}
              >
                {selected && <span className="size-2 rounded-full bg-accent-2" />}
              </span>
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
      <button
        onClick={onSubmit}
        disabled={actionPending || !selectedOptionId}
        className="rounded-xl bg-accent-2 px-5 py-3.5 font-display font-bold text-accent-2-foreground transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Indsend
      </button>
    </div>
  );
}
