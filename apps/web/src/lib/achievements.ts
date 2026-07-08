import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export type EventGameMode = "regular" | "party";

/** Snapshot of the game that just finished, for criteria that need to compare across all its players (not just lifetime aggregates). */
export interface GameContext {
  gameKey: string;
  mode: EventGameMode;
  usedTags: string[];
  winnerSeats: number[];
  players: { seat: number; userId: string | null; score: number; correctCount: number; totalQuestions: number }[];
}

/** Records one answered question. Silently a no-op if the player wasn't logged in — anonymous play isn't tracked. */
export async function recordAnswerEvent(params: {
  userId: string | null;
  mode: EventGameMode;
  gameKey: string;
  tags: string[];
  correct: boolean;
  timeTakenMs: number | null;
}): Promise<void> {
  if (!params.userId) return;
  await prisma.answerEvent.create({
    data: {
      userId: params.userId,
      mode: params.mode,
      gameKey: params.gameKey,
      tags: params.tags,
      correct: params.correct,
      timeTakenMs: params.timeTakenMs ?? undefined,
    },
  });
}

/** Records a finished game for every logged-in player in it, then evaluates achievements for each. */
export async function recordGameCompletion(context: GameContext): Promise<void> {
  const loggedInPlayers = context.players.filter((p): p is typeof p & { userId: string } => p.userId !== null);
  if (loggedInPlayers.length === 0) return;

  await prisma.gameCompletionEvent.createMany({
    data: loggedInPlayers.map((p) => ({
      userId: p.userId,
      mode: context.mode,
      gameKey: context.gameKey,
      playerCount: context.players.length,
      correctCount: p.correctCount,
      totalQuestions: p.totalQuestions,
      score: p.score,
      wonGame: context.winnerSeats.includes(p.seat),
    })),
  });

  for (const player of loggedInPlayers) {
    await evaluateAchievements(player.userId, context);
  }
}

interface LifetimeAggregates {
  gamesPlayedAny: number;
  gamesPlayedRegular: number;
  gamesPlayedParty: number;
  questionsAnswered: number;
  questionsCorrect: number;
  totalWins: number;
  currentWinStreak: number;
  bestAnswerStreakInAnyGame: number;
  streakOf5PlusCount: number;
  perfectGamesCount: number;
  perfectGamesConsecutiveMax: number;
  /** tag -> accuracy, only for tags with at least 20 answers (Category Mastery's threshold). */
  tagAccuracy: Map<string, number>;
}

/** Longest run of consecutive `true` values, and how many distinct runs reach at least `minRun`. */
function longestRun(values: boolean[]): number {
  let best = 0;
  let current = 0;
  for (const v of values) {
    current = v ? current + 1 : 0;
    if (current > best) best = current;
  }
  return best;
}

function trailingRun(values: boolean[]): number {
  let count = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (!values[i]) break;
    count++;
  }
  return count;
}

function countRunsAtLeast(values: boolean[], min: number): number {
  let count = 0;
  let current = 0;
  for (const v of values) {
    if (v) {
      current++;
    } else {
      if (current >= min) count++;
      current = 0;
    }
  }
  if (current >= min) count++;
  return count;
}

async function computeLifetimeAggregates(userId: string): Promise<LifetimeAggregates> {
  const [games, answers] = await Promise.all([
    prisma.gameCompletionEvent.findMany({ where: { userId }, orderBy: { playedAt: "asc" } }),
    prisma.answerEvent.findMany({ where: { userId }, orderBy: { answeredAt: "asc" } }),
  ]);

  const wonFlags = games.map((g) => g.wonGame);
  const perfectFlags = games.map((g) => g.totalQuestions > 0 && g.correctCount === g.totalQuestions);

  const answersByGame = new Map<string, boolean[]>();
  for (const a of answers) {
    const list = answersByGame.get(a.gameKey) ?? [];
    list.push(a.correct);
    answersByGame.set(a.gameKey, list);
  }
  let bestAnswerStreakInAnyGame = 0;
  let streakOf5PlusCount = 0;
  for (const list of answersByGame.values()) {
    bestAnswerStreakInAnyGame = Math.max(bestAnswerStreakInAnyGame, longestRun(list));
    streakOf5PlusCount += countRunsAtLeast(list, 5);
  }

  const tagStats = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    for (const tag of a.tags) {
      const stat = tagStats.get(tag) ?? { correct: 0, total: 0 };
      stat.total++;
      if (a.correct) stat.correct++;
      tagStats.set(tag, stat);
    }
  }
  const tagAccuracy = new Map<string, number>();
  for (const [tag, stat] of tagStats) {
    if (stat.total >= 20) tagAccuracy.set(tag, stat.correct / stat.total);
  }

  return {
    gamesPlayedAny: games.length,
    gamesPlayedRegular: games.filter((g) => g.mode === "regular").length,
    gamesPlayedParty: games.filter((g) => g.mode === "party").length,
    questionsAnswered: answers.length,
    questionsCorrect: answers.filter((a) => a.correct).length,
    totalWins: wonFlags.filter(Boolean).length,
    currentWinStreak: trailingRun(wonFlags),
    bestAnswerStreakInAnyGame,
    streakOf5PlusCount,
    perfectGamesCount: perfectFlags.filter(Boolean).length,
    perfectGamesConsecutiveMax: longestRun(perfectFlags),
    tagAccuracy,
  };
}

