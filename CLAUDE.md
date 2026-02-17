# Light House — Claude Code Project Guide

Light House is a lightweight uptime monitoring and observability SaaS (checks, logs, traces, alerts, billing).

**Full codebase reference:** Read `local/CODEBASE_REFERENCE.md` for models, routes, types, and patterns.

---

## Tech Stack

- **Backend:** Go (Fiber framework, GORM, PostgreSQL)
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Infrastructure:** Docker Compose (api, frontend, postgres, mailpit)

## Running Locally

```bash
docker compose up
```

| Service    | Port |
|------------|------|
| API        | 8080 |
| Frontend   | 3000 |
| PostgreSQL | 5432 |
| Mailpit UI | 8025 |

## Project Structure

```
backend/internal/
  handlers/    — API route handlers
  models/      — GORM models (singular filenames: check.go, not checks.go)
  billing/     — entitlements.go (limit checks), usage.go (counts), stripe.go
  middleware/  — auth.go (JWT + API key), ratelimit.go
  router/      — route definitions
  search/      — search DSL (types, builder, validator)
  worker/      — background check runner

frontend/
  app/         — Next.js pages
  components/  — React components
  contexts/    — auth.tsx (auth provider)
  hooks/       — data fetching hooks
  lib/         — api.ts (client + types), auth-server.ts

local/         — dev tools, docs, roadmap, phase specs
```

## Code Conventions

### Backend (Go)
- **Handler pattern:** `func Name(db *gorm.DB) fiber.Handler { return func(c *fiber.Ctx) error {...} }`
- **Auth context:** `orgID := c.Locals("orgID").(uint)` — plan comes from the org record
- **Error responses:** `c.Status(code).JSON(fiber.Map{"error": "message"})`
- **Soft deletes** via `gorm.DeletedAt` field
- **Billing checks:** Use `billing.CanCreateCheck()`, `billing.CanIngestLogs()`, etc.

### Frontend (TypeScript/React)
- `"use client"` directive for client components
- Tailwind for all styling
- API calls via `frontend/lib/api.ts`

## Dev Workflow

- **Roadmap:** `local/roadmap/roadmap.md` — 18-phase plan (MVP → SaaS → AI)
- **Phase specs:** `local/phases/phase-X.Y.md`
- **Workflow:** Audit existing code → plan approach → implement
- Do NOT auto-commit or push without asking
- Do NOT add unnecessary abstractions, comments, or docstrings to unchanged code
