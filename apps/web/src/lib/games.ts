import type { Answer, PublicQuestion, Quiz } from "@quiz/core";
import { scoreQuiz, toPublicQuiz } from "@quiz/core";
import { prisma } from "./db";
import { recordAnswerEvent, recordGameCompletion, type GameContext } from "./achievements";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity
const CODE_LENGTH = 5;
export const MAX_PLAYERS = 6;
export const CATEGORY_CHOICES_COUNT = 3;
export const QUESTIONS_PER_ROUND = 5;
export const TOTAL_ROUNDS = 3;
export const QUESTION_TIMER_SECONDS = 30;
export const TIEBREAK_TIMER_SECONDS = 45;
export const QUESTIONS_PER_CHALLENGE = 3;

export type GameStatus = "lobby" | "voting" | "playing" | "round-summary" | "tiebreak" | "completed";
export type GameMode = "regular" | "party";
export type ChallengeStatus = "none" | "in-progress" | "success" | "failed";

/** Persisted shape of GamePlayer.challenge — a private, per-player drinking-game side quest. */
interface ChallengeState {
  roundIndex: number;
  questionIds: string[];
  answers: Answer[];
  questionStartedAt: string;
  completed: boolean;
  correct: boolean | null;
}

export interface PlayerChallengeView {
  questionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null;
  secondsRemaining: number | null;
  completed: boolean;
  correct: boolean | null;
}

export interface PlayerView {
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

export interface TiebreakGuessView {
  seat: number;
  hasAnswered: boolean;
  guess: number | null;
}

export interface TiebreakView {
  prompt: string;
  participantSeats: number[];
  secondsRemaining: number | null;
  // The reference answer, revealed only once the tiebreak is resolved.
  answer: number | null;
  guesses: TiebreakGuessView[];
}

export interface GameStateView {
  code: string;
  mode: GameMode;
  status: GameStatus;
  players: PlayerView[];
  categoryChoices: string[];
  category: string | null;
  roundIndex: number;
  totalRounds: number;
  questionsPerRound: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  // The current round's actual size — usually questionsPerRound, but can be
  // smaller if the winning category had fewer questions available.
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
    challenge: PlayerChallengeView | null;
  } | null;
  isHost: boolean;
}

function generateGameCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Tags with at least `minCount` questions — offering a thinner tag would mean a short (or, worst case, empty) round. */
async function listTagsWithAtLeast(minCount: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tag: string }[]>`
    SELECT tag FROM (SELECT unnest(tags) AS tag FROM "Question") t
    GROUP BY tag
    HAVING count(*) >= ${minCount}
  `;
  return rows.map((r) => r.tag);
}

/** 3 random tags for the next round's vote, preferring ones not already won in this game. */
async function pickCategoryChoices(usedTags: string[]): Promise<string[]> {
  const allTags = await listTagsWithAtLeast(QUESTIONS_PER_ROUND);
  const unused = allTags.filter((tag) => !usedTags.includes(tag));
  const pool = unused.length >= CATEGORY_CHOICES_COUNT ? unused : allTags;
  return shuffle(pool).slice(0, CATEGORY_CHOICES_COUNT);
}

async function drawQuestionIdsForTag(tag: string, excludeIds: string[]): Promise<string[]> {
  const questions = await prisma.question.findMany({
    where: { tags: { has: tag }, id: { notIn: excludeIds } },
    select: { id: true },
  });
  return shuffle(questions.map((q) => q.id)).slice(0, QUESTIONS_PER_ROUND);
}

/** Random questions from anywhere in the archive (any category), for a drinking-game challenge. */
async function drawChallengeQuestionIds(excludeIds: string[]): Promise<string[]> {
  const questions = await prisma.question.findMany({
    // Untagged questions (e.g. the fixed "Test Example" quiz) are kept out
    // of the main category draw on purpose — exclude them here too so a
    // challenge can't surface content that was never meant for party mode.
    where: { id: { notIn: excludeIds }, tags: { isEmpty: false } },
    select: { id: true },
  });
  return shuffle(questions.map((q) => q.id)).slice(0, QUESTIONS_PER_CHALLENGE);
}

async function pickRandomTiebreakerQuestion() {
  const count = await prisma.tiebreakerQuestion.count();
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const [question] = await prisma.tiebreakerQuestion.findMany({ skip, take: 1 });
  return question ?? null;
}

