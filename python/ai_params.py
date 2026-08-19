"""
Rule-based mastering parameter selection.
Takes audio analysis data and returns professional mastering parameters
based on genre presets, spectral/dynamic analysis, and reference-track matching.
"""

from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class MasteringParams:
    genre: str = "Unknown"
    style: str = "Balanced"
    target_lufs: float = -14.0
    true_peak_ceiling: float = -1.0
    highpass_freq: int = 30
    low_shelf_freq: int = 80
    low_shelf_gain: float = 0.0
    mid_notch_freq: int = 280
    mid_notch_gain: float = -1.0
    mid_notch_q: float = 2.0
    presence_freq: int = 3000
    presence_gain: float = 0.5
    air_freq: int = 12000
    air_gain: float = 1.5
    mb_sub_threshold: float = -18.0
    mb_sub_ratio: float = 3.0
    mb_sub_attack: int = 80
    mb_sub_release: int = 200
    mb_low_threshold: float = -20.0
    mb_low_ratio: float = 2.5
    mb_mid_threshold: float = -22.0
    mb_mid_ratio: float = 2.0
    mb_high_threshold: float = -24.0
    mb_high_ratio: float = 1.8
    stereo_width: float = 1.0
    saturation_amount: float = 0.15
    # Calibrated for the -18 LUFS internal reference and the stateful detector in
    # mastering.compress_band(). The stage is additionally capped at 2 dB GR.
    bus_comp_threshold: float = -20.5
    bus_comp_ratio: float = 2.0
    processing_intensity: int = 65
    notes: str = ""


PLATFORM_LUFS = {
    "spotify":    -14.0,
    "apple":      -16.0,
    "youtube":    -14.0,
    "tidal":      -14.0,
    "amazon":     -14.0,
    "deezer":     -15.0,
    "tiktok":     -13.0,
    "soundcloud":  -8.0,
    "club":        -9.0,
    "broadcast":  -23.0,
    "custom":     -14.0,
}


def apply_intensity_scaling(params: MasteringParams, intensity: int) -> MasteringParams:
    """Scale all processing parameters based on intensity (0–100).

    0%   = fully transparent (unity gain, no compression, no saturation)
    65%  = balanced default
    100% = maximum processing
    """
    t = max(0.0, min(1.0, intensity / 100.0))
    params.processing_intensity = int(round(t * 100))

    # EQ gains — scale toward 0 at low intensity
    params.low_shelf_gain *= t
    params.mid_notch_gain *= t
    params.presence_gain  *= t
    params.air_gain       *= t

    # Compression ratios — blend from 1.0 (unity) toward AI-selected ratio
    params.mb_sub_ratio   = 1.0 + (params.mb_sub_ratio  - 1.0) * t
    params.mb_low_ratio   = 1.0 + (params.mb_low_ratio  - 1.0) * t
    params.mb_mid_ratio   = 1.0 + (params.mb_mid_ratio  - 1.0) * t
    params.mb_high_ratio  = 1.0 + (params.mb_high_ratio - 1.0) * t
    params.bus_comp_ratio = 1.0 + (params.bus_comp_ratio - 1.0) * t

    # Pull the threshold above typical detector level at low intensity.
    params.bus_comp_threshold = -18.0 + (params.bus_comp_threshold - (-18.0)) * t

    # Saturation — scale linearly
    params.saturation_amount *= t

    # Stereo width — blend toward 1.0 (no widening) at low intensity
    params.stereo_width = 1.0 + (params.stereo_width - 1.0) * t

    params.notes += f" Intensity: {intensity}%."
    return params


