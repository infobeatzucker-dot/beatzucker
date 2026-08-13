"use client";

/**
 * AudioEngineContext
 * Singleton Web Audio API engine shared across:
 *  - ABPlayer (playback + UI)
 *  - SpectrumAnalyzer, WaveformViewer, LUFSMeter, StereoField, DynamicsGraph (real-time data)
 *
 * Initialised lazily on first play click to satisfy browser autoplay policy.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { setGlobalAudioPlaying, setGlobalAudioAvailable, registerGlobalStop, registerGlobalToggle, getOrCreateAudioElement } from "@/lib/globalAudio";

export interface AudioEngineContextType {
  // AnalyserNodes for visualizers (null until first play)
  analyserMono: AnalyserNode | null;
  analyserL: AnalyserNode | null;
  analyserR: AnalyserNode | null;

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  // A/B state
  mode: "A" | "B";
  masterUnavailable: boolean;

  // Controls
  setMode: (m: "A" | "B") => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  playMaster: () => void;   // Switch to B + attempt autoplay from start

  // Current URLs (for display)
  originalUrl: string;
  masteredUrl: string;

  // Pre-decoded static waveform (null until decoded)
  staticWaveform:  Float32Array | null;   // A (original)
  peakWaveform:    Float32Array | null;   // A peaks
  staticWaveformB: Float32Array | null;   // B (mastered)
  peakWaveformB:   Float32Array | null;   // B peaks
}

const AudioEngineContext = createContext<AudioEngineContextType | null>(null);

export function AudioEngineProvider({
  children,
  originalUrl,
  masteredUrl,
}: {
  children: ReactNode;
  originalUrl: string;
  masteredUrl: string;
}) {
  const audioRef          = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const gainRef           = useRef<GainNode | null>(null);
  const rafRef            = useRef<number>(0);
  const masteredBlobRef   = useRef<string>("");   // Blob URL for reliable B seeking
  const modeRef           = useRef<"A" | "B">("A");

  const [analyserMono, setAnalyserMono] = useState<AnalyserNode | null>(null);
  const [analyserL,    setAnalyserL]    = useState<AnalyserNode | null>(null);
  const [analyserR,    setAnalyserR]    = useState<AnalyserNode | null>(null);

  const [isPlaying,         setIsPlaying]         = useState(false);
  const [currentTime,       setCurrentTime]       = useState(0);
  const [duration,          setDuration]          = useState(0);
  const [mode,              setModeState]         = useState<"A" | "B">("A");
  const [masterUnavailable, setMasterUnavailable] = useState(false);

  const [staticWaveform,  setStaticWaveform]  = useState<Float32Array | null>(null);
  const [peakWaveform,    setPeakWaveform]    = useState<Float32Array | null>(null);
  const [staticWaveformB, setStaticWaveformB] = useState<Float32Array | null>(null);
  const [peakWaveformB,   setPeakWaveformB]   = useState<Float32Array | null>(null);

  // Keep modeRef in sync with state so setMode closure always sees latest value
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Create/reuse audio element ───────────────────────────────────────────────
  // The element lives as a module-level singleton so audio keeps playing across
  // page navigations (e.g. home → account → home).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = getOrCreateAudioElement();
    audioRef.current = audio;
    setGlobalAudioAvailable(true);

    // Sync initial state in case audio was already playing before this mount
    setIsPlaying(!audio.paused);
    if (audio.duration) setDuration(audio.duration);
    setCurrentTime(audio.currentTime || 0);

    if (originalUrl && !audio.src.endsWith(originalUrl) && audio.paused) {
      audio.src = originalUrl;
    }

    const onMeta  = () => setDuration(audio.duration);
    const onPlay  = () => { setIsPlaying(true);  setGlobalAudioPlaying(true); };
    const onPause = () => { setIsPlaying(false); setGlobalAudioPlaying(false); };
    const onEnded = () => { setIsPlaying(false); setGlobalAudioPlaying(false); };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play",  onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    // currentTime ticker
    const tick = () => {
      setCurrentTime(audio.currentTime || 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      // On unmount (page navigation): keep audio playing, just detach listeners & RAF.
      // Audio will continue until the user stops it or a new master is loaded.
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play",  onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Decode static waveform helper ────────────────────────────────────────────
  const decodeWaveform = useCallback(async (url: string): Promise<{
    rms: Float32Array; peaks: Float32Array;
  } | null> => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const tmpCtx = new AudioContext();
      const decoded = await tmpCtx.decodeAudioData(arrayBuffer);
      await tmpCtx.close();

      const channel = decoded.getChannelData(0);
      const bars    = 800;
      const winSize = Math.floor(channel.length / bars);
      const rmsData  = new Float32Array(bars);
      const peakData = new Float32Array(bars);
      for (let i = 0; i < bars; i++) {
        let sum = 0, peak = 0;
        for (let j = 0; j < winSize; j++) {
          const s = Math.abs(channel[i * winSize + j] || 0);
          sum    += s * s;
          if (s > peak) peak = s;
        }
        rmsData[i]  = Math.sqrt(sum / winSize);
        peakData[i] = peak;
      }
      return { rms: rmsData, peaks: peakData };
    } catch {
      return null;
    }
  }, []);

  // ── Update src when originalUrl changes + decode A waveform ─────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !originalUrl) return;

    if (mode === "A") {
      if (!audio.src.endsWith(originalUrl)) {
        audio.src = originalUrl;
        audio.load();
      }
    }

    decodeWaveform(originalUrl).then((result) => {
      if (result) {
        setStaticWaveform(result.rms);
        setPeakWaveform(result.peaks);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalUrl]);

  // ── When masteredUrl becomes available: pre-fetch as Blob (enables seeking) ──
  useEffect(() => {
    if (!masteredUrl) return;

    setMasterUnavailable(false);

    // Fetch as blob so the audio element can seek regardless of server Range support
    fetch(masteredUrl)
      .then((r) => r.blob())
      .then((blob) => {
        // Revoke old blob URL if any
        if (masteredBlobRef.current) URL.revokeObjectURL(masteredBlobRef.current);
        masteredBlobRef.current = URL.createObjectURL(blob);

        // If currently in B mode, hot-swap to blob URL preserving position
        const audio = audioRef.current;
        if (audio && modeRef.current === "B") {
          const ct = audio.currentTime;
          const wasPlaying = !audio.paused;
          audio.pause();
          audio.src = masteredBlobRef.current;
          audio.load();
          audio.addEventListener("loadedmetadata", () => {
            audio.currentTime = ct;
          }, { once: true });
          audio.addEventListener("canplay", () => {
            if (wasPlaying) audio.play().catch(() => {});
          }, { once: true });
        }
      })
      .catch(() => { /* fallback: use original URL, seeking may not work */ });

    // Decode waveform for visualizer
    decodeWaveform(masteredUrl).then((result) => {
      if (result) {
        setStaticWaveformB(result.rms);
        setPeakWaveformB(result.peaks);
      }
    });

    return () => {
      if (masteredBlobRef.current) {
        URL.revokeObjectURL(masteredBlobRef.current);
        masteredBlobRef.current = "";
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masteredUrl]);

  // ── Init Web Audio API on first play ────────────────────────────────────────
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const src = ctx.createMediaElementSource(audio);

      // Master gain node – used to fade volume during A/B switch
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gainRef.current = gain;

      // Mono analyser (spectrum + waveform)
      const mono = ctx.createAnalyser();
      mono.fftSize = 2048;
      mono.smoothingTimeConstant = 0.85;

      // Stereo split for VU meters
      const splitter = ctx.createChannelSplitter(2);
      const aL = ctx.createAnalyser();
      aL.fftSize = 512;
      aL.smoothingTimeConstant = 0.8;
      const aR = ctx.createAnalyser();
      aR.fftSize = 512;
      aR.smoothingTimeConstant = 0.8;

      // Graph: src → mono → gain → destination
      //        src → splitter → aL / aR  (for VU, no gain node needed)
      src.connect(mono);
      src.connect(splitter);
      splitter.connect(aL, 0);
      splitter.connect(aR, 1);
      mono.connect(gain);
      gain.connect(ctx.destination);

      setAnalyserMono(mono);
      setAnalyserL(aL);
      setAnalyserR(aR);
    } catch (e) {
      console.warn("Web Audio init failed:", e);
    }
  }, []);

  // ── Mode switch (A = original, B = mastered) ────────────────────────────────
  const setMode = useCallback((newMode: "A" | "B") => {
    // Guard: B only allowed when a real master URL exists
    if (newMode === "B" && (!masteredUrl || masterUnavailable)) return;

    const audio = audioRef.current;
    if (!audio) return;

    const time       = audio.currentTime;
    const wasPlaying = isPlaying;

    const doSwitch = () => {
      audio.pause();

      // Use pre-fetched Blob URL for B (enables seeking); fall back to server URL
      const url = newMode === "A"
        ? originalUrl
        : (masteredBlobRef.current || masteredUrl);
      if (!url) return;

      audio.src = url;
      audio.load();

      // Restore playback position as soon as metadata is parsed (before canplay)
      if (time > 0) {
        audio.addEventListener("loadedmetadata", () => {
          audio.currentTime = time;
        }, { once: true });
      }

      audio.addEventListener("canplay", () => {
        if (wasPlaying) {
          audio.play().catch(() => {});
          // Fade back in over 80 ms
          const gain = gainRef.current;
          const ctx  = audioCtxRef.current;
          if (gain && ctx) {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.08);
          }
        }
      }, { once: true });

      audio.addEventListener("error", () => {
        if (newMode === "B") {
          setMasterUnavailable(true);
          setModeState("A");
          if (originalUrl) {
            audio.src = originalUrl;
            audio.load();
          }
        }
      }, { once: true });

      setModeState(newMode);
    };

    const gain = gainRef.current;
    const ctx  = audioCtxRef.current;

    if (gain && ctx && wasPlaying) {
      // Fade out over 80 ms, then switch source
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      setTimeout(doSwitch, 90);
    } else {
      doSwitch();
    }
  }, [originalUrl, masteredUrl, masterUnavailable, isPlaying]);

  // ── Playback controls ────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      initAudioContext();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [initAudioContext]);

  // Register global stop + toggle so Header can control audio from outside this tree
  useEffect(() => {
    registerGlobalStop(() => { audioRef.current?.pause(); });
    registerGlobalToggle(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        initAudioContext();
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
  }, [initAudioContext]);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  // Switch to master (B) and attempt autoplay from the start.
  // Called automatically after mastering completes.
  const playMaster = useCallback(() => {
    if (!masteredUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    setModeState("B");
    audio.src = masteredUrl;
    audio.load();

    audio.addEventListener("canplay", () => {
      audio.currentTime = 0;
      initAudioContext();
      audio.play().catch(() => {
        // Browser blocked autoplay — user can press play manually
      });
    }, { once: true });

    audio.addEventListener("error", () => {
      setMasterUnavailable(true);
      setModeState("A");
      if (originalUrl) { audio.src = originalUrl; audio.load(); }
    }, { once: true });
  }, [masteredUrl, originalUrl, initAudioContext]);

  return (
    <AudioEngineContext.Provider
      value={{
        analyserMono,
        analyserL,
        analyserR,
        isPlaying,
        currentTime,
        duration,
        mode,
        masterUnavailable,
        setMode,
        togglePlay,
        seek,
        playMaster,
        originalUrl,
        masteredUrl,
        staticWaveform,
        peakWaveform,
        staticWaveformB,
        peakWaveformB,
      }}
    >
      {children}
    </AudioEngineContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────────
export function useAudioEngine(): AudioEngineContextType | null {
  return useContext(AudioEngineContext);
}
