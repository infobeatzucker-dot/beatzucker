export type Lang = "de" | "en";
export type AppState = "idle" | "uploaded" | "analyzing" | "analyzed" | "mastering" | "done";
export type Platform  = "spotify" | "apple" | "youtube" | "club" | "tidal" | "amazon" | "deezer" | "tiktok" | "soundcloud" | "broadcast" | "custom";
export type Preset    = "auto" | "electronic" | "hiphop" | "rock" | "pop" | "jazz" | "classical" | "podcast" | "metal" | "rnb" | "ambient" | "lofi" | "country" | "trap" | "latin" | "dance" | "techno" | "edm";

export interface AnalysisData {
  integrated_lufs:    number;
  true_peak:          number;
  dr_value:           number;
  crest_factor:       number;
  lra:                number;
  rms_sub:            number;
  rms_low:            number;
  rms_mid:            number;
  rms_high:           number;
  rms_air:            number;
  spectral_centroid:  number;
  spectral_rolloff:   number;
  spectral_flatness:  number;
  stereo_width:       number;
  mono_compatibility: number;
  bpm:                number;
  key:                string;
  transient_density:  number;
  clipping_detected:  boolean;
  dc_offset:          number;
  duration_seconds:   number;
  sample_rate:        number;
  bit_depth:          number;
  channels:           number;
  /** Server signature binding this analysis to its uploaded file. */
  analysis_token?:    string;
}

export interface MasterData {
  master_id: string;
  selected_format?: string;
  formats: {
    wav32?:  string;
    wav24?:  string;
    wav16?:  string;
    flac?:   string;
    mp3320?: string;
    mp3128?: string;
    aac256?: string;
  };
  post_analysis: AnalysisData;
  notes: string;
  /**
   * Die Parameter, mit denen dieser Master tatsächlich gerendert wurde.
   * Die manuelle Nachjustierung startet ihre Regler damit, damit der Klang beim
   * ersten Reglerkontakt nicht unerwartet springt.
   */
  params?: Record<string, unknown>;
}

export interface UploadedFile {
  file_id:  string;
  upload_token: string;
  filename: string;
  duration: number;
  format:   string;
  size:     number;
}

export interface ProgressStep {
  step:     string;
  label:    string;
  progress: number;
}
