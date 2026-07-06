-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "categoryChoices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "votedTag" TEXT,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_code_key" ON "GameSession"("code");

-- CreateIndex
CREATE INDEX "GameSession_createdAt_idx" ON "GameSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_sessionId_seat_key" ON "GamePlayer"("sessionId", "seat");

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
