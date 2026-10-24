"""
Rule-based mastering parameter selection.
Takes audio analysis data and returns professional mastering parameters
based on genre presets, spectral/dynamic analysis, and reference-track matching.
"""

from dataclasses import dataclass, asdict, field
from typing import Optional
from reference_matching import resolve_reference, reference_curve, bound_curve, profiles_compatible


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
    bass_mono_amount: float = 0.0
    final_air_gain: float = 0.0
    release_scale: float = 1.0
    comp_knee_db: float = 4.0
    processing_intensity: int = 65
    manual_active: bool = False
    reference_eq: list = field(default_factory=list)
    dynamic_eq_amount: float = 0.0  # old saved parameter sets remain unchanged
    section_plan: Optional[dict] = None
    section_offset: float = 0.0
    character: float = .5
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
    params.final_air_gain *= t
    params.bass_mono_amount *= t
    params.reference_eq = [{**item,"gain":item["gain"]*t} for item in params.reference_eq] if t else []
    params.dynamic_eq_amount *= t

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
    "bass_mono_amount":    (0.0,   1.0),
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
    changed = False
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
        final_value = int(round(v)) if key in INT_OVERRIDE_FIELDS else v
        changed = changed or abs(float(getattr(params, key)) - final_value) > 1e-6
        setattr(params, key, final_value)
        applied.append(key)

    if applied:
        params.manual_active = changed
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
    character: float = .5,
) -> MasteringParams:
    """Rule-based mastering parameters from genre presets + audio analysis."""
    return get_default_params(analysis, platform, preset, intensity, target_lufs, reference_analysis, overrides, character)


