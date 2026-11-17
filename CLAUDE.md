# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Increments 0 (skeleton), 1 (shared library) and 2 (lesson builder) are live on main, plus grouped library entries and bonus accessories. Lessons: `lessons/lesson_equipment/lesson_slots/lesson_items` with RLS and the `create_lesson`, `duplicate_lesson` and `reorder` RPCs; domain rules in `src/domain/lesson.ts`; list (home page), builder (dnd-kit, picker) and print view. Increment 3 (templates, series, presets) is done, and Increment 4a (usability and flows) is in progress; then 4b (production readiness and the installable PWA); see PLAN.md section 9. **There are no templates any more (4a-2):** a class is a `lessons` row, a class with `owner_id IS NULL` is a shared example class (admin-writable, readable by all), and `create_lesson` takes `from_lesson_id` to copy a class (blocks, exercises, level, length, equipment); `publish_class` makes an admin's class an example. The seeded shared example is "Apparatus class - 12 blocks" (id `5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01`). "New class" (`/lessons/new`) is a starting-point screen, then a short form (`?from=<id|blank>`); equipment presets and custom blocks live under More (`/more/presets`, `/more/blocks`); sets (the `series` tables) are library content: the library has an Exercises | Sets view, only admins edit sets (a dialog in the Sets view), and each class block has one Add button opening a dialog with Exercises (tick several, "Add N") and Sets tabs (`AddDialog`). The UI says "class" (Hebrew "שיעור"); table names, routes and code keep `lessons`. Time (4a-3): every exercise has `default_duration_sec` (NOT NULL; a trigger fills it from `blocks.default_duration_sec`, the per-block placeholder estimate), `domain/lesson.ts` has `timeStatus`, and the builder shows a sticky `TimeBar` plus minutes per block. On phones the app has a compact header and a bottom tab bar (Classes, Library, More), exercise rows are collapsed by default, and `e2e/responsive.local.spec.ts` guards against horizontal overflow at 360 and 390px in English and Hebrew. `lesson_items.exercise_id` has no ON DELETE action, so an exercise used in a lesson cannot be deleted (archive it). The real exercise list (117 rows) is private data and is **not in git**: it lives in git-ignored `supabase/seed/private/exercises.block.csv`. The committed `supabase/seed/exercises.sample.csv` (25 invented-for-dev rows) is what CI and local dev import. Columns: `name, block_key, equipment, level, series`; `series` rows become shared series on import; `npm run db:import -- <csv> --series-only` adds only series to a database that already has the exercises. Blocks, methods and equipment are reference data inside the library migration, not in `seed.sql`. The repo is licensed PolyForm Noncommercial 1.0.0 (`LICENSE`); the Unda name, logo and brand are not covered (see README).

## Commands

```
npm run dev            # Vite dev server (needs .env.local, see .env.example)
npm run typecheck      # tsc -b
npm run lint           # eslint .
npm test               # vitest run (jsdom)
npx vitest run src/app/theme.test.ts -t "ink on cream"   # single file / test name
npm run build          # tsc -b && vite build
npm run e2e            # Playwright smoke test; builds and serves on :4173
npx playwright test e2e/smoke.spec.ts                    # single e2e spec
# Real magic-link flow via Mailpit (needs `npm run db:start`; skipped in CI). Use the URL and
# publishable key that db:start prints. Local auth limits emails per hour, so don't loop it.
E2E_LOCAL_SUPABASE=1 VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run e2e
npm run format         # prettier --write .
```

Database (Supabase CLI via npx; the local stack needs Docker):

```
npm run db:start       # prints the local API URL and publishable key for .env.local
npx supabase migration new <name>   # then edit supabase/migrations/<ts>_<name>.sql
npm run db:reset       # re-apply all migrations
npm run db:types       # regenerate src/data/database.types.ts (commit it; CI diffs it)
npm run db:test        # pgTAP tests in supabase/tests/database/
# Import the seed exercises (insert-only; refuses if shared exercises already exist).
# Needs SUPABASE_URL + SUPABASE_SECRET_KEY (sb_secret_...) in the env or .env.local.
# Local values: `npx supabase status -o json`. For the hosted project paste the key in the
# terminal for that one command; never commit it or put it in CI/Cloudflare.
npm run db:import                                              # sample file (CI/dev)
npm run db:import -- supabase/seed/private/exercises.block.csv  # the real list (staging/prod, local only)
```

