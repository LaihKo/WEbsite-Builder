# Architecture

## Layout

This is an npm-workspaces monorepo:

- `packages/quiz-core` — framework-agnostic TypeScript library: quiz domain
  types, scoring, and the quiz-taking state machine. No React, no DOM, no
  fetch. Pure logic, unit tested with Vitest.
- `apps/web` — Next.js (App Router) web app. Thin UI layer that imports
  `@quiz/core` for all quiz-taking logic; components only manage rendering
  and local UI state.

The point of this split: when a native app (React Native/Expo) is added
later, it becomes a second consumer of `@quiz/core` and of the same backend
API — not a rewrite of the quiz logic. Keep any new business logic (scoring
variants, quiz validation, timers, streaks, etc.) in `quiz-core`, not inside
web components.

## Current assumptions (revisit as the product needs change)

- **Content is fixed, not user-authored.** Quizzes are TypeScript/JSON data
  (see `packages/quiz-core/src/sampleQuiz.ts`), not stored in a database or
  editable through an admin UI. This was the fastest path to a working app.
  When quizzes need to be created dynamically, add a backend API + database
  and have `quiz-core` consume `Quiz` objects from either source — the
  scoring/engine code doesn't care where a `Quiz` came from.
- **No accounts yet.** Quiz-taking is anonymous; results aren't persisted
  across sessions. Auth and persistence should be layered in without
  touching `quiz-core`'s pure functions — wrap them in a data layer in
  `apps/web` (or a shared API client package) instead.

## Adding a backend later

When you need persistence (saved scores, user-authored quizzes, accounts),
introduce an API rather than talking to a database directly from the UI.
Next.js Route Handlers under `apps/web/src/app/api/*` work for the web app
alone; if/when the native app arrives, both clients should call the same
HTTP API so logic isn't duplicated. `@quiz/core` types (`Quiz`, `Answer`,
`QuizResult`) are meant to double as the API's request/response shapes.

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
