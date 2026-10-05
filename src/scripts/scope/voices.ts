// Small Web Audio instruments for the radio's music (programs.ts). Each
// plays one note into `out` at time `at`; the held ones (pads, drones)
// return a function that fades them out.

const PENTATONIC = [0, 2, 4, 7, 9];

/** Degree n of D major pentatonic, counting from D3 at 0 (negative goes down). */
export function note(degree: number) {
  const octave = Math.floor(degree / 5);
  const step = PENTATONIC[degree - octave * 5];
  return 440 * 2 ** ((50 + step + 12 * octave - 69) / 12);
}

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

export function noiseBuffer(ctx: BaseAudioContext) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

/** A decaying room, generated so there's no file to load. */
export function impulse(ctx: BaseAudioContext, seconds = 2.8) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++)
      samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

// A new gain starts at 1 until its first scheduled change. Starting silent
// matters when `at` falls between samples: otherwise the note's first sample
// plays at full volume, which clicks.
function silent(gain: AudioParam) {
  gain.value = 0.0001;
}

function envelope(gain: AudioParam, at: number, peak: number, length: number) {
  silent(gain);
  gain.setValueAtTime(0.0001, at);
  gain.exponentialRampToValueAtTime(peak, at + 0.006);
  gain.exponentialRampToValueAtTime(0.0001, at + length);
}

/** A soft FM bell, like an electric piano. */
export function bell(
  out: AudioNode,
  frequency: number,
  at: number,
  { gain = 0.1, decay = 1.8 } = {},
) {
  const ctx = out.context;
  const carrier = ctx.createOscillator();
  carrier.frequency.value = frequency;
  const modulator = ctx.createOscillator();
  modulator.frequency.value = frequency * 2;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(frequency * 1.4, at);
  depth.gain.exponentialRampToValueAtTime(frequency * 0.05, at + decay * 0.6);
  modulator.connect(depth).connect(carrier.frequency);
  const level = ctx.createGain();
  envelope(level.gain, at, gain, decay);
  carrier.connect(level).connect(out);
  for (const osc of [carrier, modulator]) {
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/** A plucked string-ish note. */
export function pluck(
  out: AudioNode,
  frequency: number,
  at: number,
  { gain = 0.08, decay = 0.4, type = "triangle" as OscillatorType } = {},
) {
  const ctx = out.context;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(frequency * 8, at);
  filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, at + decay);
  const level = ctx.createGain();
  envelope(level.gain, at, gain, decay);
  osc.connect(filter).connect(level).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

/** A steady tone with soft edges, for Morse. */
export function beep(
  out: AudioNode,
  frequency: number,
  at: number,
  length: number,
  gain = 0.05,
) {
  const ctx = out.context;
  const osc = ctx.createOscillator();
  osc.frequency.value = frequency;
  const level = ctx.createGain();
  silent(level.gain);
  level.gain.setValueAtTime(0, at);
  level.gain.linearRampToValueAtTime(gain, at + 0.006);
  level.gain.setValueAtTime(gain, at + length - 0.006);
  level.gain.linearRampToValueAtTime(0, at + length);
  osc.connect(level).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

export function kick(out: AudioNode, at: number, gain = 0.4) {
  const ctx = out.context;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
  const level = ctx.createGain();
  envelope(level.gain, at, gain, 0.32);
  osc.connect(level).connect(out);
  osc.start(at);
  osc.stop(at + 0.36);
}

/** Filtered noise: a hi-hat when short and bright, a crash when long. */
export function hiss(
  out: AudioNode,
  at: number,
  { gain = 0.04, length = 0.045, from = 7000 } = {},
) {
  const ctx = out.context;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = from;
  const level = ctx.createGain();
  envelope(level.gain, at, gain, length);
  source.connect(filter).connect(level).connect(out);
  source.start(at, Math.random());
  source.stop(at + length + 0.02);
}

/** A short squelchy bass note. */
export function bass(
  out: AudioNode,
  frequency: number,
  at: number,
  length: number,
  gain = 0.14,
) {
  const ctx = out.context;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = frequency;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(1400, at);
  filter.frequency.exponentialRampToValueAtTime(220, at + length);
  const level = ctx.createGain();
  envelope(level.gain, at, gain, length);
  osc.connect(filter).connect(level).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** Detuned oscillators under a slowly breathing filter. Held until released. */
export function pad(
  out: AudioNode,
  frequencies: number[],
  at: number,
  { gain = 0.03, cutoff = 1200, type = "triangle" as OscillatorType } = {},
) {
  const ctx = out.context;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const sweep = ctx.createGain();
  sweep.gain.value = cutoff * 0.35;
  lfo.connect(sweep).connect(filter.frequency);
  const level = ctx.createGain();
  silent(level.gain);
  level.gain.setValueAtTime(0.0001, at);
  level.gain.exponentialRampToValueAtTime(gain, at + 2.5);
  filter.connect(level).connect(out);
  const oscillators = frequencies.flatMap((frequency) =>
    [-7, 7].map((cents) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      osc.detune.value = cents;
      osc.connect(filter);
      return osc;
    }),
  );
  for (const osc of [...oscillators, lfo]) osc.start(at);
  return (when: number) => {
    level.gain.cancelScheduledValues(when);
    level.gain.setTargetAtTime(0.0001, when, 0.3);
    for (const osc of [...oscillators, lfo]) osc.stop(when + 2);
  };
}

/** A power chord through a cranked amp, with feedback creeping in. */
export function overdrive(out: AudioNode, frequencies: number[], at: number) {
  const ctx = out.context;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++)
    curve[i] = Math.tanh((i / 511.5 - 1) * 6);
  shaper.curve = curve;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2200;
  const level = ctx.createGain();
  silent(level.gain);
  level.gain.setValueAtTime(0.0001, at);
  level.gain.exponentialRampToValueAtTime(0.07, at + 0.05);
  shaper.connect(tone).connect(level).connect(out);
  const strings = frequencies.map((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequency;
    osc.connect(shaper);
    return osc;
  });

  const whine = ctx.createOscillator();
  whine.frequency.value = frequencies[frequencies.length - 1] * 4;
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5;
  const wobble = ctx.createGain();
  wobble.gain.value = 6;
  vibrato.connect(wobble).connect(whine.frequency);
  const feedback = ctx.createGain();
  silent(feedback.gain);
  feedback.gain.setValueAtTime(0.0001, at);
  feedback.gain.exponentialRampToValueAtTime(0.02, at + 4);
  whine.connect(feedback).connect(out);

  const all = [...strings, whine, vibrato];
  for (const osc of all) osc.start(at);
  return (when: number) => {
    for (const gain of [level.gain, feedback.gain]) {
      gain.cancelScheduledValues(when);
      gain.setTargetAtTime(0.0001, when, 0.15);
    }
    for (const osc of all) osc.stop(when + 1.5);
  };
}
