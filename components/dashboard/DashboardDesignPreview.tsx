"use client";

import { CheckCircle2, FileAudio, Play, SlidersHorizontal } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import AnalysisPanel from "@/components/AnalysisPanel";
import type { AnalysisData } from "@/lib/types/mastering";

const SAMPLE_ANALYSIS: AnalysisData = {
  integrated_lufs: -13.8,
  true_peak: -2.1,
  dr_value: 9,
  crest_factor: 11.4,
  lra: 7.2,
  rms_sub: -24.6,
  rms_low: -19.3,
  rms_mid: -17.8,
  rms_high: -22.1,
  rms_air: -29.4,
  spectral_centroid: 2860,
  spectral_rolloff: 11400,
  spectral_flatness: .18,
  stereo_width: 1.14,
  mono_compatibility: .84,
  bpm: 124,
  key: "F♯ minor",
  transient_density: .62,
  clipping_detected: false,
  dc_offset: 0,
  duration_seconds: 214,
  sample_rate: 44100,
  bit_depth: 24,
  channels: 2,
};

export default function DashboardDesignPreview() {
  return (
    <div className="dashboard-shell min-h-screen flex">
      <Sidebar previewPath="/dashboard" />
      <main className="dashboard-main flex-1 min-w-0 px-4 md:px-8 py-6 md:py-8">
        <div className="dashboard-content mx-auto">
          <div className="workspace-page-heading">
            <div>
              <span className="workspace-eyebrow">KI-MASTERING-STUDIO · DESIGNVORSCHAU</span>
              <h1>Verwandle deinen Sound.</h1>
              <p>Track hochladen, präzise analysieren und direkt als professionelles Master exportieren.</p>
            </div>
            <span className="workspace-free-badge"><i /> 100 % kostenlos</span>
          </div>

          <div className="preview-track-card">
            <button type="button" aria-label="Beispieltrack abspielen"><Play size={18} fill="currentColor" /></button>
            <span className="preview-file-icon"><FileAudio size={20} /></span>
            <span className="preview-track-copy"><strong>Midnight Drive.wav</strong><small>WAV · 24-bit · 44.1 kHz · 3:34</small></span>
            <span className="preview-track-ready"><CheckCircle2 size={14} /> Analyse abgeschlossen</span>
            <button type="button" className="preview-settings"><SlidersHorizontal size={15} /> Einstellungen</button>
          </div>

          <AnalysisPanel preAnalysis={SAMPLE_ANALYSIS} postAnalysis={null} isProcessing={false} />
        </div>
      </main>
    </div>
  );
}
