// Sound for the radio and the crossing, synthesized with Web Audio so there
// are no files to load. Off until the visitor turns it on; the choice is
// remembered.
import { noiseBuffer } from "./voices";

const STORAGE_KEY = "scope-sound";
let context: AudioContext | undefined;

export function soundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/** Whether the visitor has ever turned sound on or off. */
export function soundChosen() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage can be blocked; sound then lasts for this page only.
  }
}

/** The shared audio context, resumed if the browser suspended it. */
export function audioContext() {
  context ??= new AudioContext();
  // Browsers only allow resuming after a user gesture, so this can quietly fail.
  if (context.state === "suspended") void context.resume().catch(() => {});
  return context;
}

/** Tuning static for the crossing: band-passed noise sweeping upward. */
export function playStatic(seconds = 0.45) {
  if (!soundEnabled()) return;
  const ctx = audioContext();
  const at = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(500, at);
  band.frequency.exponentialRampToValueAtTime(3200, at + seconds);
  const gain = ctx.createGain();
  // Silent until the burst starts, so its first sample can't click.
  gain.gain.value = 0.0001;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.05, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  source.connect(band).connect(gain).connect(ctx.destination);
  source.start(at);
  source.stop(at + seconds);
}
