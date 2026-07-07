-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "folder" TEXT;

-- CreateIndex
CREATE INDEX "Quiz_folder_idx" ON "Quiz"("folder");

-- Group the already-uploaded pub quiz archive into one folder instead of
-- leaving it as ~90 uncategorized entries in the admin list. Leaves any
-- quiz with no questions (e.g. the pre-existing legacy placeholder) alone.
UPDATE "Quiz" SET "folder" = 'Pub Quiz Archive'
WHERE "folder" IS NULL
  AND EXISTS (SELECT 1 FROM "Question" WHERE "Question"."quizId" = "Quiz"."id");
