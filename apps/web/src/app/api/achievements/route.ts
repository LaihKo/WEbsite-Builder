import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: [{ group: "asc" }, { id: "asc" }] }),
    userId
      ? prisma.playerAchievement.findMany({ where: { userId }, select: { achievementId: true, unlockedAt: true } })
      : Promise.resolve([]),
  ]);
  const unlockedById = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return Response.json({
    loggedIn: Boolean(userId),
    unlockedCount: unlockedById.size,
    totalCount: achievements.length,
    achievements: achievements.map((a) => ({
      id: a.id,
      nameDa: a.nameDa,
      descDa: a.descDa,
      group: a.group,
      tier: a.tier,
      rarity: a.rarity,
      comingSoon: a.criteria === null,
      unlockedAt: unlockedById.get(a.id)?.toISOString() ?? null,
    })),
  });
}
