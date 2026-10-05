// The radio's sound. Every station plays its own little program
// (programs.ts) on its own channel, and tuning works like a real radio: a
// station fades in out of the static as the dial gets close, muffled until
// it's dead on, and tuning in rings a chime on the station's note. Programs
// only run while their channel can be heard.
import { chimes, programs, type Program } from "./programs";
import { audioContext } from "./sound";
import { bell, impulse, noiseBuffer, note } from "./voices";

const VOLUME = 0.5;
const STATIC = 0.05;
// Look this far ahead when scheduling notes, every TICK milliseconds.
const AHEAD = 0.12;
const TICK = 25;

interface Channel {
  program: Program;
  /** Programs play into this. */
  input: GainNode;
  filter: BiquadFilterNode;
  level: GainNode;
  weight: number;
  active: boolean;
  step: number;
  next: number;
  release?: (when: number) => void;
}

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  staticLevel: GainNode;
  chime: GainNode;
  channels: Map<string, Channel>;
  /** When step 0 of every program fell, so stations keep their beat across tuning. */
  origin: number;
}

let graph: Graph | undefined;
let playing = false;
let timer: number | undefined;

function build(): Graph {
  const ctx = audioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -16;
  limiter.ratio.value = 4;
  master.connect(limiter).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx);
  reverb.connect(master);

  // A tape-ish echo: each repeat a little darker.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.36;
  const darker = ctx.createBiquadFilter();
  darker.type = "lowpass";
  darker.frequency.value = 2500;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  echo.connect(darker).connect(feedback).connect(echo);
  darker.connect(master);

  const send = (from: AudioNode, to: AudioNode, amount: number) => {
    if (amount <= 0) return;
    const gain = ctx.createGain();
    gain.gain.value = amount;
    from.connect(gain).connect(to);
  };

  // The static between stations: soft band-passed noise.
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(ctx);
  hiss.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1200;
  band.Q.value = 0.6;
  const staticLevel = ctx.createGain();
  staticLevel.gain.value = 0;
  hiss.connect(band).connect(staticLevel).connect(master);
  hiss.start();

  const chime = ctx.createGain();
  chime.connect(master);
  send(chime, reverb, 0.6);
  send(chime, echo, 0.25);

  const channels = new Map<string, Channel>();
  for (const [id, program] of Object.entries(programs)) {
    const input = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    const level = ctx.createGain();
    level.gain.value = 0;
    input.connect(filter).connect(level).connect(master);
    send(level, reverb, program.reverb);
    send(level, echo, program.echo);
    channels.set(id, {
      program,
      input,
      filter,
      level,
      weight: 0,
      active: false,
      step: 0,
      next: 0,
    });
  }

  return { ctx, master, staticLevel, chime, channels, origin: ctx.currentTime };
}

/** Lines a channel up with the next sixteenth on the shared beat. */
function sync(channel: Channel, now: number) {
  const { origin } = graph!;
  const length = 15 / channel.program.bpm;
  channel.step = Math.ceil((now - origin) / length);
  channel.next = origin + channel.step * length;
}

function schedule() {
  if (!graph) return;
  const now = graph.ctx.currentTime;
  for (const channel of graph.channels.values()) {
    const { program } = channel;
    if (!channel.active || !program.step) continue;
    // After a pause (a hidden tab), skip ahead instead of playing a pile-up.
    if (channel.next < now - 0.05) sync(channel, now);
    while (channel.next < now + AHEAD) {
      program.step(channel.input, channel.step, channel.next);
      channel.step++;
      channel.next += 15 / program.bpm;
    }
  }
}

function silence(channel: Channel, when: number) {
  channel.active = false;
  channel.release?.(when);
  channel.release = undefined;
}

/**
 * Turns the sound on or off. The first time, call it from a click or key
 * press, since browsers only start audio after one. False if this browser
 * can't play it.
 */
export function setMusic(on: boolean) {
  if (!on && !graph) return true;
  try {
    graph ??= build();
  } catch {
    return false;
  }
  const { ctx, master, channels } = graph;
  playing = on;
  window.clearInterval(timer);
  if (on) {
    void ctx.resume().catch(() => {});
    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.1);
    timer = window.setInterval(schedule, TICK);
    schedule();
  } else {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    for (const channel of channels.values()) {
      channel.weight = 0;
      channel.level.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      silence(channel, ctx.currentTime + 0.4);
    }
  }
  return true;
}

/**
 * Sets each station's level from how close the dial is to it (0–1, by
 * station id), and the static from how clear the strongest one is.
 */
export function tuneMusic(weights: Map<string, number>, clarity: number) {
  if (!graph || !playing) return;
  const { ctx, channels, staticLevel } = graph;
  const now = ctx.currentTime;
  staticLevel.gain.setTargetAtTime(STATIC * (1 - clarity) ** 2, now, 0.05);
  for (const [id, channel] of channels) {
    const weight = weights.get(id) ?? 0;
    if (Math.abs(weight - channel.weight) < 0.002) continue;
    channel.weight = weight;
    channel.level.gain.setTargetAtTime(weight ** 1.5, now, 0.05);
    // Off to the side, a station sounds distant; dead on, it opens up.
    channel.filter.frequency.setTargetAtTime(
      500 + 11000 * weight ** 3,
      now,
      0.05,
    );
    if (weight > 0.01 && !channel.active) {
      channel.active = true;
      sync(channel, now);
      channel.release = channel.program.hold?.(channel.input, now);
    } else if (weight < 0.005 && channel.active) {
      silence(channel, now);
    }
  }
}

/** Rings a station's chime: two notes on tuning in, more for a new or final find. */
export function chime(id: string, kind: keyof typeof chimes) {
  const home = programs[id]?.home;
  if (!graph || !playing || home === undefined) return;
  const start = graph.ctx.currentTime + 0.02;
  const spacing = kind === "complete" ? 0.11 : 0.09;
  chimes[kind].forEach((degree, i) =>
    bell(graph!.chime, note(home + degree), start + i * spacing, {
      gain: 0.12,
      decay: 2,
    }),
  );
}

// Hidden tabs go quiet; the beat picks back up on return.
document.addEventListener("visibilitychange", () => {
  if (!graph || !playing) return;
  if (document.hidden) void graph.ctx.suspend();
  else void graph.ctx.resume();
});