The local e2e specs (`e2e/*.local.spec.ts`) also need the seed imported, and `admin.local.spec.ts` promotes a user with `docker exec supabase_db_unda-flow psql`.

Local magic-link emails arrive in Mailpit at http://127.0.0.1:54324.

Tooling notes: TypeScript is pinned to ~6.0 because typescript-eslint does not support 7.x yet (peer range `<6.1`). Lint enforces two PLAN.md rules: supabase-js may only be imported under `src/data/**`, and physical Tailwind classes (`ml-`, `pr-`, `text-left`, `left-`, ...) are errors, so use logical ones. UI primitives in `src/components/ui` are hand-written (cva + `cn`), not generated by the shadcn CLI.

Read `PLAN.md` before any work. It defines the product (a Pilates lesson planner for instructors), decisions D1–D6, brand tokens, data model, RLS rules, seed data and the increments. Build **one increment at a time** (PLAN.md §9); don't start the next until the current "done when" list is met.

## Planned architecture (from PLAN.md)

- Stack: TypeScript strict, React + Vite SPA, Tailwind + shadcn/ui, TanStack Router/Query, React Hook Form + Zod, dnd-kit, i18next, Supabase (Postgres/Auth/RLS, no custom server), Cloudflare Workers static assets hosting (`wrangler.jsonc`, deployed with `npx wrangler deploy`; the SPA fallback is `not_found_handling`, so there is no `_redirects`), Vitest + Playwright.
- Layers under `src/`: `domain/` is pure TS (types, Zod schemas, equipment matching, duration totals; no React or Supabase) and must be unit-tested. `data/` is the **only** code allowed to import supabase-js. `features/` holds UI per feature.
- Every schema change is an additive migration in `supabase/migrations`. RLS is created in the same migration as its table, and generated DB types are committed.
- "Methods are data, not code": block/dynamic/classic are rows in `methods`. Never write `if (method === 'block')` in the UI.
- Shared vs. private content is one mechanism: `owner_id IS NULL` means shared library (admin-writable), `owner_id = auth.uid()` means private. Private data is scoped to the user ID, never an IP.
- Equipment matching: an exercise is available when every `alt_group` in `exercise_equipment` has at least one item in the available set. Rows with `is_optional` are bonus accessories: shown ("Bonus: Ring") but ignored for availability. The library groups rows with the same name and block into one entry (`groupByMovement`); each version remains a separate exercise row. Items already in a lesson that become unavailable are kept with a warning badge, never silently deleted.
- Classes copy their structure from a source class (an example or your own), so editing the original never alters the copy. There is no separate template entity.
- CSV seed format: in `equipment`, `|` separates alternatives and `+` separates required groups (`reformer+box`, `mat|reformer|cadillac`); rows sharing a `series` become a series in CSV order. Import as shared content with `review_status = 'needs_review'`.

## Conventions

- All UI strings go through i18n (`en.json` + `he.json`); Hebrew is RTL. Use CSS logical properties only (`ms-`, `pe-`; never `ml-`, `left-`).
- Colours only via theme tokens (CSS variables mapped to Tailwind); no raw hex in components. Terracotta and sage fail contrast for small text on cream.
- Supabase keys: client uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`; never the legacy anon/JWT keys). The secret key (`sb_secret_...`) is for local seed/import scripts only, never in client code, GitHub secrets or Cloudflare settings. Missing env vars show a config error screen (`src/data/env.ts`, `src/app/ConfigError.tsx`). Secrets go in git-ignored `.env.local`, with a committed `.env.example`.
- The hosted project has "Automatically expose new tables" off: every table-creating migration must explicitly `ENABLE ROW LEVEL SECURITY` and `GRANT` privileges to `authenticated` (and `anon` only where intended). Never rely on default privileges. That includes `service_role` (the secret key's role) for tables the import script touches: local Supabase auto-grants and hides a missing grant until production.
- Content: exercise/block names stay in English; write descriptions in our own words; do not copy text/images/video from the provider or other providers, and don't use "the provider" in branding (D6).
- Example content (new exercises, example classes) is authored only when the product owner has asked for it, and is flagged `needs_review` for the instructor. Ask before changing the data model or seed content.
- Keep `main` deployable; one increment per branch/PR series. Order of work: migration + RLS, regenerate types, data hooks, then UI.
