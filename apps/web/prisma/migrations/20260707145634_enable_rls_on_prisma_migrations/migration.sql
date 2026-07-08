-- Supabase's security linter flags every table in the `public` schema that
-- doesn't have RLS enabled, since that schema is exposed via its
-- auto-generated PostgREST API. `_prisma_migrations` is Prisma's own
-- internal bookkeeping table (migration names/checksums/timestamps) — the
-- app never queries it, and Prisma's own migration engine connects as the
-- schema-owning role, which bypasses RLS, so enabling it with no policies
-- is a no-op for the app and just closes off anonymous PostgREST access.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
