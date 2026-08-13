/**
 * Module-level singleton for global audio playback state.
 * Lets the Header (outside AudioEngineProvider) react to play/stop/toggle.
 */

type Listener = (playing: boolean) => void;
type StateListener = (state: { playing: boolean; available: boolean }) => void;

const listeners      = new Set<Listener>();
const stateListeners = new Set<StateListener>();

let _playing   = false;
let _available = false;
let _stopFn:   (() => void) | null = null;
let _toggleFn: (() => void) | null = null;

function _notifyState() {
  stateListeners.forEach(l => l({ playing: _playing, available: _available }));
}

export function setGlobalAudioPlaying(isPlaying: boolean) {
  _playing = isPlaying;
  listeners.forEach(l => l(isPlaying));
  _notifyState();
}

export function setGlobalAudioAvailable(available: boolean) {
  _available = available;
  _notifyState();
}

export function registerGlobalStop(fn: () => void) {
  _stopFn = fn;
}

export function registerGlobalToggle(fn: () => void) {
  _toggleFn = fn;
}

export function stopGlobalAudio() {
  _stopFn?.();
}

export function toggleGlobalAudio() {
  _toggleFn?.();
}

export function getGlobalAudioPlaying() {
  return _playing;
}

export function getGlobalAudioAvailable() {
  return _available;
}

export function getGlobalAudioState() {
  return { playing: _playing, available: _available };
}

/** Legacy: subscribe to playing-only changes */
export function subscribeGlobalAudio(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to combined {playing, available} state */
export function subscribeGlobalAudioState(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

// ── Persistent audio element singleton ──────────────────────────────────────
// Lives at module level so it survives React component unmounts (page navigation).
let _audioElement: HTMLAudioElement | null = null;

export function getOrCreateAudioElement(): HTMLAudioElement {
  if (!_audioElement && typeof window !== "undefined") {
    _audioElement = new Audio();
    _audioElement.crossOrigin = "anonymous";
    _audioElement.preload     = "metadata";
  }
  return _audioElement as HTMLAudioElement;
}

export function getAudioElement(): HTMLAudioElement | null {
  return _audioElement;
}
