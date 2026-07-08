-- AlterTable
ALTER TABLE "GamePlayer" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameDa" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "descDa" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "criteria" JSONB,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correct" BOOLEAN NOT NULL,
    "timeTakenMs" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCompletionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "playerCount" INTEGER,
    "correctCount" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "wonGame" BOOLEAN NOT NULL DEFAULT false,
    "finalRank" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameCompletionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Achievement_group_idx" ON "Achievement"("group");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_userId_achievementId_key" ON "PlayerAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "AnswerEvent_userId_answeredAt_idx" ON "AnswerEvent"("userId", "answeredAt");

-- CreateIndex
CREATE INDEX "AnswerEvent_userId_gameKey_idx" ON "AnswerEvent"("userId", "gameKey");

-- CreateIndex
CREATE INDEX "GameCompletionEvent_userId_playedAt_idx" ON "GameCompletionEvent"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "GamePlayer_userId_idx" ON "GamePlayer"("userId");

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerEvent" ADD CONSTRAINT "AnswerEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCompletionEvent" ADD CONSTRAINT "GameCompletionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

