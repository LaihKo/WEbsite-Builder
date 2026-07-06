import type { Answer, PublicQuestion, Quiz } from "@quiz/core";
import { scoreQuiz, toPublicQuiz } from "@quiz/core";
import { prisma } from "./db";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity
const CODE_LENGTH = 5;
export const MAX_PLAYERS = 6;
export const CATEGORY_CHOICES_COUNT = 3;
export const QUESTIONS_PER_GAME = 8;

export type GameStatus = "lobby" | "voting" | "playing" | "completed";

export interface PlayerView {
  seat: number;
  name: string;
  hasVoted: boolean;
  hasAnsweredCurrent: boolean;
  correctCount: number;
  scorePoints: number;
}

export interface GameStateView {
  code: string;
  status: GameStatus;
  players: PlayerView[];
  categoryChoices: string[];
  category: string | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null;
  you: { seat: number; votedTag: string | null } | null;
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

async function listAllTags(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT unnest(tags) AS tag FROM "Question"
  `;
  return rows.map((r) => r.tag);
}

async function drawQuestionIdsForTag(tag: string): Promise<string[]> {
  const questions = await prisma.question.findMany({
    where: { tags: { has: tag } },
    select: { id: true },
  });
  return shuffle(questions.map((q) => q.id)).slice(0, QUESTIONS_PER_GAME);
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

export async function createGame(hostName: string): Promise<{ code: string; playerId: string }> {
  const code = await generateUniqueGameCode();
  const session = await prisma.gameSession.create({
    data: {
      code,
      players: { create: [{ seat: 1, name: hostName.trim() || "Player 1" }] },
    },
    include: { players: true },
  });
  return { code: session.code, playerId: session.players[0].id };
}

export type JoinGameResult =
  | { ok: true; playerId: string; seat: number }
  | { ok: false; error: "not_found" | "already_started" | "full" | "seat_conflict" };

export async function joinGame(code: string, name: string): Promise<JoinGameResult> {
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
      data: { sessionId: session.id, seat, name: name.trim() || `Player ${seat}` },
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

  const tags = await listAllTags();
  if (tags.length === 0) return { ok: false, error: "no_categories_available" };
  const categoryChoices = shuffle(tags).slice(0, CATEGORY_CHOICES_COUNT);

  await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: "voting", categoryChoices },
  });
  return { ok: true };
}

async function tallyVotesAndStartPlaying(sessionId: string, votes: string[]): Promise<void> {
  const counts = new Map<string, number>();
  for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);
  const max = Math.max(...counts.values());
  const winners = Array.from(counts.entries())
    .filter(([, count]) => count === max)
    .map(([tag]) => tag);
  const winner = winners[Math.floor(Math.random() * winners.length)];

  const questionIds = await drawQuestionIdsForTag(winner);

  // Guard on status still being "voting" so a concurrent last-vote race
  // doesn't tally (and redraw questions) twice for the same session.
  await prisma.gameSession.updateMany({
    where: { id: sessionId, status: "voting" },
    data: { status: "playing", category: winner, questionIds, currentQuestionIndex: 0 },
  });
}

export async function castVote(code: string, playerId: string, tag: string): Promise<ActionResult> {
  const session = await prisma.gameSession.findUnique({ where: { code }, include: { players: true } });
  if (!session) return { ok: false, error: "not_found" };
  if (session.status !== "voting") return { ok: false, error: "not_voting" };
  if (!session.categoryChoices.includes(tag)) return { ok: false, error: "invalid_category" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };

  await prisma.gamePlayer.update({ where: { id: playerId }, data: { votedTag: tag } });

  const allVoted = session.players.every((p) => (p.id === playerId ? true : p.votedTag));
  if (allVoted) {
    const votes = session.players.map((p) => (p.id === playerId ? tag : (p.votedTag as string)));
    await tallyVotesAndStartPlaying(session.id, votes);
  }
  return { ok: true };
}

export async function submitAnswer(
  code: string,
  playerId: string,
  questionId: string,
  selectedOptionId: string,
): Promise<ActionResult> {
  const session = await prisma.gameSession.findUnique({ where: { code }, include: { players: true } });
  if (!session) return { ok: false, error: "not_found" };
  if (session.status !== "playing") return { ok: false, error: "not_playing" };
  const currentQuestionId = session.questionIds[session.currentQuestionIndex];
  if (questionId !== currentQuestionId) return { ok: false, error: "not_current_question" };
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "not_in_game" };

  const existingAnswers = (player.answers as unknown as Answer[]) ?? [];
  if (existingAnswers.some((a) => a.questionId === questionId)) {
    return { ok: false, error: "already_answered" };
  }

  const updatedAnswers: Answer[] = [...existingAnswers, { questionId, selectedOptionId }];
  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: { answers: updatedAnswers as object },
  });

  const allAnswered = session.players.every((p) => {
    if (p.id === playerId) return true;
    const answers = (p.answers as unknown as Answer[]) ?? [];
    return answers.some((a) => a.questionId === questionId);
  });

  if (allAnswered) {
    const nextIndex = session.currentQuestionIndex + 1;
    const isLast = nextIndex >= session.questionIds.length;
    // Guard on currentQuestionIndex still matching so a concurrent
    // last-answer race doesn't advance the session twice.
    await prisma.gameSession.updateMany({
      where: { id: session.id, status: "playing", currentQuestionIndex: session.currentQuestionIndex },
      data: isLast ? { status: "completed" } : { currentQuestionIndex: nextIndex },
    });
  }

  return { ok: true };
}

export async function getGameState(code: string, viewerPlayerId?: string): Promise<GameStateView | null> {
  const session = await prisma.gameSession.findUnique({
    where: { code },
    include: { players: { orderBy: { seat: "asc" } } },
  });
  if (!session) return null;

  const quiz =
    session.questionIds.length > 0 ? await buildQuizFromQuestionIds(session.id, session.questionIds) : null;
  const publicQuiz = quiz ? toPublicQuiz(quiz) : null;
  const currentQuestionId = session.questionIds[session.currentQuestionIndex];

  const players: PlayerView[] = session.players.map((p) => {
    const answers = (p.answers as unknown as Answer[]) ?? [];
    const scored = quiz ? scoreQuiz(quiz, answers) : null;
    return {
      seat: p.seat,
      name: p.name,
      hasVoted: Boolean(p.votedTag),
      hasAnsweredCurrent:
        session.status === "playing" ? answers.some((a) => a.questionId === currentQuestionId) : false,
      correctCount: scored?.correctCount ?? 0,
      scorePoints: scored?.scorePoints ?? 0,
    };
  });

  const viewer = viewerPlayerId ? session.players.find((p) => p.id === viewerPlayerId) : undefined;

  return {
    code: session.code,
    status: session.status as GameStatus,
    players,
    categoryChoices: session.categoryChoices,
    category: session.category,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions: session.questionIds.length,
    currentQuestion:
      session.status === "playing" && publicQuiz
        ? (publicQuiz.questions.find((q) => q.id === currentQuestionId) ?? null)
        : null,
    you: viewer ? { seat: viewer.seat, votedTag: viewer.votedTag } : null,
    isHost: viewer?.seat === 1,
  };
}