/** Builds a quiz-core Quiz (with real correctOptionId) from a session's drawn question ids, for scoring/serving. */
async function buildQuizFromQuestionIds(sessionId: string, questionIds: string[]): Promise<Quiz> {
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { options: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  return {
    id: sessionId,
    title: "Game",
    questions: questionIds.flatMap((id) => {
      const question = byId.get(id);
      if (!question) return [];
      return [
        {
          id: question.id,
          prompt: question.prompt,
          points: question.points,
          correctOptionId: question.correctOptionId,
          tags: question.tags,
          options: question.options
            .slice()
            .sort((a, b) => a.value.localeCompare(b.value))
            .map((option) => ({ id: option.value, text: option.text })),
        },
      ];
    }),
  };
}

async function generateUniqueGameCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateGameCode();
    const existing = await prisma.gameSession.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique game code");
}

type SessionWithPlayers = NonNullable<Awaited<ReturnType<typeof fetchSessionWithPlayers>>>;

function fetchSessionWithPlayers(code: string) {
  return prisma.gameSession.findUnique({
    where: { code },
    include: { players: { orderBy: { seat: "asc" } }, tiebreakerQuestion: true },
  });
}

export async function createGame(
  hostName: string,
  mode: GameMode = "regular",
  hostUserId?: string,
): Promise<{ code: string; playerId: string }> {
  const code = await generateUniqueGameCode();
  const session = await prisma.gameSession.create({
    data: {
      code,
      mode,
      players: { create: [{ seat: 1, name: hostName.trim() || "Player 1", userId: hostUserId }] },
    },
    include: { players: true },
  });
  return { code: session.code, playerId: session.players[0].id };
}

export type JoinGameResult =
  | { ok: true; playerId: string; seat: number }
  | { ok: false; error: "not_found" | "already_started" | "full" | "seat_conflict" };

export async function joinGame(code: string, name: string, userId?: string): Promise<JoinGameResult> {
  const session = await prisma.gameSession.findUnique({ where: { code }, include: { players: true } });
  if (!session) return { ok: false, error: "not_found" };
  if (session.status !== "lobby") return { ok: false, error: "already_started" };
  if (session.players.length >= MAX_PLAYERS) return { ok: false, error: "full" };

  const takenSeats = new Set(session.players.map((p) => p.seat));
  let seat = 1;
  while (takenSeats.has(seat)) seat++;
  if (seat > MAX_PLAYERS) return { ok: false, error: "full" };

  try {
    const player = await prisma.gamePlayer.create({
      data: { sessionId: session.id, seat, name: name.trim() || `Player ${seat}`, userId },
    });
    return { ok: true, playerId: player.id, seat };
  } catch {
    // Unique (sessionId, seat) constraint hit — another player took this seat
    // in a race; ask the client to retry the join rather than fail hard.
    return { ok: false, error: "seat_conflict" };
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function startVoting(code: string, playerId: string): Promise<ActionResult> {
  const session = await prisma.gameSession.findUnique({ where: { code }, include: { players: true } });
  if (!session) return { ok: false, error: "not_found" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };
  if (player.seat !== 1) return { ok: false, error: "not_host" };
  if (session.status !== "lobby") return { ok: false, error: "already_started" };

  const categoryChoices = await pickCategoryChoices([]);
  if (categoryChoices.length === 0) return { ok: false, error: "no_categories_available" };

  await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: "voting", categoryChoices },
  });
  return { ok: true };
}

async function tallyVotesAndStartPlaying(session: SessionWithPlayers, votes: string[]): Promise<void> {
  const counts = new Map<string, number>();
  for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);
  const max = Math.max(...counts.values());
  const winners = Array.from(counts.entries())
    .filter(([, count]) => count === max)
    .map(([tag]) => tag);
  const winner = winners[Math.floor(Math.random() * winners.length)];

  const drawn = await drawQuestionIdsForTag(winner, session.questionIds);
  const questionIds = [...session.questionIds, ...drawn];
  const usedTags = [...session.usedTags, winner];
  const roundStartIndex = session.questionIds.length;

  // Guard on status still being "voting" so a concurrent last-vote race
  // doesn't tally (and redraw questions) twice for the same session.
  await prisma.gameSession.updateMany({
    where: { id: session.id, status: "voting" },
    data: {
      status: "playing",
      category: winner,
      questionIds,
      usedTags,
      currentQuestionIndex: roundStartIndex,
      roundStartIndex,
      questionStartedAt: new Date(),
    },
  });
}

