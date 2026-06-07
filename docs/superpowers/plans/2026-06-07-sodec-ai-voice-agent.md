# SODEC AI Voice Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-shaped SODEC Gabon AI voice agent demo covering Twilio phone, Twilio Media Streams, WhatsApp, OpenAI Realtime, ElevenLabs, Prisma/PostgreSQL, Redis/BullMQ, dashboard, tests, CI, and deployment documentation.

**Architecture:** Use an npm workspace monorepo with `apps/api` for Fastify and `apps/admin` for Next.js. Shared deterministic domain logic lives in `packages/shared` so safety rules, intent routing, and state machines are testable without network services.

**Tech Stack:** Node.js, TypeScript, Fastify, Prisma, PostgreSQL, Redis, BullMQ, Twilio, OpenAI Realtime API, ElevenLabs, Next.js, Vitest, ESLint, Docker Compose, GitHub Actions.

---

## File Structure

- `packages/shared/src/*`: French-only prompts, intent routing, escalation policy, state machines, PII masking, environment schema.
- `apps/api/src/*`: Fastify server, Twilio webhooks, Media Stream WebSocket, OpenAI Realtime bridge, ElevenLabs TTS client, BullMQ jobs, admin API.
- `apps/admin/src/app/*`: Next.js dashboard pages and auth placeholder.
- `prisma/schema.prisma`: PostgreSQL schema for callers, conversations, messages, payment promises, audit logs, and retention settings.
- `prisma/seed.ts`: Demo seed data for workflows.
- `tests/*`: Unit and integration tests for shared logic and API handlers.
- `.github/workflows/ci.yml`: Install, Prisma generate, typecheck, lint, test, build.
- `docker-compose.yml`: PostgreSQL, Redis, API, and admin services.
- `README.md` and `docs/production-checklist.md`: Runbook, Twilio URLs, scripts, limitations.

## Tasks

### Task 1: Governance and Plan

- [x] Create `.gitignore`, `AGENTS.md`, `docs/superpowers/spec.md`, and this plan.
- [ ] Commit as `chore: add project spec and agent rules`.

### Task 2: Workspace Scaffold

- [ ] Create root npm workspace files: `package.json`, `tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`.
- [ ] Create app and package TypeScript configs.
- [ ] Commit as `chore: scaffold monorepo workspace`.

### Task 3: Shared Domain Logic with TDD

- [ ] Write failing tests for intent routing, escalation policy, collections identity gating, French prompt constraints, and PII masking.
- [ ] Implement `packages/shared/src` logic until tests pass.
- [ ] Commit as `feat: add voice agent domain policy`.

### Task 4: Prisma and Seed Data

- [ ] Create `prisma/schema.prisma` and `prisma/seed.ts`.
- [ ] Add migration-ready models for conversations, messages, state, callers, payment promises, audit logs, and retention settings.
- [ ] Commit as `feat: add prisma data model`.

### Task 5: Fastify Backend

- [ ] Write API route tests for health, Twilio signature rejection, TwiML generation, WhatsApp routing, admin auth placeholder, and rate limiting.
- [ ] Implement Fastify app, config validation, masked logging, Twilio webhook validation, BullMQ queue wiring, and route modules.
- [ ] Commit as `feat: add fastify voice agent api`.

### Task 6: Voice and AI Integrations

- [ ] Add Media Stream WebSocket bridge to OpenAI Realtime.
- [ ] Add ElevenLabs TTS client and fallback TwiML speech behavior.
- [ ] Add WhatsApp voice-note handling path with queued processing.
- [ ] Commit as `feat: add realtime and tts integrations`.

### Task 7: Admin Dashboard

- [ ] Create Next.js dashboard with conversation overview, workflow status, safety escalations, payment promises, and retention settings.
- [ ] Add admin auth placeholder requiring `ADMIN_DEMO_TOKEN`.
- [ ] Commit as `feat: add admin dashboard`.

### Task 8: Docker, CI, Docs

- [ ] Add Dockerfiles, Docker Compose, GitHub Actions CI, README, and production checklist.
- [ ] Run required quality gates and fix failures.
- [ ] Push branch and open a PR if GitHub requires branch protection.

## Verification Commands

Run these before final push:

```bash
npm install
docker compose config
npm run typecheck
npm run lint
npm test
prisma generate
prisma migrate dev
npm run build
```