# ─── Manuelle Nachjustierung ──────────────────────────────────────────────────
#
# Erlaubte Felder fuer manuelle Overrides samt zulaessigem Wertebereich. Diese
# Werte kommen aus dem Browser und gehen direkt in die DSP-Kette — deshalb strikt
# per Whitelist gefiltert und geklemmt, statt sie ungeprueft zu uebernehmen.
# Bewusst NICHT enthalten: target_lufs und true_peak_ceiling. Beide sind durch
# die gewaehlte Plattform vorgegeben und schuetzen davor, dass ein Master die
# Ceiling reisst — die duerfen nicht per Regler ausgehebelt werden.
OVERRIDE_RANGES: dict = {
    "highpass_freq":      (20.0, 200.0),
    "low_shelf_gain":     (-6.0,   6.0),
    "mid_notch_gain":     (-6.0,   6.0),
    "presence_gain":      (-6.0,   6.0),
    "air_gain":           (-6.0,   6.0),
    "mb_sub_threshold":  (-30.0,   0.0),
    "mb_sub_ratio":        (1.0,   8.0),
    "mb_low_threshold":  (-30.0,   0.0),
    "mb_low_ratio":        (1.0,   8.0),
    "mb_mid_threshold":  (-30.0,   0.0),
    "mb_mid_ratio":        (1.0,   8.0),
    "mb_high_threshold": (-30.0,   0.0),
    "mb_high_ratio":       (1.0,   8.0),
    "stereo_width":        (0.5,   2.0),
    "saturation_amount":   (0.0,   0.5),
    "bus_comp_threshold":(-32.0, -10.0),
    "bus_comp_ratio":      (1.0,   3.0),
}

INT_OVERRIDE_FIELDS = {"highpass_freq"}


def apply_overrides(params: MasteringParams, overrides: Optional[dict]) -> MasteringParams:
    """Manuell eingestellte Werte ueber die automatisch berechneten legen.

    Wird BEWUSST nach apply_intensity_scaling() aufgerufen: die Oberflaeche zeigt
    dem Nutzer die fertig skalierten Endwerte an, also sind die zurueckgegebenen
    Werte ebenfalls Endwerte und duerfen nicht noch einmal skaliert werden.
    """
    if not overrides:
        return params

    applied = []
    for key, value in overrides.items():
        if key not in OVERRIDE_RANGES:
            continue  # unbekanntes Feld — ignorieren statt vertrauen
        try:
            v = float(value)
        except (TypeError, ValueError):
            continue
        if v != v or v in (float("inf"), float("-inf")):
            continue  # NaN/Inf abweisen
        lo, hi = OVERRIDE_RANGES[key]
        v = max(lo, min(hi, v))
        setattr(params, key, int(round(v)) if key in INT_OVERRIDE_FIELDS else v)
        applied.append(key)

    if applied:
        params.notes += f" Manuell angepasst: {len(applied)} Parameter."
    return params


def get_mastering_params(
    analysis: dict,
    platform: str = "spotify",
    preset: str = "auto",
    intensity: int = 65,
    target_lufs: Optional[float] = None,
    reference_analysis: Optional[dict] = None,
    overrides: Optional[dict] = None,
) -> MasteringParams:
    """Rule-based mastering parameters from genre presets + audio analysis."""
    return get_default_params(analysis, platform, preset, intensity, target_lufs, reference_analysis, overrides)