export async function castVote(code: string, playerId: string, tag: string): Promise<ActionResult> {
  const session = await fetchSessionWithPlayers(code);
  if (!session) return { ok: false, error: "not_found" };
  if (session.status !== "voting") return { ok: false, error: "not_voting" };
  if (!session.categoryChoices.includes(tag)) return { ok: false, error: "invalid_category" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };
  if (player.votedTag === tag) return { ok: true }; // idempotent re-click/retry

  await prisma.gamePlayer.update({ where: { id: playerId }, data: { votedTag: tag } });

  // Re-read after writing rather than reusing the snapshot fetched at the
  // top of this call — two votes landing close together could otherwise
  // each see the *other* as not-yet-voted (both fetched before either
  // write completed) and neither would trigger the tally, permanently
  // stalling the game in "voting". The guarded updateMany in
  // tallyVotesAndStartPlaying already makes it safe if both requests end
  // up calling this.
  const freshPlayers = await prisma.gamePlayer.findMany({ where: { sessionId: session.id } });
  const allVoted = freshPlayers.every((p) => p.votedTag);
  if (allVoted) {
    await tallyVotesAndStartPlaying(session, freshPlayers.map((p) => p.votedTag as string));
  }
  return { ok: true };
}

/**
 * After a question resolves (everyone answered, or its timer ran out): advance within the round, or end the round.
 * `totalQuestionIds` is the round's end boundary — a round isn't guaranteed to be exactly QUESTIONS_PER_ROUND long
 * (a thin category tag can have fewer available questions), so this must come from questionIds.length, not
 * roundIndex * QUESTIONS_PER_ROUND.
 */
async function advanceAfterQuestion(
  sessionId: string,
  currentQuestionIndex: number,
  totalQuestionIds: number,
): Promise<void> {
  const nextIndex = currentQuestionIndex + 1;
  const finishedRound = nextIndex >= totalQuestionIds;

  // Guard on currentQuestionIndex still matching so a concurrent race (two
  // pollers both observing the timeout, or a timeout racing a last-answer)
  // doesn't advance the session twice.
  await prisma.gameSession.updateMany({
    where: { id: sessionId, status: "playing", currentQuestionIndex },
    data: finishedRound
      ? { status: "round-summary", currentQuestionIndex: nextIndex }
      : { currentQuestionIndex: nextIndex, questionStartedAt: new Date() },
  });
}

export async function submitAnswer(
  code: string,
  playerId: string,
  questionId: string,
  selectedOptionId: string,
): Promise<ActionResult> {
  const session = await prisma.gameSession.findUnique({ where: { code }, include: { players: true } });
  if (!session) return { ok: false, error: "not_found" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };

  // A duplicate/retried submission for a question this player has already
  // recorded an answer for is a harmless no-op — checked before the
  // current-question check so a request that's merely arrived late (e.g. a
  // double-click that raced the round advancing past this question) isn't
  // treated as an error.
  const existingAnswers = (player.answers as unknown as Answer[]) ?? [];
  if (existingAnswers.some((a) => a.questionId === questionId)) {
    return { ok: true };
  }

  if (session.status !== "playing") return { ok: false, error: "not_playing" };
  const currentQuestionId = session.questionIds[session.currentQuestionIndex];
  if (questionId !== currentQuestionId) return { ok: false, error: "not_current_question" };

  const updatedAnswers: Answer[] = [...existingAnswers, { questionId, selectedOptionId }];
  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: { answers: updatedAnswers as object },
  });

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { tags: true, correctOptionId: true },
  });
  if (question) {
    await recordAnswerEvent({
      userId: player.userId,
      mode: session.mode as GameMode,
      gameKey: session.id,
      tags: question.tags,
      correct: question.correctOptionId === selectedOptionId,
      timeTakenMs: session.questionStartedAt ? Date.now() - session.questionStartedAt.getTime() : null,
    });
  }

  // Re-read after writing rather than reusing the snapshot fetched at the
  // top of this call — see castVote for why (two answers landing close
  // together could otherwise each miss the other's write and neither would
  // advance the question).
  const freshPlayers = await prisma.gamePlayer.findMany({ where: { sessionId: session.id } });
  const allAnswered = freshPlayers.every((p) => {
    const answers = (p.answers as unknown as Answer[]) ?? [];
    return answers.some((a) => a.questionId === questionId);
  });

  if (allAnswered) {
    await advanceAfterQuestion(session.id, session.currentQuestionIndex, session.questionIds.length);
  }

  return { ok: true };
}

