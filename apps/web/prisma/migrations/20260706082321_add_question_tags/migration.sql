-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Question_tags_idx" ON "Question" USING GIN ("tags");
