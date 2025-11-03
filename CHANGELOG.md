# Changelog

## Phase 0 + Bots v1 (feat/phase-0-core)

- Core
  - Nicholas orchestrator (job scheduler)
  - Event Bus + unified SSE endpoint `/events`
  - Runtime Engine (Docker with host fallback) + live logs (`job.log`)
  - Vector Memory (hashed embedding) + APIs
  - Graph relations (Project/Task/Job/Artifact/Memory) + neighbors API
  - Memory Provider + Cognitive Hooks: auto-ingest logs, auto-refresh summaries
  - Org-level memory provider (seed/search across projects)
- APIs
  - Projects/Jobs/Artifacts/Tasks endpoints
  - Memory: add/search; Org memory search
  - Summary: `/api/summary` (live project summary)
  - Nicholas: `/api/nicholas/plan`, `/api/nicholas/bootstrap`
  - Graph: `/api/graph/neighbors`
  - SSE: job/task status + logs
- Integrations
  - Slack notifications (webhook)
  - S3 logs upload (optional)
  - GitHub PR comments (optional)
- Frontend (Dashboard)
  - Live logs panel
  - Tasks live view
  - Memory search panel
  - Preview + snapshots list
- Ops/Resilience
  - Auto port selection with persistence to `storage/runtime/port.txt`
  - Worker host fallback (NODE_PATH) for snapshots
- Docs
  - README updates for Phase 0, Nicholas endpoints, integrations


