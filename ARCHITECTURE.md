# Architecture

## Layout

This is an npm-workspaces monorepo:

- `packages/quiz-core` — framework-agnostic TypeScript library: quiz domain
  types, scoring, and the quiz-taking state machine. No React, no DOM, no
  fetch. Pure logic, unit tested with Vitest.
- `apps/web` — Next.js (App Router) web app. Thin UI layer that imports
  `@quiz/core` for all quiz-taking logic; components only manage rendering
  and local UI state. Talks to its own backend via `apps/web/src/app/api/*`
  Route Handlers rather than importing quiz data directly into client code.

The point of this split: when a native app (React Native/Expo) is added
later, it becomes a second consumer of `@quiz/core` and of the same HTTP
API — not a rewrite of the quiz logic. Keep any new business logic (scoring
variants, quiz validation, timers, streaks, etc.) in `quiz-core`, not inside
web components.

## API

- `GET /api/quizzes/[quizId]` — returns a `PublicQuiz` (quiz + questions +
  options, **without** `correctOptionId`). The client only ever sees this
  shape; `apps/web/src/components/QuizPlayer.tsx` fetches it and drives the
  quiz-taking state machine (`createQuizState`/`answerCurrentQuestion`/
  `advance` from `quiz-core`) against it entirely client-side.
- `POST /api/quizzes/[quizId]/submit` — body `{ answers: Answer[] }`, scores
  server-side with `scoreQuiz` (which has the real `Quiz` with answer keys)
  and returns a `QuizResult`. Scoring never happens on the client.

This matters beyond "clean architecture": a Server Component that imports
`quiz-core`'s `Quiz` type directly and hands it as a prop to a `"use client"`
component would serialize `correctOptionId` into the browser bundle. Route
Handlers plus `toPublicQuiz()` are the boundary that prevents that leak — if
you add new quiz-related UI, fetch through the API rather than importing
`Quiz`/`sampleQuiz` into anything that renders on the client.

Both routes are backed by `packages/quiz-core/src/quizzes.ts`, an in-memory
`Map` of fixed quizzes (currently just the sample). Swapping that for a
database lookup later doesn't change the route handlers' shape — same
request/response contract, same `@quiz/core` types.

## Current assumptions (revisit as the product needs change)

- **Content is fixed, not user-authored.** Quizzes are TypeScript data (see
  `packages/quiz-core/src/sampleQuiz.ts` + `quizzes.ts`), not stored in a
  database or editable through an admin UI. When quizzes need to be created
  dynamically, replace `quizzes.ts`'s in-memory map with a database-backed
  lookup — the API routes and `quiz-core` logic don't need to change.
- **No accounts yet.** Quiz-taking is anonymous; results aren't persisted
  across sessions — `POST /submit` just returns a score, it doesn't store
  it. Auth and persistence should be layered in without touching
  `quiz-core`'s pure functions — extend the submit route (or add a new one)
  to write to a database once accounts exist.

## Testing

- `npm run test` runs `quiz-core`'s unit tests (scoring + engine). This is
  the highest-value test surface — scoring bugs are what users notice first.
- `npm run typecheck` runs `tsc --noEmit` across all workspaces.
- CI (`.github/workflows/ci.yml`) runs typecheck, test, lint, and a
  production build on every push/PR to `main`.

## Commands

```
npm install          # install everything (root, from repo root)
npm run dev           # start the web app (apps/web) on :3000
npm run test          # run quiz-core unit tests
npm run typecheck     # typecheck all workspaces
npm run build         # build quiz-core then web
```