/** Host-triggered: leave the post-round scoreboard, either into the next round's vote or into game-end finalization. */
export async function advanceRound(code: string, playerId: string): Promise<ActionResult> {
  const session = await fetchSessionWithPlayers(code);
  if (!session) return { ok: false, error: "not_found" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };
  if (player.seat !== 1) return { ok: false, error: "not_host" };
  if (session.status !== "round-summary") return { ok: false, error: "not_round_summary" };

  const isLastRound = session.roundIndex + 1 >= TOTAL_ROUNDS;
  if (!isLastRound) {
    const categoryChoices = await pickCategoryChoices(session.usedTags);
    await prisma.$transaction([
      prisma.gameSession.updateMany({
        where: { id: session.id, status: "round-summary" },
        data: { status: "voting", roundIndex: session.roundIndex + 1, categoryChoices, category: null },
      }),
      prisma.gamePlayer.updateMany({ where: { sessionId: session.id }, data: { votedTag: null } }),
    ]);
    return { ok: true };
  }

  await finalizeGame(session);
  return { ok: true };
}

/** Host-turned-drinking-game side quest: opt in for a shot at +1 bonus point between rounds. Party mode only. */
export async function optIntoChallenge(code: string, playerId: string): Promise<ActionResult> {
  const session = await fetchSessionWithPlayers(code);
  if (!session) return { ok: false, error: "not_found" };
  if (session.mode !== "party") return { ok: false, error: "not_party_mode" };
  if (session.status !== "round-summary") return { ok: false, error: "not_round_summary" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };

  const existing = player.challenge as unknown as ChallengeState | null;
  if (existing && existing.roundIndex === session.roundIndex) {
    return { ok: true }; // idempotent re-click/retry
  }

  const excludeIds = [...session.questionIds, ...session.usedChallengeQuestionIds];
  const questionIds = await drawChallengeQuestionIds(excludeIds);
  if (questionIds.length === 0) return { ok: false, error: "no_questions_available" };

  const challenge: ChallengeState = {
    roundIndex: session.roundIndex,
    questionIds,
    answers: [],
    questionStartedAt: new Date().toISOString(),
    completed: false,
    correct: null,
  };

  await prisma.$transaction([
    prisma.gamePlayer.update({ where: { id: playerId }, data: { challenge: challenge as object } }),
    prisma.gameSession.update({
      where: { id: session.id },
      data: { usedChallengeQuestionIds: [...session.usedChallengeQuestionIds, ...questionIds] },
    }),
  ]);

  return { ok: true };
}

export async function submitChallengeAnswer(
  code: string,
  playerId: string,
  questionId: string,
  selectedOptionId: string,
): Promise<ActionResult> {
  const session = await prisma.gameSession.findUnique({ where: { code }, include: { players: true } });
  if (!session) return { ok: false, error: "not_found" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };

  const challenge = player.challenge as unknown as ChallengeState | null;
  if (!challenge || challenge.roundIndex !== session.roundIndex || challenge.completed) {
    return { ok: false, error: "no_active_challenge" };
  }
  if (session.status !== "round-summary") return { ok: false, error: "not_round_summary" };

  // Duplicate/retried submission for a question already recorded is a
  // harmless no-op, same reasoning as submitAnswer above.
  if (challenge.answers.some((a) => a.questionId === questionId)) {
    return { ok: true };
  }

  const currentQuestionId = challenge.questionIds[challenge.answers.length];
  if (questionId !== currentQuestionId) return { ok: false, error: "not_current_question" };

  if (Date.now() - new Date(challenge.questionStartedAt).getTime() > QUESTION_TIMER_SECONDS * 1000) {
    // Timer already ran out server-side — fail the challenge rather than
    // accept a late answer racing the timeout.
    await prisma.gamePlayer.update({
      where: { id: playerId },
      data: { challenge: { ...challenge, completed: true, correct: false } as object },
    });
    return { ok: false, error: "challenge_expired" };
  }

  const updatedAnswers: Answer[] = [...challenge.answers, { questionId, selectedOptionId }];
  const isLastQuestion = updatedAnswers.length >= challenge.questionIds.length;

  if (!isLastQuestion) {
    await prisma.gamePlayer.update({
      where: { id: playerId },
      data: {
        challenge: {
          ...challenge,
          answers: updatedAnswers,
          questionStartedAt: new Date().toISOString(),
        } as object,
      },
    });
    return { ok: true };
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: challenge.questionIds } },
    select: { id: true, correctOptionId: true },
  });
  const correctOptionById = new Map(questions.map((q) => [q.id, q.correctOptionId]));
  const allCorrect = updatedAnswers.every((a) => correctOptionById.get(a.questionId) === a.selectedOptionId);

  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: {
      challenge: { ...challenge, answers: updatedAnswers, completed: true, correct: allCorrect } as object,
      bonusPoints: allCorrect ? { increment: 1 } : undefined,
    },
  });

  return { ok: true };
}

