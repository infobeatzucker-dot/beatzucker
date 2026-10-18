# Optional separation worker – NOT activated by the standard deploy

Vocal Remover and four-stem separation share one CPU Demucs engine. Model weights and PyTorch are deliberately absent from the normal mastering image. No audio is sent to an external model provider.

## Activation checklist (operator action after server expansion)

1. Allocate a dedicated worker with at least 8 GB host RAM and two CPU cores. The opt-in Compose profile limits this container to 4 GB, two CPUs and one inference at a time. Do not enable on the existing 4 GB application server while mastering is active. A Linux cgroup/OOM and concurrent-mastering test remains required on the upgraded server.
2. Review the actual model license/terms before public operation. Code: https://github.com/adefossez/demucs (MIT); model: https://huggingface.co/adefossez/HTDemucs. The model card does not itself provide a complete license statement. No assumption that a code license automatically resolves model or music rights.
3. Provision a Hugging Face cache offline using the approved revision `cbc8a9b1a87023b7fd74e7b3412e6321c0eab003`. Verify `955717e8.safetensors` SHA256 `d9fa14133cfcc034a6758923bb3a8ca9f8dfd0b582134643bbf83f72c17576dd`, retain configuration files and cache `refs/main`, and set `STEM_MODEL_CACHE` to that cache root. The worker defaults to `HF_HUB_OFFLINE=1`; jobs must never download arbitrary updated models. Do not mount a general home directory or personal HF credentials.
4. Set an independently generated `STEM_WORKER_SECRET` (32+ random characters) in worker and application, plus `STEM_WORKER_URL` and `STEM_TOOLS_ENABLED=true` in the app. Do not reuse NEXTAUTH_SECRET or Python DSP credentials. Never commit secrets. Default is disabled; pages explain this honestly.
5. Start only explicitly: `docker compose -f stem-worker/compose.yaml --profile separation up -d --build`. Port 8020 binds to host loopback only. Do not open the port publicly. The Next container cannot reach host loopback by using `localhost`; configure a private Docker network (and ensure normal deploy/rollback reattaches it) or a private authenticated TLS worker endpoint on the expanded server. This network integration intentionally requires operator setup, not an automatic change to the existing deployment script.
6. Test actual preview, full job, download, revocation and restart on the upgraded server before enabling access. Grant either permission separately in Admin → Users. This does not automatically detect donations or create paid contracts.

## Limits and data

- Signed-in users only; 40 MB uploads, at most six-minute full audio; trials decode only the first 20 seconds. Audio decoder allows only known audio containers and pipe input, no remote URL protocols/playlists.
- Queue persisted in separate SQLite: four active/queued/uploading jobs globally, one per account; one consumer. Exactly one Uvicorn process/replica per queue volume. Restart marks interrupted processing as failed; waiting jobs survive. Do not scale replicas against this volume.
- Daily UTC limit, shared across both tools: three preview attempts, two full attempts. Failed processing also counts, to prevent unbounded expensive retries. Mastering quotas unaffected. Upload rejection before enqueue does not count.
- Full processing is authorized in Next against current DB fields; every full stem fetch checks them again. Worker receives only a keyed pseudonymous owner, never account email. Worker secret + owner scope required on every endpoint.
- Preview users receive only excerpt files; no full-track files are produced. Hiding a download button cannot stop audio recording and is not DRM.
- Original removed after processing/failure, results and job records expire at 24 hours; active processing has a 30-minute timeout. Cleanup resumes when the worker runs. Stopped workers cannot physically delete files until restarted. Queued originals may remain until processing or expiry.
- WAV float output avoids independent stem normalization. The player is a stem audition selector, not a synchronized multitrack DAW. Download the original-aligned WAV stems for DAW mixing. No guarantee of artifact-free isolation.
- No production Docker/Compose build, model-license clearance, live activation or Linux resource test is claimed by the local implementation.