/** True if `criteria` is satisfied. `context` is only present right after the game that triggered evaluation. */
function checkCriteria(
  criteria: Record<string, unknown>,
  agg: LifetimeAggregates,
  userId: string,
  context?: GameContext,
): boolean {
  const me = context?.players.find((p) => p.userId === userId);
  switch (criteria.type) {
    case "games_played": {
      const mode = criteria.mode as EventGameMode | null;
      const count = mode === "regular" ? agg.gamesPlayedRegular : mode === "party" ? agg.gamesPlayedParty : agg.gamesPlayedAny;
      return count >= (criteria.min as number);
    }
    case "questions_answered":
      return agg.questionsAnswered >= (criteria.min as number);
    case "questions_correct":
      return agg.questionsCorrect >= (criteria.min as number);
    case "wins":
      return agg.totalWins >= (criteria.min as number);
    case "win_streak":
      return agg.currentWinStreak >= (criteria.min as number);
    case "answer_streak_in_game":
      return agg.bestAnswerStreakInAnyGame >= (criteria.min as number);
    case "answer_streak_lifetime_count": {
      // streakMin is baked into how streakOf5PlusCount was computed (fixed
      // at 5, matching every achievement of this type in the source data).
      return criteria.streakMin === 5 && agg.streakOf5PlusCount >= (criteria.timesMin as number);
    }
    case "perfect_games":
      return agg.perfectGamesCount >= (criteria.min as number);
    case "perfect_games_consecutive":
      return agg.perfectGamesConsecutiveMax >= (criteria.min as number);
    case "perfect_game_min_players": {
      if (!context || !me || me.totalQuestions === 0 || me.correctCount !== me.totalQuestions) return false;
      return context.players.length >= (criteria.minPlayers as number);
    }
    case "win_margin_exact":
    case "win_margin_ratio": {
      if (!context || !me || !context.winnerSeats.includes(me.seat)) return false;
      const runnerUp = context.players
        .filter((p) => p.seat !== me.seat)
        .sort((a, b) => b.score - a.score)[0];
      if (!runnerUp) return false;
      if (criteria.type === "win_margin_exact") {
        return me.score - runnerUp.score === (criteria.points as number);
      }
      return runnerUp.score > 0 && me.score >= runnerUp.score * (criteria.ratio as number);
    }
    case "category_mastery_lowest": {
      if (!context || !me || !context.winnerSeats.includes(me.seat)) return false;
      if (agg.tagAccuracy.size === 0) return false;
      const lowestTag = [...agg.tagAccuracy.entries()].sort((a, b) => a[1] - b[1])[0][0];
      return context.usedTags.includes(lowestTag);
    }
    default:
      return false;
  }
}

/** Checks every not-yet-unlocked achievement with criteria against this player's data, unlocking any newly satisfied. */
export async function evaluateAchievements(userId: string, context?: GameContext): Promise<void> {
  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ where: { criteria: { not: Prisma.DbNull } } }),
    prisma.playerAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  const candidates = achievements.filter((a) => !unlockedIds.has(a.id));
  if (candidates.length === 0) return;

  const agg = await computeLifetimeAggregates(userId);

  const newlyUnlocked = candidates.filter((a) =>
    checkCriteria(a.criteria as Record<string, unknown>, agg, userId, context),
  );
  if (newlyUnlocked.length === 0) return;

  await prisma.playerAchievement.createMany({
    data: newlyUnlocked.map((a) => ({ userId, achievementId: a.id })),
    skipDuplicates: true,
  });
}
