# Prepared release 1.2.0 – not deployed

Includes all pending 1.1.0 listening-gallery and comparison-article improvements. Public history remains DE/EN and end-user focused.

## Implemented

- German/English Vocal Remover (vocals/instrumental) and Stem Separation (vocals/drums/bass/other), discoverable in Tools and sitemap.
- Separate per-user admin switches, additive SQLite boolean columns default false; included in portable account export. Normal mastering quota and DSP code unchanged.
- Authenticated short trials even without entitlement. Private worker actually processes at most 20 seconds for trials; no full audio is produced or delivered for those jobs. Browser audio can still be recorded; no false DRM guarantee.
- Re-check DB entitlement at full job submission and every full audio fetch. Current password/session version verified. Private worker authenticates service + pseudonymous owner; no user-supplied file paths or audio URLs accepted.
- Optional private CPU Demucs worker with persistent bounded queue, one inference process at a time, timeout, startup recovery, 24-hour expiry, independent per-account daily attempt limits and free-space guard.
- Pinned HF model cache revision and SHA256 checked before inference; offline operation, no arbitrary pickle model fallback. Restricted audio demuxers and pipe-only input.
- Ordinary app image/deploy does not install or start PyTorch. Optional Docker Compose profile: non-root, readonly root, private volumes, capability removal, 4 GB RAM / 2 CPU limit. Disabled by default in the app.

## Validation completed locally

- Production build + TypeScript passed.
- Six private-worker test groups: authorization/owner isolation, actual-byte upload limit, daily limits, global queue ceiling, expiry, interrupted-job recovery and persistence of queued work.
- Actual Demucs model with user's On Tour source: 20-second preview and 2-second full-mode case; all four stereo WAV stems finite and correct duration. No source audio sent to an external provider. Full-track 187-second resource benchmark remains documented separately in STEM-RESOURCE-TEST-2026-10-18.md.
- Actual HTTP integration through the built Next application: credentials login, unauthorized full-job rejection, trial processing/output, cross-account denial, admin activation, independent tool permissions, full instrumental WAV download, immediate revocation.
- Fresh Chrome test profile: signed-in DE/EN tool controls, upload selection with full-access lock, mobile width without horizontal overflow; desktop/mobile screenshots inspected.
- All 78 public sitemap pages passed real HTTP SEO checks. Existing tool-quality, account-security, quota, rollback, metadata, comparison and public-release-audience checks passed.

## Required before live activation

No commit, push, deployment or production worker activation performed. See stem-worker/README.md for activation checklist.

Server expansion, private network integration that survives deploy/rollback, model-license review and real Linux cgroup / concurrent-mastering load test remain operator activation gates. Local Windows tests do not prove Linux production resource safety. Do not turn STEM_TOOLS_ENABLED on before these are satisfied. A normal website deployment may keep the tools explicitly unavailable until then.