/** Builds the achievement event's game snapshot — every player's final score/accuracy plus who won. */
async function buildGameContext(session: SessionWithPlayers, winnerSeats: number[]): Promise<GameContext> {
  const quiz = await buildQuizFromQuestionIds(session.id, session.questionIds);
  return {
    gameKey: session.id,
    mode: session.mode as GameMode,
    usedTags: session.usedTags,
    winnerSeats,
    players: session.players.map((p) => {
      const answers = (p.answers as unknown as Answer[]) ?? [];
      const scored = scoreQuiz(quiz, answers);
      return {
        seat: p.seat,
        userId: p.userId,
        score: scored.scorePoints + p.bonusPoints,
        correctCount: scored.correctCount,
        totalQuestions: quiz.questions.length,
      };
    }),
  };
}

async function finalizeGame(session: SessionWithPlayers): Promise<void> {
  const quiz = await buildQuizFromQuestionIds(session.id, session.questionIds);
  const scoreBySeat = new Map(
    session.players.map((p) => {
      const answers = (p.answers as unknown as Answer[]) ?? [];
      return [p.seat, scoreQuiz(quiz, answers).scorePoints + p.bonusPoints] as const;
    }),
  );
  const topScore = Math.max(...scoreBySeat.values());
  const topSeats = Array.from(scoreBySeat.entries())
    .filter(([, score]) => score === topScore)
    .map(([seat]) => seat);

  if (topSeats.length === 1) {
    const result = await prisma.gameSession.updateMany({
      where: { id: session.id, status: "round-summary" },
      data: { status: "completed", winnerSeats: topSeats },
    });
    if (result.count > 0) await recordGameCompletion(await buildGameContext(session, topSeats));
    return;
  }

  const tiebreaker = await pickRandomTiebreakerQuestion();
  if (!tiebreaker) {
    // No tiebreaker content configured — fall back to a random pick among
    // the tied players rather than leaving the game stuck with no winner.
    const winner = topSeats[Math.floor(Math.random() * topSeats.length)];
    const result = await prisma.gameSession.updateMany({
      where: { id: session.id, status: "round-summary" },
      data: { status: "completed", winnerSeats: [winner] },
    });
    if (result.count > 0) await recordGameCompletion(await buildGameContext(session, [winner]));
    return;
  }

  await prisma.gameSession.updateMany({
    where: { id: session.id, status: "round-summary" },
    data: {
      status: "tiebreak",
      tiebreakerQuestionId: tiebreaker.id,
      tiebreakSeats: topSeats,
      tiebreakAnswers: {},
      tiebreakStartedAt: new Date(),
    },
  });
}

async function resolveTiebreak(session: SessionWithPlayers): Promise<void> {
  const answers = (session.tiebreakAnswers as Record<string, number>) ?? {};
  const answeredSeats = session.tiebreakSeats.filter((seat) => answers[String(seat)] !== undefined);

  let winnerSeat: number;
  if (answeredSeats.length === 0) {
    // Nobody answered before the timer ran out — pick randomly among the
    // tied players rather than leaving the game stuck forever.
    winnerSeat = session.tiebreakSeats[Math.floor(Math.random() * session.tiebreakSeats.length)];
  } else {
    const target = session.tiebreakerQuestion?.answer ?? 0;
    winnerSeat = answeredSeats.reduce((best, seat) => {
      const bestDiff = Math.abs(answers[String(best)] - target);
      const diff = Math.abs(answers[String(seat)] - target);
      return diff < bestDiff ? seat : best;
    }, answeredSeats[0]);
  }

  const result = await prisma.gameSession.updateMany({
    where: { id: session.id, status: "tiebreak" },
    data: { status: "completed", winnerSeats: [winnerSeat] },
  });
  if (result.count > 0) await recordGameCompletion(await buildGameContext(session, [winnerSeat]));
}

