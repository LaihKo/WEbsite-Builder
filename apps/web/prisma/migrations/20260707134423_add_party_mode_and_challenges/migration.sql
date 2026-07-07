-- AlterTable
ALTER TABLE "GamePlayer" ADD COLUMN     "bonusPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "challenge" JSONB;

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'regular',
ADD COLUMN     "usedChallengeQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
