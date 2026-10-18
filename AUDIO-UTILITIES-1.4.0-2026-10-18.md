# Prepared release 1.4.0 – WAV to MP3, Audio Cutter and Speech Cleaner

Prepared for release; server deployment must be verified separately. No changes to the mastering chain, quotas, login or stem entitlements. No new npm/Python dependencies.

## WAV to MP3

Public DE/EN pages `/tools/wav-to-mp3` and `/en/tools/wav-to-mp3`, anonymous use, quality 128/320 kbit/s, full MP3 audition/download. RIFF/WAVE signature and size checked server-side. Maximum 80 MB, mono/stereo, up to 10 minutes / 192 kHz input. Unsupported MP3 sample rates are mapped to the nearest MPEG-1 rate (32/44.1/48 kHz) for this converter, so the requested bitrate is not silently capped at 160k for low-rate inputs.

The new Next gateway sends an internal opt-in flag to the existing protected codec endpoint. Encoder default behaviour, ordinary codec previews and mastering exports are unchanged. No loudness normalization or mastering is applied. Encoded peak values are shown only when actually measured; a positive true peak produces a warning.

Shared DSP lease protects existing mastering capacity. One new conversion request at a time, global 60 attempts/hour, shared actual-byte multipart reservation, bounded output, deadlines, no arbitrary file paths or shell commands from clients. Random uploads are atomically claimed with `wx`; collision/error cleanup only deletes owned files. Normal completion/errors remove the upload; existing storage expiry cleanup handles exceptional orphans. Downloads are returned directly and held as object URLs in the browser, not persisted as masters.

## Audio Cutter

Public DE/EN pages `/tools/audio-cutter` and `/en/tools/audio-cutter`. Decode and waveform in browser, draggable pointer-captured A/B handles, keyboard and numeric time controls, selected-region preview, optional fades (default 5 ms; max 5 s and at most half the selection), full selection reset, 16/24-bit PCM or 32-bit float WAV download. Minimum selected duration 50 ms. No normalize/join/delete-middle function claimed.

Up to 80 MB browser-supported source; mono/stereo and decoded/render working-memory limits apply. Native rates preserved when the existing decoder can determine WAV/FLAC metadata. No audio upload. Sample-index cuts copy to a new buffer; sources remain unchanged. PCM export uses the existing real TPDF dither and overload rejection. Preview resume guards prevent stale playback after edits. WAV/waveform workers accept optional abort signals, without changing existing callers. Edits invalidate stale download links. Download object URLs are revoked when replaced/unmounted.

## Integration

13 usage-enabled tools in uniform cards; the speech card completes the row alongside the two gated separation cards. Stem access remains unchanged. DE/EN metadata, canonical/hreflang links, sitemap now 84 public URLs. Localized practice/FAQ/schema, reciprocal Knowledge links, provider-comparison table updated, existing anonymous admin tool statistics extended to the three new IDs. Privacy explanation distinguishes temporary MP3/speech server processing from local cutting. Public release notes are end-user focused.

## Podcast and Voice Cleaner

Public DE/EN `/tools/speech-cleaner` pages and bounded `/api/speech-clean` gateway. No sign-in. WAV/MP3/FLAC magic checked before upload; 80 MB input, 0.4 seconds to 5 minutes, mono/stereo, 16–192 kHz. Conventional FFmpeg spectral denoising (gentle/balanced/strong), optional 70 Hz high-pass, optional gentle linked compression and measured gain adjustment towards -19 LUFS mono / -16 stereo. Gain boost is capped at 12 dB and limited by -1 dBTP headroom; actual output is metered and may remain below target. No AI reconstruction, dereverb, music/speaker removal or clipping repair claimed.

48 kHz PCM24 WAV export with TPDF dither, unchanged duration/channel count. Actual input and output audition with position-preserving A/B buttons, metadata readiness and stale-switch guards. Settings invalidate obsolete downloads; object URLs revoked. Actual output LUFS/true peak/duration, not a quality score. Audio is not sent to an external AI provider or stored in mastering history.

One public request at a time, global 30 attempts/hour, shared multipart reservation, 160-second gateway / 140-second processing deadlines, one-thread FFmpeg, 96 MiB output bound. Protected private Python route uses the existing DSP lease, including disconnect-safe permit retention; normal music mastering is unchanged. Worker temporary directory and owned gateway inputs are cleaned. Output is delivered directly. The existing offline pre-deploy self-test now checks speech cleanup too, so missing FFmpeg filter support stops deployment before replacing the running site.

## Additional SEO

All six new DE/EN pages have localized titles/descriptions, reciprocal language and canonical links, visible practical instructions, truthful FAQs, app/breadcrumb structured data and honest formats/limits/privacy. New workflow links connect voice cleanup → cutting → MP3 export without claiming automatic file transfer. Relevant knowledge pages link back; only genuinely changed content dates updated. No doorway pages, invented reviews/ratings or ranking guarantees. References: https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://ffmpeg.org/ffmpeg-filters.html#afftdn.

## Validation

- Production build + TypeScript passed.
- Cut helper: exact frame count, stereo/source invariance, fade endpoints, bounds/memory budget.
- Gateway: origin/magic/bitrate rejection, rate limit, private worker contract, collision protection, concurrency and binary output/cleanup.
- Actual Chrome: pointer drag, keyboard, numeric selection, 3-second 24-bit stereo WAV download, source samples preserved relative to browser decoding, fades, playback, stale download invalidation and zero audio uploads from cutter; desktop/mobile layouts.
- Actual Chrome MP3 downloads at 128/320 kbit/s, ffprobe codec/bitrate/duration/channel verification and input cleanup. Additional actual 16 kHz WAV conversion through the public gateway passed at the requested 320 kbit/s.
- Three Python MP3-export tests include ten actual low/native/high-rate encodes and verify unchanged default-preview behaviour. All 16 existing codec/budget tests passed.
- Six speech Python tests passed: actual noise reduction, mono/stereo, low/native rates, WAV/MP3/FLAC input, all strengths, peak/gain budget, duration, source invariance, rejection, private authentication and lease retention after disconnect.
- Actual Chrome speech WAV download passed ffprobe PCM24/48kHz/channel/duration checks; playing A/B position preserved, settings invalidated old result, malformed source rejected, owned uploads removed, no page errors, mobile/desktop screenshots checked.
- All six new public DE/EN pages passed actual workflow-link, canonical/hreflang and app/breadcrumb/FAQ checks. All 84 public sitemap pages passed local HTTP checks.
- Existing tool-quality, browser-worker, guidance, usage-statistics, release/SEO tests passed. Existing 16 codec/budget and three MP3-export Python tests passed again after speech integration.
- QA screenshots/downloads live only under ignored `validation-output/audio-utilities-1.4/`; no production data, mail, payments or external audio processing provider used.

Server deployment and live smoke/user download checks remain outstanding. No live success claimed.