export async function submitTiebreakAnswer(code: string, playerId: string, guess: number): Promise<ActionResult> {
  if (!Number.isFinite(guess)) return { ok: false, error: "invalid_guess" };

  const session = await fetchSessionWithPlayers(code);
  if (!session) return { ok: false, error: "not_found" };
  if (session.status !== "tiebreak") return { ok: false, error: "not_tiebreak" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };
  if (!session.tiebreakSeats.includes(player.seat)) return { ok: false, error: "not_a_tiebreak_participant" };

  const answers = (session.tiebreakAnswers as Record<string, number>) ?? {};
  if (answers[String(player.seat)] !== undefined) return { ok: false, error: "already_answered" };

  const updatedAnswers = { ...answers, [String(player.seat)]: guess };
  const updateResult = await prisma.gameSession.updateMany({
    where: { id: session.id, status: "tiebreak" },
    data: { tiebreakAnswers: updatedAnswers },
  });
  if (updateResult.count === 0) return { ok: false, error: "not_tiebreak" };

  const allAnswered = session.tiebreakSeats.every((seat) => updatedAnswers[String(seat)] !== undefined);
  if (allAnswered) {
    await resolveTiebreak({ ...session, tiebreakAnswers: updatedAnswers });
  }
  return { ok: true };
}

