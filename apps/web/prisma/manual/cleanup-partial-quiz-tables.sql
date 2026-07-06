-- One-time manual fix, not part of the tracked migration history.
--
-- An earlier failed attempt at applying 20260705181717_add_quiz_content_models
-- left the Quiz/Question/Option tables partially created on the target
-- database (Postgres did not roll back the whole migration on error). Those
-- tables were never populated, so it's safe to drop them and let
-- `prisma migrate deploy` recreate everything from a clean slate.
--
-- Run once via: npx prisma db execute --file prisma/manual/cleanup-partial-quiz-tables.sql
-- Then delete this file.
DROP TABLE IF EXISTS "Option" CASCADE;
DROP TABLE IF EXISTS "Question" CASCADE;
DROP TABLE IF EXISTS "Quiz" CASCADE;
