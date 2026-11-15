# Unda Flow — Pilates Lesson Planner — Build Plan

> Input for Claude Code plan mode. Repo name: `unda-flow`. Build **one increment at a time** (section 9). Each increment ends deployed and usable; do not start the next one until the current one meets its "done when" list. Use the latest stable version of every dependency at scaffold time and pin it in the lockfile.

## 1. Product summary

A web app (later iOS/Android) where a Pilates instructor builds a lesson plan:

1. Pick a method (v1: **block method** only) and a lesson template.
2. Say which equipment is available today (reformer beds, balls, rings, ...).
3. Fill each block of the lesson from an exercise library filtered to what the equipment allows.
4. Reorder, tweak (reps, springs, notes), save, and export to PDF to print or use offline.

The app ships with a **ready-made shared library** (blocks, exercises, templates) so an instructor does not start from an empty database. On top of it, each instructor can add private custom exercises, blocks, and templates.

First user: one instructor (the developer's partner, who also curates the shared library). Possible future: public multi-user product. The architecture must make that a matter of adding features, not rewriting.

## 2. Decisions already made

| # | Decision |
|---|---|
| D1 | Block method = a lesson is an ordered list of blocks, each with a specific goal, filled with one or more exercises. Order matters (each block prepares the body for the next) but the instructor may reorder, merge, or skip blocks. See section 7 for the blocks. |
| D2 | i18n from day one: all UI strings in locale files, CSS logical properties only. Ship **English + Hebrew UI** (Hebrew is one extra locale file plus `dir="rtl"`). Exercise and block **names stay in English** (that is how instructors use them); translated content is backlog. |
| D3 | Equipment is binary (available / not available) in v1. Quantities are backlog. |
| D4 | Offline use = **export a lesson to PDF** (browser print stylesheet, which handles Hebrew/RTL natively). No offline app cache in v1. |
| D5 | Private data is scoped to an **authenticated user ID**, never to an IP address (IPs change and are shared by everyone on the same Wi-Fi). Auth and row-level security are on from Increment 0. |
| D6 | Shared library content stores **names, block, equipment, level only**, written in our own words where descriptions exist. Do not copy text, images, or video from the provider or any other training provider. Do not use "the provider" in the product name, branding, or marketing. |

## 3. Brand and theme (Unda Pilates)

The app follows the studio's brand sheet.

| Token | Hex | Use |
|---|---|---|
| `cream` | `#F8F2E9` | App background (light theme) |
| `warm-cream` | `#EADFD3` | Cards, secondary surfaces |
| `sage` | `#A7B097` | Chips, selected states, soft surfaces, dividers |
| `olive` | `#596554` | Primary buttons, headers, app bar; background in dark theme |
| `terracotta` | `#C76F56` | Signature accent: active block marker, highlights, warnings-free emphasis, the wave motif |
| `ink` | `#2F3329` (approximate, sampled from the logo; confirm with the designer) | Body text on cream |

Rules:
- Define these as CSS variables and map them to Tailwind/shadcn theme tokens; no raw hex values in components.
- Body text: `ink` on cream, or cream on olive. Terracotta and sage do **not** have enough contrast for small text on cream; use them for accents, icons, large text, and fills only. Check every text/background pair against WCAG AA.
- Typography: a clean sans that covers Latin and Hebrew (e.g. Assistant or Heebo) for UI; section labels in uppercase with wide letter-spacing (Latin only) to echo the brand sheet. Generous whitespace, thin rules, rounded-full outline shapes like the submark.
- Logo: use the designer's **original vector files** (SVG) in `public/brand/` — horizontal logo in the app bar and login screen, the circled "U" submark as favicon/PWA icon. Never redraw or approximate the logo in code. Until SVGs are supplied, use a text placeholder, not the JPEGs.
- The brand artwork is AI-generated raster (two boards, stored in `brand/reference/`); there are no original vectors. `brand/extract_logos.py` keys transparent PNG logos out of them into `public/brand/`, used by `src/components/Logo.tsx` (the "original SVG only" rule above is relaxed for this reason). Larger or vector versions are still desirable for the Increment 4 install icons.
- The terracotta wave may be reused as a subtle divider/empty-state motif.
- Light theme (cream) is the default; an olive dark theme is optional polish in Increment 4.

## 4. Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) everywhere | One language across web, domain logic, and later mobile. |
| Web app | React + Vite, single-page app | Lives behind a login, so no SEO/SSR need; simplest thing to wrap as a native app later. |
| UI | Tailwind CSS + shadcn/ui, logical properties only (`ms-`, `pe-`, ...) | Fast to build, RTL-safe, themeable with the brand tokens. |
| Routing / data | TanStack Router, TanStack Query | Typed routes; caching and optimistic updates. |
| Forms / validation | React Hook Form + Zod | Zod schemas double as the domain types. |
| Drag and drop | dnd-kit | Touch-friendly reordering in the builder. |
| i18n | i18next, `src/locales/en.json` + `he.json`, `dir` set from locale | D2. |
| Backend | Supabase: Postgres, Auth, RLS, Storage | No custom server in v1. Client talks to Postgres via supabase-js; RLS is the security boundary. |
| Server logic (later) | Supabase Edge Functions | Only for things that cannot run in the client (billing webhooks, AI suggestions). |
| Hosting | **Cloudflare Workers static assets** (not classic Pages, not Vercel), connected to the GitHub repo | Preview builds on. Build command `npm run build`, deploy command `npx wrangler deploy` (`wrangler` is a pinned dev dependency). `wrangler.jsonc` serves `./dist` with `"not_found_handling": "single-page-application"`, which is the SPA fallback: no Worker script, no `main` entry, no `_redirects` file. |
| Keep-alive | GitHub Actions scheduled workflow | Supabase's free plan pauses a project after a week with no activity; a twice-weekly request prevents that. Remove when the project moves to a paid plan. |
| Tests | Vitest (unit), Playwright (end-to-end smoke) | |
| CI | GitHub Actions: typecheck, lint, unit tests, build | |
| Mobile (later) | Installable PWA, then Capacitor wrapper around the same build for the stores | No second codebase. |

## 5. Architecture

```
Browser / PWA / (later) Capacitor shell
 ├─ UI           src/features/*      React components per feature
 ├─ Domain       src/domain/*        pure TS: types, Zod schemas, rules. No React, no Supabase.
 └─ Data         src/data/*          the only code that imports supabase-js; typed query/mutation hooks
                    │ HTTPS (JWT)
Supabase
 ├─ Auth         email magic link / Google
 ├─ Postgres     schema + RLS policies (all in versioned migrations)
 ├─ Storage      exercise media (later)
 └─ Edge Functions (later)
```

Rules that keep later increments cheap:

- **Domain is pure.** Equipment matching, duration totals, template expansion live in `src/domain` with unit tests.
- **Only `src/data` touches Supabase.**
- **Every schema change is an additive migration** in `supabase/migrations`, so new increments attach to a running system with live data.
- **Generated DB types** (`supabase gen types`) are committed and checked in CI.
- **Methods are data, not code.** Block, dynamic, classic are rows in `methods` with their own blocks. No `if (method === 'block')` in the UI.
- **Shared vs. private is one mechanism** (`owner_id`, section 6), used by every content table.

### Repo layout

```
unda-flow/
├─ src/
│  ├─ app/            router, providers, layout, theme, i18n setup
│  ├─ locales/        en.json, he.json
│  ├─ domain/         types.ts, schemas.ts, equipment.ts, lesson.ts, *.test.ts
│  ├─ data/           supabaseClient.ts, queries/, mutations/, database.types.ts
│  ├─ features/       auth/ equipment/ exercises/ templates/ lessons/ settings/ admin/
│  └─ components/     shared UI (shadcn)
├─ public/brand/      logo SVGs
├─ supabase/
│  ├─ migrations/
│  └─ seed/           exercises.sample.csv (committed sample); the real list is git-ignored in seed/private/ (blocks, methods, equipment are reference data in the library migration)
├─ scripts/           import-exercises.ts (local, secret key), csv.ts, build-import.ts
├─ e2e/
├─ wrangler.jsonc
└─ .github/workflows/ci.yml
```

## 6. Data model

Ownership convention on content tables: `owner_id uuid null references auth.users`.
- `owner_id IS NULL` = **shared library**: readable by every signed-in user, writable only by admins.
- `owner_id = auth.uid()` = **private custom content** of that user.

```
profiles            id (= auth.users.id), display_name, locale, role ('user'|'admin'), created_at

methods             id, key ('block'|'dynamic'|'classic'), name, is_active

blocks              id, owner_id?, method_id, key, name, goal, default_position
                    -- block categories (section 7). Users may add custom blocks.

equipment           id, owner_id?, key, name, kind ('apparatus'|'prop')
                    -- reformer, cadillac, chair, barrel, mat; ball, ring, band, weights, box, ...

exercises           id, owner_id?, method_id, block_id, name, description, cues,
                    level ('fundamental'|'intermediate'|'advanced'),
                    default_reps, default_duration_sec, default_springs, media_url?,
                    review_status ('needs_review'|'verified'),   -- for seeded shared content
                    is_archived, created_at, updated_at
                    -- the same movement on a different apparatus is a separate exercise row

exercise_equipment  exercise_id, equipment_id, alt_group smallint
                    -- rows sharing an alt_group are alternatives (any one is enough);
                    -- every alt_group of an exercise must be satisfied.
                    -- "reformer AND (ball OR ring)" = {reformer: 0, ball: 1, ring: 1}
                    -- is_optional = a "bonus" accessory: shown, but never affects availability
                    -- (alt_group ignored). Apparatus are always required; props can be required or bonus.

series              id, owner_id?, block_id, name            -- e.g. "Reformer foot work", "Arms supine"
series_items        series_id, exercise_id, position         -- added to a lesson in one action

equipment_presets   id, owner_id, name                       -- "Studio", "Home mat class"
equipment_preset_items  preset_id, equipment_id

templates           id, owner_id?, method_id, name, description, target_duration_min
template_slots      id, template_id, block_id, position, label, is_optional,
                    min_exercises, hint
                    -- the same block may appear twice (FBI 1 / FBI 2), distinguished by label

lessons             id, owner_id, method_id, template_id?, title, lesson_date, level,
                    target_duration_min, notes, status ('draft'|'ready'|'taught'),
                    created_at, updated_at
lesson_equipment    lesson_id, equipment_id
lesson_slots        id, lesson_id, block_id, position, label, is_skipped, notes,
                    hint, is_optional, min_exercises
                    -- copied from the template at creation (hint columns included), then freely editable
lesson_items        id, lesson_slot_id, exercise_id, position,
                    reps?, duration_sec?, springs?, notes?
```

A lesson **copies** its structure from a template, so editing a template never changes past lessons.

### RLS (in the same migration that creates each table)

- Shared + own (`blocks`, `equipment`, `exercises`, `series`, `templates`):
  `SELECT` where `owner_id IS NULL OR owner_id = auth.uid()`;
  write where `owner_id = auth.uid()`, **or** `owner_id IS NULL` and the caller is an admin (`is_admin()` security-definer function reading `profiles.role`).
- Own-only (`lessons`, `equipment_presets`, `profiles`): all operations on own rows. Users cannot change their own `role`.
- Child tables: policy checks the parent with `EXISTS`.
- `methods`: read-only for signed-in users.
- Test proving user B cannot read or write user A's lesson or custom exercise, and a non-admin cannot modify shared content.

### Core domain rule

```ts
// src/domain/equipment.ts
// Available when every alt_group has at least one item in the available set.
// An exercise with no requirements is always available.
isExerciseAvailable(requirements: {equipmentId: string; altGroup: number}[], available: Set<string>): boolean
```

If an item already in a lesson becomes unavailable (equipment unticked), keep it and show a warning badge. Never delete silently.

## 7. Block method seed data

Block categories (`blocks`, shared, method = block):

| key | Name | Goal (short) |
|---|---|---|
| `warm_up` | Warm-up | Warm the centre and spinal articulation; not a stretching block. |
| `foot_work` | Foot work | Leg/foot alignment under load, incl. single leg. Usually a full series. |
| `abdominal` | Abdominal work | 1–2 abdominal exercises under spring load. |
| `hip_work` | Hip work | Pelvis and hip stabilisers, legs in straps. |
| `stretch` | Stretches | Mainly hip flexors (psoas). |
| `spinal_articulation` | Spinal articulation | Segmental spine movement. |
| `fbi` | Full body integration | Multi-muscle-group integration. |
| `leg_work` | Leg work | Extra leg block, glutes and adductors. |
| `lateral_rotation` | Lateral flexion / rotation | Side bending and rotation. |
| `arm_work` | Arm work | Shoulder girdle in several planes. |
| `back_extension` | Back extension | Range and strength once the whole body is prepared. |

Shared template **"Apparatus class — 12 blocks"** (`template_slots`, in this order):

| # | Block | Label | Optional | Min exercises | Note shown in builder |
|---|---|---|---|---|---|
| 1 | warm_up | Warm-up | no | 1 | |
| 2 | foot_work | Foot work | no | 1 | Suggest adding a whole series. |
| 3 | abdominal | Abdominal | no | 1 | 1–2 exercises. |
| 4 | hip_work | Hip work | no | 1 | |
| 5 | stretch | Stretch | no | 1 | May swap with 6 for flow. |
| 6 | spinal_articulation | Articulation | no | 1 | May swap with 5 for flow. |
| 7 | fbi | FBI 1 | no | 1 | |
| 8 | leg_work | Extra leg | yes | 1 | Often dropped or merged in large groups. |
| 9 | lateral_rotation | Lateral / rotation | no | 1 | |
| 10 | fbi | FBI 2 | yes | 1 | Usually harder than FBI 1; large groups do only one. |
| 11 | arm_work | Arm work | no | 3 | A series of at least 3 exercises. |
| 12 | back_extension | Back extension | no | 1 | |

`is_optional` and `min_exercises` drive soft hints in the builder (e.g. "Arm work usually has 3+"), never hard validation.

A mat-class template (fewer blocks) is **to be defined by the instructor**; do not invent it.

Exercises: the real list (`exercises.block.csv`, supplied with this plan) is **private data, not in git** (kept in git-ignored `supabase/seed/private/`; a small sample file is committed for CI). Import it with `npm run db:import -- <path>` as shared content with `review_status = 'needs_review'`. Columns: `name, block_key, equipment, level, series`. In `equipment`, `|` separates alternatives and `+` separates required groups (e.g. `reformer+box`, `mat|reformer|cadillac`). Rows sharing a `series` value become a `series` in CSV order. The instructor verifies each row in the admin screen; unverified rows are usable but flagged to admins.

## 8. User flows

**F1 — Sign in.** Magic link or Google → profile created on first login → lesson list.

**F2 — Browse and extend the library.** The same movement on several apparatus (same name and block) is shown as one library entry listing its versions; each version stays its own exercise row. List with search and filters (block, level, equipment, shared/mine) → create/edit a custom exercise: name, block, level, defaults, cues, equipment requirements with alternatives → archive instead of delete when used in a lesson. Shared exercises are read-only for normal users, with "duplicate as mine".

**F3 — Build a lesson (core flow).**
1. "New lesson" → title, date, level, target duration.
2. Choose a template (or blank) → slots are copied into the lesson.
3. Choose today's equipment: tick boxes, or load a preset.
4. Builder: blocks in order; each has "Add exercise" opening a picker pre-filtered to that block + available equipment + level, plus "Add series". A toggle shows unavailable exercises greyed out with the missing equipment named.
5. Drag to reorder items and blocks; skip a block; inline edit reps/springs/notes; running total duration vs. target; soft hints from the template.
6. Autosave on every change (optimistic). Mark as "ready".

**F4 — Export.** "Export PDF" opens a print-optimised view (one or two pages, block headers, exercises with reps/springs/notes, small logo) → browser print / save as PDF.

**F5 — Reuse.** Duplicate a lesson; save a lesson's structure as a private template.

**F6 — Templates and custom blocks.** Create/edit a private template: ordered slots with label, optional flag, minimum count. Create custom blocks.

**F7 — Curate (admin only).** Edit shared blocks, exercises, series, templates; review queue of `needs_review` exercises with verify / fix / delete.

## 9. Increments

Each increment is a vertical slice: migration + data layer + UI + tests, deployed to production.

### Increment 0 — Walking skeleton (done)
- Scaffold Vite + React + TS, Tailwind, shadcn/ui themed with section 3 tokens, routing, i18n (`en`/`he`, RTL switch), lint, Vitest, Playwright.
- Supabase project, local dev via Supabase CLI, first migration: `profiles` (with `role`) + RLS + create-on-signup trigger + `is_admin()`.
- Auth: email magic link only for now, with the auth code structured so Google sign-in can be added later without rework (no Google button until OAuth credentials exist). Protected routes, sign out. App bar with logo placeholder.
- CI workflow; production deploy on Cloudflare Workers static assets with preview builds (build command `npm run build`, deploy command `npx wrangler deploy`, `wrangler.jsonc` as in section 4). Build-time variables, set in Cloudflare's build settings: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If either is missing the app shows a clear configuration error screen instead of failing silently.
- Keep-alive: `.github/workflows/keep-supabase-alive.yml`, scheduled twice a week (`cron: '17 6 * * 1,4'`) plus `workflow_dispatch`. It sends one GET to the Supabase REST API selecting one row from a tiny public-read `keep_alive` table (created in the first migration with one row, RLS enabled, a policy allowing anonymous `SELECT` only, and `GRANT SELECT` to `anon`), using repo secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (sent as the `apikey` header only; publishable keys are not JWTs). It **fails the job on any non-2xx response** so GitHub emails the repo owner if it stops working.
- **Done when:** the partner signs in on the production URL, sees a branded empty home screen, can switch English/Hebrew, CI is green, and a manual run of the keep-alive workflow succeeds.

### Increment 1 — Shared library (done)
- Migrations: `methods`, `blocks`, `equipment`, `exercises`, `exercise_equipment` + RLS.
- Seed blocks and equipment (inside the migration, so `db push` applies them to the hosted project); local CSV import script for exercises (insert-only, deterministic ids, secret key from the environment) and a `save_exercise` RPC that writes an exercise and its equipment requirements atomically under RLS.
- F2 and the exercise part of F7 (review queue). `isExerciseAvailable` with unit tests.
- **Done when:** the seeded library is browsable and filterable, the partner (admin) can verify and correct shared exercises, and any user can add a private one.

### Increment 2 — Lesson builder (first real value)
- Migrations: `lessons`, `lesson_equipment`, `lesson_slots`, `lesson_items` + RLS + cross-user isolation test.
- F3 with a hard-coded default: a new lesson gets the 12 slots of section 7 (`DEFAULT_BLOCK_SLOTS` in `src/domain/lesson.ts`, temporary until Increment 3 seeds the template). No templates UI, presets, or series yet. `lesson_items.exercise_id` has no ON DELETE action: an exercise used in a lesson can't be deleted, only archived. Atomic RPCs: `create_lesson`, `duplicate_lesson`, `reorder`.
- Lesson list: drafts / ready / taught, duplicate, delete.
- F4 PDF export.
- **Done when:** the partner plans a real lesson, prints it, and teaches from it.

### Increment 3 — Templates, series, presets
- **Status:** 3a (templates + custom blocks) and 3b (series) are live; 3c (presets) is built, so Increment 3 is complete pending the "done when" check with the instructor. 3c: `equipment_presets` + `equipment_preset_items` (own-only RLS), RPC `save_preset` (saving under an existing name replaces that preset), `PresetBar` (load / save as preset) in the new-lesson form and the builder header, and a presets list (rename, delete) on the Templates page. Remembering the last-used preset was left out on purpose (a surprise auto-apply is worse than one click). 3b: `series` + `series_items` (shared/own RLS, `service_role` insert grant for the import), RPCs `save_series` and `add_series_to_slot` (appends a series to a lesson block in order with each exercise's defaults, skipping archived ones), "Add series" dialog per block (greyed with the missing equipment named), `/series` list + editor, and the importer builds series from the CSV `series` column (`--series-only` adds just series to a populated database, skipping existing ones and missing exercises). 3a: the 12-block default is now the seeded shared template (fixed id `5f0b7a52-3c8e-4d1a-9b64-2e7c1a9d0b01`); `create_lesson` takes `template_id` (blank lesson when omitted); the soft-hint columns live on `lesson_slots`; builder can add/remove blocks and "Save as template"; `/templates` lists shared + own with an editor (admins edit shared; others duplicate) and a "My blocks" panel; RPCs `save_template`, `save_lesson_as_template`, `reorder('template_slots')`. `DEFAULT_BLOCK_SLOTS` is gone. The mat-class template is still **not** defined (instructor's content).
- Migrations: `templates`, `template_slots`, `series`, `series_items`, `equipment_presets`, `equipment_preset_items`; move the 12-block default into a seeded shared template.
- F5, F6; template step and "Add series" in F3; presets in the equipment step; admin editing of shared templates and series.
- **Done when:** a new lesson from a template + preset takes under a minute to set up.

### Increment 4 — Polish and install
- Web app manifest and icons (installable PWA, online only), responsive pass for phone use in the studio, real logo SVGs, optional olive dark theme, accessibility/contrast pass.
- Read-only "teach view" of a ready lesson: large type, step through exercises.
- **Done when:** the partner uses it from her phone's home screen during a class.

### Increment 5 — More methods
- Seed `dynamic` and `classic` with their blocks; method picker in lesson and template creation; library filter by method.
- Should need seed data and small UI additions only. If more code changes are needed, a block-method assumption leaked into code; fix that first.
- **Done when:** a lesson can be built in each method with no method-specific code paths.

### Increment 6 — Public readiness
- Open sign-up, onboarding (language, method, first equipment preset).
- Account deletion and data export; terms/privacy pages; error monitoring; rate limits; basic analytics.
- Decide branding for the public product (Unda-branded vs. neutral) and review D6 with legal advice before launch.
- Optional: subscriptions (Stripe via Edge Function webhook → `subscriptions` table, feature gates).
- **Done when:** a stranger can sign up, build a lesson from the shared library, and cannot see anyone else's data.

### Increment 7 — Store apps
- Capacitor wrapper, native auth redirect handling, icons/splash, store listings.
- **Done when:** installable from TestFlight and Play internal testing with the same backend and accounts.

### Backlog (not scheduled)
- Equipment **quantities** vs. class size: `quantity` on `lesson_equipment` and preset items, `class_size` on lessons, per-exercise "one per student" flag.
- Offline app cache (persisted query cache + service worker) if PDF proves insufficient.
- Translated content (`name_he` etc. or a translations table).
- Exercise media (Supabase Storage); only original media.
- Auto-suggest a lesson from template + equipment + level + "not used in the last N lessons".
- Studios/teams: `organizations` + membership, shared studio libraries (adds `org_id` beside `owner_id`).
- Sharing a lesson by link; class/client history; contraindication tags.
- **Backups:** the free Supabase plan has no point-in-time recovery. Add a scheduled `pg_dump` (GitHub Actions or a local script) to private storage, and test a restore. Also the place to keep the private exercise CSV.
- **Staging and production:** Cloudflare preview builds share the production Supabase project, so they are not a safe place to test migrations. Before the first real release: a second Supabase project (`unda-flow-stg`), a second Worker built from a `staging` branch with its own `VITE_SUPABASE_*`, a keep-alive for it, and the flow PR -> `staging` -> `db push` to stg -> verify -> `main` -> `db push` to prod.
- **Go public (portfolio, planned after Increment 4):** licence is PolyForm Noncommercial 1.0.0 with the brand carve-out in the README. Checklist: (1) strip `supabase/seed/exercises.block.csv` from all git history with `git filter-repo` right before the switch (force-push; the repo is private until then), (2) run a secret scan (gitleaks) over the history, (3) write the architecture README, (4) trim personal notes from PLAN.md/CLAUDE.md if wanted, (5) confirm no private data under `supabase/seed/private/` is tracked. The logo SVGs may stay in the repo: the licence does not cover them.
- Display name: the greeting currently uses the email prefix (set by the signup trigger). Let users set their real name (`profiles.display_name` is already user-editable); Google sign-in will fill it automatically. Planned alongside Google OAuth.

## 10. Working conventions for Claude Code

- One increment per branch/PR series; keep `main` deployable.
- Migration and RLS first, regenerate types, then data hooks, then UI.
- No table without RLS. The hosted project has the Data API on, "Automatically expose new tables" **off** and automatic RLS on, so every migration that creates a table must (a) still run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` explicitly, so local and hosted behave the same, and (b) explicitly `GRANT` the needed privileges to `authenticated`, and to `anon` only where anonymous access is intended. Never rely on default privileges: local Supabase may grant them automatically and hide a missing grant until production.
- Supabase keys: use the publishable key (`sb_publishable_...`, replaces "anon") in the client and the secret key (`sb_secret_...`, replaces "service_role") only in local seed/import scripts. Do not use the legacy JWT keys. The secret key never goes in client code, GitHub secrets, or Cloudflare settings.
- Secrets never go in the repo: local values in `.env.local` (git-ignored), with a committed `.env.example` listing the variable names (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Every string through i18n; no physical-direction CSS (`ml-`, `left-`).
- Colours only via theme tokens.
- Unit-test everything in `src/domain`; one Playwright smoke test per flow as it lands.
- Ask rather than guess on anything that changes the data model or the seed content.