def get_default_params(analysis: dict, platform: str, preset: str, intensity: int = 65,
                       target_lufs: Optional[float] = None,
                       reference_analysis: Optional[dict] = None,
                       overrides: Optional[dict] = None, character: float = .5) -> MasteringParams:
    """Parameters based on preset and analysis."""
    params = MasteringParams()
    import math
    from song_sections import valid_sections
    if isinstance(character,bool) or not isinstance(character,(int,float)) or not math.isfinite(character) or not 0<=character<=1:
        raise ValueError("Invalid character")
    params.character = float(character)
    params.section_plan = analysis.get('sections') if valid_sections(analysis.get('sections')) else None
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

    # Single legacy references remain compatible; new bundles have independent controls.
    reference_analysis = resolve_reference(reference_analysis)
    settings = reference_analysis.get("_settings", {"amount":1,"bass":0,"brightness":0,"smoothing":.65}) if reference_analysis else {}
    if reference_analysis and settings.get("amount",1)>0:
        before_reference = {key:getattr(params,key) for key in ("air_gain","presence_gain","stereo_width","mb_sub_ratio","mb_sub_threshold","low_shelf_gain","bus_comp_threshold","bus_comp_ratio")}
        params.reference_eq = bound_curve(reference_curve(analysis.get("tonal_profile"),reference_analysis))
        fine_reference = profiles_compatible(analysis.get("tonal_profile"),reference_analysis)
        src_centroid = analysis.get("spectral_centroid", 2000.0)
        ref_centroid = reference_analysis.get("spectral_centroid", 2000.0)
        centroid_diff = ref_centroid - src_centroid
        # Brighter reference → add air/presence; darker → reduce
        params.air_gain      = float(max(-3.0, min(4.0, params.air_gain      + centroid_diff / 2000.0 * 2.0)))
        params.presence_gain = float(max(-2.0, min(4.0, params.presence_gain + centroid_diff / 2000.0 * 1.0)))
        if fine_reference:
            params.air_gain = before_reference["air_gain"]
            params.presence_gain = before_reference["presence_gain"]

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

        # Relative sub/mid balance, never absolute file gain.
        ref_rms_sub = reference_analysis.get("rms_sub", -24.0)
        src_rms_sub = analysis.get("rms_sub", -24.0)
        ref_sub_balance = ref_rms_sub - reference_analysis.get("rms_mid", ref_rms_sub)
        src_sub_balance = src_rms_sub - analysis.get("rms_mid", src_rms_sub)
        if "rms_mid" in reference_analysis and "rms_mid" in analysis and src_sub_balance > ref_sub_balance + 3:
            params.mb_sub_ratio = min(6.0, params.mb_sub_ratio + 1.0)
            params.mb_sub_threshold = max(-30.0, params.mb_sub_threshold - 1.0)

        # Match low/mid balance with a small shelf move. Comparing each band to
        # its own mid band makes this independent of reference file loudness.
        src_low_balance = analysis.get("rms_low", -24.0) - analysis.get("rms_mid", -24.0)
        ref_low_balance = reference_analysis.get("rms_low", -24.0) - reference_analysis.get("rms_mid", -24.0)
        if all(key in reference_analysis and key in analysis for key in ("rms_low", "rms_mid")):
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
        if fine_reference:
            params.low_shelf_gain = before_reference["low_shelf_gain"]
        for key,original in before_reference.items():
            setattr(params,key,original+(getattr(params,key)-original)*settings.get("amount",1))
        if not fine_reference:
            params.low_shelf_gain += settings.get("bass",0)*settings.get("amount",1)
            params.air_gain += settings.get("brightness",0)*settings.get("amount",1)
        params.notes += f" References: {reference_analysis.get('_count',1)}; amount {settings.get('amount',1):.2f}; tonal matching: {'24-band active-frame profile, bounded 3 dB response' if fine_reference else 'legacy broad features'}."

    if reference_analysis and settings.get("amount",1)==0:
        reference_analysis = None  # exact no-reference restraint behaviour

    # A quiet export is not a dark mix: decide from air/high balance only.
    air_balance = analysis.get("rms_air", -80.0) - analysis.get("rms_high", -80.0)
    if air_balance < -16.0 and centroid < 4500:
        params.final_air_gain = 0.4

    # Limit already dense material instead of adding a second layer of squeeze.
    dense = crest < 7.5 or lra < 4.0
    balanced = 1600 <= centroid <= 4500 and -6 <= rms_low - rms_mid <= 4
    restraint = 0.4 if dense else 0.65 if balanced and preset == "auto" and not reference_analysis else 1.0
    for key in ("mb_sub_ratio", "mb_low_ratio", "mb_mid_ratio", "mb_high_ratio", "bus_comp_ratio"):
        setattr(params, key, 1.0 + (getattr(params, key) - 1.0) * restraint)
    params.saturation_amount *= restraint
    params.dynamic_eq_amount = restraint
    if balanced and preset == "auto" and not reference_analysis:
        for key in ("low_shelf_gain", "mid_notch_gain", "presence_gain", "air_gain", "final_air_gain"):
            setattr(params, key, getattr(params, key) * 0.5)
    # Slower recovery on dense programmes, faster on transient-rich material.
    params.release_scale = 1.25 if dense else 0.85 if crest > 13 else 1.0
    # No automatic bass narrowing without a measured low-band issue. Missing
    # metrics from older analyses preserve the image, not a guess of mono bass.
    bass_corr = analysis.get("bass_correlation", 1.0)
    bass_side = analysis.get("bass_side_ratio", 0.0)
    if bass_corr < 0.0 and bass_side > 0.65:
        params.bass_mono_amount = min(0.75, max(0.25, -bass_corr * 0.75))
    if dense:
        params.notes += " Dense source: restrained compression and saturation."

    # Manuelle Overrides ganz zuletzt — sie sind bereits Endwerte, siehe
    # apply_overrides(). Alles davor ist die automatische Herleitung, die der
    # Nutzer mit seinen Reglern gezielt uebersteuert.
    # Neutral is exactly the existing chain; never move platform/peak targets.
    delta = (character-.5)*2
    comp_scale = 1 + delta*(.25 if delta>=0 else .35)
    for key in ("mb_sub_ratio","mb_low_ratio","mb_mid_ratio","mb_high_ratio","bus_comp_ratio"):
        setattr(params,key,1+(getattr(params,key)-1)*comp_scale)
    params.saturation_amount = min(.5, params.saturation_amount*(1+delta*.65))
    return apply_overrides(apply_intensity_scaling(params, intensity), overrides)
