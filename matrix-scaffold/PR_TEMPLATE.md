<!-- Use this template when opening the PR for the Matrix Dashboard MVP -->

## What I changed
- Added dashboard frontend (React + Vite) that connects to simulated backend
- Added SSE job events and agent chat simulation
- Acceptance checklist is in `matrix-scaffold/ACCEPTANCE.md`

## How to run locally
1. cd matrix-scaffold
2. docker-compose up --build
3. Open http://localhost:5173 and test Run -> Preview flow

## Acceptance checklist (short)
- [ ] docker-compose up runs backend + frontend
- [ ] Run an app in UI and confirm job completes and iframe previews
- [ ] Run `matrix-scaffold/test/smoke.ps1` (PowerShell) and verify pass
- [ ] Attach a short GIF/screencast showing Run -> Job -> Preview

## Notes
- This is an MVP in simulation mode. Next steps: Puppeteer snapshot worker, Docker-runner integration, persistent DB.
