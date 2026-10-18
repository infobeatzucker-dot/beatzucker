# Admin listening-example alignment fix – prepared, not deployed

Reproduced with the operator-supplied `Jump into my Bed.wav` and `beatzucker_Jump_into_my_Bed_mp3320.mp3`, excerpt start 147 seconds. Source files were read only.

## Cause and correction

Existing broadband anchor confidence at +8 seconds was approximately .466. The 1 kHz low-pass fallback anchors scored approximately .519/.595, below the existing .65 threshold. That rejected a legitimate original/master pair after tonal/phase/dynamics changes; it did not establish that the songs were different or that mastering had failed.

Added a last-resort analysis-only path: four independent 250 Hz anchors must ALL exceed .65 and their inferred offsets must agree within 2 ms. A separate spectral temporal-content check must also corroborate the match: at least four energetic, time-varying frequency bands, at least four log-energy envelope correlations >= .75, median correlation >= .8. Static tonal balance alone is not evidence. In this pair the seven envelope correlations are around .978–.993. Existing broadband and 1 kHz paths are unchanged.

No matching filter, EQ, gain normalization or waveform transformation is applied to the published audio. Encoding, boundary fades, original levels, measurement, bounded decode duration, atomic file ownership and publication safeguards remain unchanged. No bypass/manual forced publication of uncertain pairs added. Rejection now offers clearer DE/EN guidance.

## Verification

- Actual pair now prepares both 24-second MP3 previews at second 147; original metadata (file size/mtime) unchanged.
- Decoded excerpt measurements: original -16.19 LUFS / -3.37 dBTP; master -12.34 LUFS / -0.85 dBTP. These describe the preview files, not a new master or whole-song measurements.
- Added tests for phase-tolerant fallback with independent content confirmation, unrelated material rejection even with tempting candidate offsets, unstable-offset rejection and silent content.
- Existing excerpt/export/ownership/cancellation tests and admin publication tests are run separately. No existing live assets replaced by this local regression run.

Pure admin workflow correction: per RELEASING.md no separate public release-history entry; visible version remains 1.3.0. No mastering DSP or frontend behavior changed. Deployment remains required before the server upload benefits from the fix.
