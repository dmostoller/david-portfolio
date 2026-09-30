// Scope's UI sounds, synthesized with Web Audio so there are no files to load.
// Off until the visitor turns them on; the choice is remembered.
const STORAGE_KEY = "scope-sound";
let context: AudioContext | undefined;

export function soundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage can be blocked; sound then lasts for this page only.
  }
  if (on) audio();
}

function audio() {
  context ??= new AudioContext();
  // Browsers only allow resuming after a user gesture, so this can quietly fail.
  if (context.state === "suspended") void context.resume().catch(() => {});
  return context;
}

function noise(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * seconds)),
    ctx.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

function envelope(gain: GainNode, at: number, peak: number, length: number) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
}

/** A soft key click. */
export function playClick() {
  if (!soundEnabled()) return;
  const ctx = audio();
  const at = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, 0.02);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2800;
  const gain = ctx.createGain();
  envelope(gain, at, 0.05, 0.02);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(at);
}

/** A short falling blip for commands and navigation. */
export function playBlip(frequency = 880) {
  if (!soundEnabled()) return;
  const ctx = audio();
  const at = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, at);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.75, at + 0.08);
  const gain = ctx.createGain();
  envelope(gain, at, 0.07, 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.12);
}

/** Two rising notes, for turning sound on. */
export function playBoot() {
  if (!soundEnabled()) return;
  const ctx = audio();
  [440, 660].forEach((frequency, i) => {
    const at = ctx.currentTime + i * 0.09;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    envelope(gain, at, 0.06, 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  });
}

/** Tuning static for the crossing: band-passed noise sweeping upward. */
export function playStatic(seconds = 0.45) {
  if (!soundEnabled()) return;
  const ctx = audio();
  const at = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, seconds);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(500, at);
  band.frequency.exponentialRampToValueAtTime(3200, at + seconds);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.05, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  source.connect(band).connect(gain).connect(ctx.destination);
  source.start(at);
  source.stop(at + seconds);
}

/** A short rising feedback squeal, for turning the send up to eleven. */
export function playFeedback() {
  if (!soundEnabled()) return;
  const ctx = audio();
  const at = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(900, at);
  osc.frequency.exponentialRampToValueAtTime(2600, at + 0.6);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 6;
  band.frequency.setValueAtTime(1200, at);
  band.frequency.exponentialRampToValueAtTime(2600, at + 0.6);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.04, at + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
  osc.connect(band).connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.75);
}
