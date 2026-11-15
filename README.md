# Unda Flow

A Pilates lesson planner. An instructor builds a lesson from a library of exercises filtered by the equipment available that day, reorders and tweaks it, and prints it.

Status: work in progress, used by one instructor. The full plan, data model and roadmap are in [PLAN.md](PLAN.md); working conventions are in [CLAUDE.md](CLAUDE.md). A full architecture write-up will replace this page.

## Stack

React + Vite + TypeScript, Tailwind, TanStack Router and Query, i18next (English and Hebrew, RTL), Supabase (Postgres, Auth, row-level security), Cloudflare Workers static assets, Vitest and Playwright.

## Run it locally

Needs Node 22+ and Docker (for the local Supabase stack). See the commands list in [CLAUDE.md](CLAUDE.md): `npm run db:start`, copy the printed URL and publishable key into `.env.local` (see `.env.example`), `npm run db:import` for sample data, then `npm run dev`.

## Licence

The source code is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE): you may read it and use it for non-commercial purposes, but not commercially.

**The licence covers the code only.** The Unda Pilates name, logo and brand assets are private property, all rights reserved, and are not licensed for any use.
