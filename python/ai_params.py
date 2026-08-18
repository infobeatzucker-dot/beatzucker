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
    # Kalibriert auf den Referenzpegel, auf den mastering.normalize_to_reference_lufs()
    # vor der Verarbeitung normalisiert (-18 LUFS), UND auf den Envelope-Detektor in
    # compress_band(): der vergleicht nicht den Momentanpeak, sondern eine ueber
    # attack/release geglaettete Huellkurve. Die liegt rund 11 dB unter dem Peak — bei
    # -18 LUFS Referenz erreicht sie ueber typisches Material maximal -19 bis -23 dB.
    # Der alte Wert -6.0 (aus der Zeit, als hier noch der ungeregelte Upload-Pegel
    # ankam) lag weit darueber und wurde nie ueberschritten: die Stufe war wirkungslos.
    # -28.0 ergibt nach Intensity-Skalierung (65%) rund -24.5 dB und damit ueber alle
    # Materialtypen hinweg 0.3-1.3 dB Gain-Reduktion = brauchbare Glue-Kompression.
    # Referenzpegel, Envelope-Zeitkonstanten und diese Schwelle haengen zusammen —
    # wird eines geaendert, muss neu kalibriert werden.
    bus_comp_threshold: float = -28.0
    bus_comp_ratio: float = 2.0
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

    # Bus comp threshold — bei niedriger Intensity zurueckziehen. Der Ankerwert
    # -18 dB liegt ueber der geglaetteten Huellkurve typischen Materials, greift
    # also praktisch nicht; zusaetzlich geht bus_comp_ratio bei t=0 ohnehin auf
    # 1.0:1 (= mathematisch keine Kompression), Transparenz ist damit doppelt
    # abgesichert. Anker und Basiswert sind auf den -18-LUFS-Referenzpegel
    # kalibriert, siehe Kommentar am Feld bus_comp_threshold.
    params.bus_comp_threshold = -18.0 + (params.bus_comp_threshold - (-18.0)) * t

    # Saturation — scale linearly
    params.saturation_amount *= t

    # Stereo width — blend toward 1.0 (no widening) at low intensity
    params.stereo_width = 1.0 + (params.stereo_width - 1.0) * t

    params.notes += f" Intensity: {intensity}%."
    return params


def get_mastering_params(
    analysis: dict,
    platform: str = "spotify",
    preset: str = "auto",
    intensity: int = 65,
    reference_analysis: Optional[dict] = None,
) -> MasteringParams:
    """Rule-based mastering parameters from genre presets + audio analysis."""
    return get_default_params(analysis, platform, preset, intensity, reference_analysis)


def get_default_params(analysis: dict, platform: str, preset: str, intensity: int = 65, reference_analysis: Optional[dict] = None) -> MasteringParams:
    """Parameters based on preset and analysis."""
    params = MasteringParams()
    params.target_lufs = PLATFORM_LUFS.get(platform, -14.0)

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

    # Auto-adjust based on analysis. Der Quellpegel selbst wird vor der Verarbeitung
    # wegnormalisiert; er dient hier nur noch als Indiz dafuer, wie stark die Quelle
    # bereits vorkomprimiert ist. Bereits laute (= dichte) Quellen bekommen eine
    # hoehere Schwelle (weniger zusaetzliche Kompression), sehr leise/dynamische eine
    # tiefere. Werte relativ zum Default -16.0, siehe Kommentar am Feld.
    integrated = analysis.get("integrated_lufs", -18.0)
    if integrated > -12:
        params.bus_comp_threshold = -26.0  # bereits dichte Quelle -> sanfter kleben
    elif integrated < -24:
        params.bus_comp_threshold = -30.0  # sehr dynamische Quelle -> etwas fester

    # Sub-bass adjustment
    rms_sub = analysis.get("rms_sub", -30.0)
    if rms_sub > -18:
        params.mb_sub_threshold = -12.0
        params.mb_sub_ratio = 4.0

    # Loudness Range (LRA) guardrail — avoid double-squashing already-dynamics-
    # limited sources, and go a touch firmer on very dynamic raw mixes so the
    # bus compressor has something meaningful to do.
    lra = analysis.get("lra", 8.0)
    if lra < 4.0:
        params.bus_comp_ratio = max(1.2, params.bus_comp_ratio * 0.8)
    elif lra > 12.0:
        params.bus_comp_ratio = min(4.0, params.bus_comp_ratio * 1.1)

    params.notes = f"Auto-selected for {preset} preset targeting {platform} at {params.target_lufs} LUFS."
    params.genre = preset if preset != "auto" else "Unknown"

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

        params.notes += " Reference track used for fallback spectral matching."

    return apply_intensity_scaling(params, intensity)