export async function getGameState(code: string, viewerPlayerId?: string): Promise<GameStateView | null> {
  let session = await fetchSessionWithPlayers(code);
  if (!session) return null;

  // Self-healing timeouts: normally a poller observes the timer expiring
  // and this advances the game, but if every client stopped polling for a
  // while (phones locked, tab backgrounded) this catches up in one go
  // rather than leaving the session stuck on a stale question.
  while (
    session.status === "playing" &&
    session.questionStartedAt &&
    Date.now() - session.questionStartedAt.getTime() > QUESTION_TIMER_SECONDS * 1000
  ) {
    await advanceAfterQuestion(session.id, session.currentQuestionIndex, session.questionIds.length);
    session = await fetchSessionWithPlayers(code);
    if (!session) return null;
  }
  if (
    session.status === "tiebreak" &&
    session.tiebreakStartedAt &&
    Date.now() - session.tiebreakStartedAt.getTime() > TIEBREAK_TIMER_SECONDS * 1000
  ) {
    await resolveTiebreak(session);
    session = await fetchSessionWithPlayers(code);
    if (!session) return null;
  }

  const quiz =
    session.questionIds.length > 0 ? await buildQuizFromQuestionIds(session.id, session.questionIds) : null;
  const publicQuiz = quiz ? toPublicQuiz(quiz) : null;
  const currentQuestionId = session.questionIds[session.currentQuestionIndex];

  const viewer = viewerPlayerId ? session.players.find((p) => p.id === viewerPlayerId) : undefined;

  // The viewer's own challenge is self-healed lazily on their own poll (only
  // they can act on it, so no other viewer's poll needs to know about the
  // timeout) — mirrors the session-wide self-healing loops above, just
  // scoped to one player's private state instead of the shared session.
  let viewerChallenge: ChallengeState | null = null;
  if (viewer) {
    const raw = viewer.challenge as unknown as ChallengeState | null;
    if (raw && raw.roundIndex === session.roundIndex) {
      viewerChallenge = raw;
      if (
        !viewerChallenge.completed &&
        session.status === "round-summary" &&
        Date.now() - new Date(viewerChallenge.questionStartedAt).getTime() > QUESTION_TIMER_SECONDS * 1000
      ) {
        viewerChallenge = { ...viewerChallenge, completed: true, correct: false };
        await prisma.gamePlayer.update({ where: { id: viewer.id }, data: { challenge: viewerChallenge as object } });
      }
    }
  }

  const players: PlayerView[] = session.players.map((p) => {
    const answers = (p.answers as unknown as Answer[]) ?? [];
    const scored = quiz ? scoreQuiz(quiz, answers) : null;
    const challenge = p.id === viewer?.id ? viewerChallenge : (p.challenge as unknown as ChallengeState | null);
    const challengeStatus: ChallengeStatus =
      !challenge || challenge.roundIndex !== session.roundIndex
        ? "none"
        : !challenge.completed
          ? "in-progress"
          : challenge.correct
            ? "success"
            : "failed";
    return {
      seat: p.seat,
      name: p.name,
      hasVoted: Boolean(p.votedTag),
      hasAnsweredCurrent:
        session.status === "playing" ? answers.some((a) => a.questionId === currentQuestionId) : false,
      correctCount: scored?.correctCount ?? 0,
      scorePoints: (scored?.scorePoints ?? 0) + p.bonusPoints,
      inTiebreak: session.tiebreakSeats.includes(p.seat),
      isWinner: session.winnerSeats.includes(p.seat),
      challengeStatus,
    };
  });

  let youChallenge: PlayerChallengeView | null = null;
  if (viewer && viewerChallenge) {
    let currentQuestion: PublicQuestion | null = null;
    if (!viewerChallenge.completed) {
      const challengeQuiz = await buildQuizFromQuestionIds(session.id, viewerChallenge.questionIds);
      const challengePublicQuiz = toPublicQuiz(challengeQuiz);
      const currentId = viewerChallenge.questionIds[viewerChallenge.answers.length];
      currentQuestion = challengePublicQuiz.questions.find((q) => q.id === currentId) ?? null;
    }
    youChallenge = {
      questionIndex: viewerChallenge.answers.length,
      totalQuestions: viewerChallenge.questionIds.length,
      currentQuestion,
      secondsRemaining: viewerChallenge.completed
        ? null
        : Math.max(
            0,
            QUESTION_TIMER_SECONDS -
              Math.floor((Date.now() - new Date(viewerChallenge.questionStartedAt).getTime()) / 1000),
          ),
      completed: viewerChallenge.completed,
      correct: viewerChallenge.correct,
    };
  }

  const questionSecondsRemaining =
    session.status === "playing" && session.questionStartedAt
      ? Math.max(0, QUESTION_TIMER_SECONDS - Math.floor((Date.now() - session.questionStartedAt.getTime()) / 1000))
      : null;

  let tiebreak: TiebreakView | null = null;
  if (session.tiebreakerQuestion && (session.status === "tiebreak" || session.status === "completed")) {
    const resolved = session.status === "completed";
    const answers = (session.tiebreakAnswers as Record<string, number>) ?? {};
    tiebreak = {
      prompt: session.tiebreakerQuestion.prompt,
      participantSeats: session.tiebreakSeats,
      secondsRemaining:
        session.status === "tiebreak" && session.tiebreakStartedAt
          ? Math.max(
              0,
              TIEBREAK_TIMER_SECONDS - Math.floor((Date.now() - session.tiebreakStartedAt.getTime()) / 1000),
            )
          : null,
      answer: resolved ? session.tiebreakerQuestion.answer : null,
      guesses: session.tiebreakSeats.map((seat) => {
        const hasAnswered = answers[String(seat)] !== undefined;
        const visible = resolved || seat === viewer?.seat;
        return { seat, hasAnswered, guess: hasAnswered && visible ? answers[String(seat)] : null };
      }),
    };
  }

  return {
    code: session.code,
    mode: session.mode as GameMode,
    status: session.status as GameStatus,
    players,
    categoryChoices: session.categoryChoices,
    category: session.category,
    roundIndex: session.roundIndex,
    totalRounds: TOTAL_ROUNDS,
    questionsPerRound: QUESTIONS_PER_ROUND,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questionIds.length,
    questionIndexInRound: session.currentQuestionIndex - session.roundStartIndex,
    questionsInCurrentRound: session.questionIds.length - session.roundStartIndex,
    currentQuestion:
      session.status === "playing" && publicQuiz
        ? (publicQuiz.questions.find((q) => q.id === currentQuestionId) ?? null)
        : null,
    questionSecondsRemaining,
    tiebreak,
    winnerSeats: session.winnerSeats,
    you: viewer
      ? {
          seat: viewer.seat,
          votedTag: viewer.votedTag,
          isTiebreakParticipant: session.tiebreakSeats.includes(viewer.seat),
          challenge: youChallenge,
        }
      : null,
    isHost: viewer?.seat === 1,
  };
}