def get_default_params(analysis: dict, platform: str, preset: str, intensity: int = 65,
                       target_lufs: Optional[float] = None,
                       reference_analysis: Optional[dict] = None,
                       overrides: Optional[dict] = None) -> MasteringParams:
    """Parameters based on preset and analysis."""
    params = MasteringParams()
    params.target_lufs = PLATFORM_LUFS.get(platform, -14.0)
    if platform == "custom" and target_lufs is not None:
        params.target_lufs = float(max(-23.0, min(-6.0, target_lufs)))

    # Adjust based on preset
    preset_configs = {
        "electronic": {"stereo_width": 1.2, "saturation_amount": 0.2,  "air_gain": 2.0,  "mb_sub_threshold": -16.0},
        "hiphop":     {"stereo_width": 1.0, "saturation_amount": 0.25, "mb_sub_threshold": -14.0, "mb_sub_ratio": 4.0},
        "trap":       {"stereo_width": 1.05,"saturation_amount": 0.2,  "mb_sub_threshold": -12.0, "mb_sub_ratio": 5.0, "air_gain": 2.0},
        "dance":      {"stereo_width": 1.15,"saturation_amount": 0.18, "air_gain": 1.8,  "mb_sub_threshold": -15.0, "bus_comp_ratio": 2.5},
        "rock":       {"stereo_width": 0.95,"saturation_amount": 0.3,  "presence_gain": 1.5, "presence_freq": 2500},
        "metal":      {"stereo_width": 0.9, "saturation_amount": 0.4,  "presence_gain": 2.0, "presence_freq": 3000, "mb_mid_ratio": 2.5, "bus_comp_ratio": 2.5},
        "pop":        {"stereo_width": 1.1, "saturation_amount": 0.15, "air_gain": 2.5},
        "rnb":        {"stereo_width": 1.05,"saturation_amount": 0.2,  "low_shelf_gain": 1.0, "presence_gain": 0.8, "mb_sub_threshold": -16.0},
        "latin":      {"stereo_width": 1.1, "saturation_amount": 0.15, "presence_gain": 1.2, "air_gain": 1.5},
        "country":    {"stereo_width": 0.9, "saturation_amount": 0.12, "presence_gain": 1.0, "presence_freq": 2800},
        "jazz":       {"stereo_width": 0.8, "saturation_amount": 0.05, "mb_sub_ratio": 1.5},
        "classical":  {"stereo_width": 1.2, "saturation_amount": 0.02, "bus_comp_ratio": 1.5, "mb_sub_ratio": 1.5},
        "ambient":    {"stereo_width": 1.3, "saturation_amount": 0.03, "air_gain": 2.0,  "bus_comp_ratio": 1.3, "mb_sub_ratio": 1.3},
        "techno":     {"stereo_width": 1.0, "saturation_amount": 0.22, "mb_sub_threshold": -13.0, "mb_sub_ratio": 4.5, "presence_gain": 1.2, "bus_comp_ratio": 2.5},
        "edm":        {"stereo_width": 1.25,"saturation_amount": 0.18, "mb_sub_threshold": -14.0, "mb_sub_ratio": 4.0, "air_gain": 2.5, "bus_comp_ratio": 2.5},
        "lofi":       {"stereo_width": 0.85,"saturation_amount": 0.35, "low_shelf_gain": 1.5, "air_gain": -1.0, "bus_comp_ratio": 2.0},
        "podcast":    {"stereo_width": 0.7, "highpass_freq": 80, "presence_gain": 2.0, "presence_freq": 2000},
    }

    if preset in preset_configs:
        for key, value in preset_configs[preset].items():
            setattr(params, key, value)

    # Adaptive decisions use level-independent structure (LRA, crest and relative
    # band balance). Absolute upload level is deliberately ignored because the
    # DSP is gain-staged to -18 LUFS before these thresholds are applied.
    lra = float(analysis.get("lra", 8.0))
    crest = float(analysis.get("crest_factor", 10.0))
    if lra < 4.0 or crest < 7.5:
        params.bus_comp_threshold = -18.5
        params.bus_comp_ratio = max(1.2, params.bus_comp_ratio * 0.75)
    elif lra > 12.0 and crest > 11.0:
        params.bus_comp_threshold = -21.5
        params.bus_comp_ratio = min(3.0, params.bus_comp_ratio * 1.1)

    # Sub-bass adjustment from relative spectrum, not absolute file level.
    rms_sub = analysis.get("rms_sub", -30.0)
    rms_low = analysis.get("rms_low", -24.0)
    rms_mid = analysis.get("rms_mid", -24.0)
    if rms_sub > max(rms_low, rms_mid) - 3.0:
        params.mb_sub_threshold = max(params.mb_sub_threshold, -15.0)
        params.mb_sub_ratio = max(params.mb_sub_ratio, 3.5)

    # Loudness Range (LRA) guardrail — avoid double-squashing already-dynamics-
    # limited sources, and go a touch firmer on very dynamic raw mixes so the
    # bus compressor has something meaningful to do.
    if lra < 4.0:
        params.bus_comp_ratio = max(1.2, params.bus_comp_ratio * 0.8)
    elif lra > 12.0:
        params.bus_comp_ratio = min(4.0, params.bus_comp_ratio * 1.1)

    # Conservative tonal and stereo guardrails use additional measured values.
    centroid = float(analysis.get("spectral_centroid", 2500.0))
    if centroid < 1600.0:
        params.presence_gain += 0.5
        params.air_gain += 0.6
    elif centroid > 4500.0:
        params.presence_gain -= 0.5
        params.air_gain -= 0.8

    mono_compat = float(analysis.get("mono_compatibility", 1.0))
    if mono_compat < 0.2:
        params.stereo_width = min(params.stereo_width, 1.0)

    params.notes = f"Adaptive rules for {preset} preset targeting {platform} at {params.target_lufs} LUFS."
    params.genre = preset if preset != "auto" else "Adaptive"

    # Basic reference-matching adjustments (used when Claude API unavailable)
    if reference_analysis:
        src_centroid = analysis.get("spectral_centroid", 2000.0)
        ref_centroid = reference_analysis.get("spectral_centroid", 2000.0)
        centroid_diff = ref_centroid - src_centroid
        # Brighter reference → add air/presence; darker → reduce
        params.air_gain      = float(max(-3.0, min(4.0, params.air_gain      + centroid_diff / 2000.0 * 2.0)))
        params.presence_gain = float(max(-2.0, min(4.0, params.presence_gain + centroid_diff / 2000.0 * 1.0)))

        # Stereo width match.
        # ACHTUNG: "stereo_width" bedeutet hier zweierlei. Als MESSWERT (aus der
        # Analyse) ist es das Verhaeltnis Side-RMS/Mid-RMS — bei normaler Musik
        # etwa 0.3-0.5. Als PARAMETER ist es ein MULTIPLIKATOR auf das
        # Side-Signal (1.0 = unveraendert, siehe apply_ms_processing).
        # Frueher wurde der Messwert der Referenz direkt als Multiplikator
        # gesetzt: da typische Musik unter 0.5 misst, landete der Parameter
        # praktisch immer auf dem Clamp-Boden 0.5 — jeder Referenz-Track hat das
        # Stereobild eingeschnuert, egal ob die Referenz breiter oder schmaler
        # war als die Quelle. Korrekt ist das VERHAELTNIS beider Messwerte.
        ref_width = reference_analysis.get("stereo_width", 0.0)
        src_width = analysis.get("stereo_width", 0.0)
        if src_width > 0.01 and ref_width > 0.0:
            params.stereo_width = float(max(0.5, min(2.0, ref_width / src_width)))

        # Sub bass: if reference has less sub, tighten compression
        ref_rms_sub = reference_analysis.get("rms_sub", -24.0)
        src_rms_sub = analysis.get("rms_sub", -24.0)
        if src_rms_sub > ref_rms_sub + 3:          # source has significantly more sub
            params.mb_sub_ratio = min(6.0, params.mb_sub_ratio + 1.0)
            params.mb_sub_threshold = max(-20.0, params.mb_sub_threshold + 2.0)

        # Match low/mid balance with a small shelf move. Comparing each band to
        # its own mid band makes this independent of reference file loudness.
        src_low_balance = analysis.get("rms_low", -24.0) - analysis.get("rms_mid", -24.0)
        ref_low_balance = reference_analysis.get("rms_low", -24.0) - reference_analysis.get("rms_mid", -24.0)
        params.low_shelf_gain = float(max(-3.0, min(3.0,
            params.low_shelf_gain + (ref_low_balance - src_low_balance) * 0.25)))

        # Dynamics matching remains deliberately conservative. It nudges glue
        # compression but never changes the limiter ceiling or platform target.
        src_lra = float(analysis.get("lra", 8.0))
        ref_lra = reference_analysis.get("lra")
        if isinstance(ref_lra, (int, float)):
            dynamics_delta = src_lra - float(ref_lra)
            if dynamics_delta > 2.0:
                params.bus_comp_threshold -= min(1.5, dynamics_delta * 0.2)
                params.bus_comp_ratio = min(3.0, params.bus_comp_ratio + 0.2)
            elif dynamics_delta < -2.0:
                params.bus_comp_threshold += min(1.5, -dynamics_delta * 0.2)
                params.bus_comp_ratio = max(1.2, params.bus_comp_ratio - 0.2)

        # Never widen toward a reference that itself has weak mono compatibility.
        ref_mono = reference_analysis.get("mono_compatibility")
        if isinstance(ref_mono, (int, float)) and ref_mono < 0.2:
            params.stereo_width = min(params.stereo_width, 1.0)

        params.notes += " Reference track used for tonal, stereo and dynamics matching."

    # Manuelle Overrides ganz zuletzt — sie sind bereits Endwerte, siehe
    # apply_overrides(). Alles davor ist die automatische Herleitung, die der
    # Nutzer mit seinen Reglern gezielt uebersteuert.
    return apply_overrides(apply_intensity_scaling(params, intensity), overrides)
