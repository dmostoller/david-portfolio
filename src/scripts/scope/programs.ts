// What each station plays. Everything is in D major pentatonic, so stations
// never clash as the dial crosses from one to the next, and each has a home
// note for the chime that rings when you tune in (rising up the scale in dial
// order). Steps are sixteenth notes at the program's tempo.
import {
  bass,
  beep,
  bell,
  hiss,
  hz,
  kick,
  note,
  overdrive,
  pad,
  pluck,
} from "./voices";

export interface Program {
  bpm: number;
  /** How much goes to the reverb and the echo, 0–1. */
  reverb: number;
  echo: number;
  /** Scale degree the tune-in chime starts on. */
  home?: number;
  /** Plays sixteenth note `n`, starting at `at`. */
  step?: (out: AudioNode, n: number, at: number) => void;
  /** Starts what holds (pads, drones) and returns how to fade it out. */
  hold?: (out: AudioNode, at: number) => (when: number) => void;
}

const chance = (p: number) => Math.random() < p;
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

// "dbm" in Morse, as [start, length] in units, then a word gap.
const morse: [number, number][] = [];
const morseLength = (() => {
  let unit = 0;
  for (const letter of ["-..", "-...", "--"]) {
    for (const mark of letter) {
      const length = mark === "-" ? 3 : 1;
      morse.push([unit, length]);
      unit += length + 1;
    }
    unit += 2;
  }
  return unit + 4;
})();

/** A melody as scale degrees, one per step, with "." for a rest. */
const tune = (notes: string) =>
  notes
    .trim()
    .split(/\s+/)
    .map((n) => (n === "." ? null : Number(n)));

// A slow hello on the bells, one entry per sixteenth.
const hello = tune(`
  12 . . . . . 10 . . . . . 11 . . .
  9 . . . . . 10 . . . . . 8 . . .
`);

// The operator's music box tune, one entry per eighth note.
const lullaby = tune(`
  10 . 12 13 12 . 10 9   10 . . . 8 9 10 .
  12 . 13 15 13 . 12 10  9 10 9 8 5 . . .
`);

// The night job's lead, one entry per sixteenth.
const lead = tune("10 . 13 . 12 . 10 9 . 10 . 12 . 13 12 .");

export const programs: Record<string, Program> = {
  // Notifications, all at once, in no key at all.
  internet: {
    bpm: 150,
    reverb: 0.2,
    echo: 0,
    step: (out, _n, at) => {
      if (chance(0.45))
        bell(out, hz(76 + Math.floor(Math.random() * 20)), at, {
          gain: 0.05,
          decay: 0.18,
        });
      if (chance(0.08)) {
        const first = hz(pick([79, 81, 84, 88]));
        bell(out, first, at, { gain: 0.04, decay: 0.3 });
        bell(out, first * 0.75, at + 0.12, { gain: 0.04, decay: 0.4 });
      }
      if (chance(0.06)) hiss(out, at, { gain: 0.03, length: 0.02, from: 2000 });
    },
  },

  // A warm chord and a slow hello on the bells.
  dbm: {
    bpm: 76,
    reverb: 0.5,
    echo: 0.25,
    home: 5,
    hold: (out, at) => pad(out, [0, 3, 6, 7].map(note), at),
    step: (out, n, at) => {
      const degree = hello[n % hello.length];
      if (degree !== null)
        bell(out, note(degree), at, { gain: 0.07, decay: 2.4 });
    },
  },

  // Rolling arpeggios at a steady cadence, D then B minor.
  ride: {
    bpm: 104,
    reverb: 0.3,
    echo: 0.35,
    home: 6,
    step: (out, n, at) => {
      const bar = Math.floor(n / 16) % 2;
      if (n % 16 === 0)
        pluck(out, note(bar ? -6 : -5), at, { gain: 0.16, decay: 1.2 });
      if (n % 2) return;
      const arpeggio = bar
        ? [6, 8, 9, 11, 13, 11, 9, 8]
        : [5, 7, 9, 10, 12, 10, 9, 7];
      pluck(out, note(arpeggio[(n / 2) % 8]), at, { gain: 0.09, decay: 0.35 });
    },
  },

  // Calm and watchful: a low drone, a sonar ping, a heartbeat.
  "day-job": {
    bpm: 60,
    reverb: 0.7,
    echo: 0.4,
    home: 8,
    hold: (out, at) =>
      pad(out, [note(-5), note(-2)], at, { gain: 0.05, cutoff: 400 }),
    step: (out, n, at) => {
      const beat = n % 16;
      if (beat === 0) bell(out, note(13), at, { gain: 0.07, decay: 3 });
      if (beat === 8 || beat === 9) kick(out, at, beat === 8 ? 0.14 : 0.09);
      if (beat % 2 && chance(0.12))
        bell(out, note(15 + Math.floor(Math.random() * 3)), at, {
          gain: 0.02,
          decay: 0.15,
        });
    },
  },

  // Psytrance at 145: kick, rolling bass, offbeat hats, and a lead every
  // other phrase.
  "night-job": {
    bpm: 145,
    reverb: 0.15,
    echo: 0.15,
    home: 9,
    step: (out, n, at) => {
      const beat = n % 4;
      const bar = Math.floor(n / 16) % 4;
      if (beat === 0) kick(out, at);
      else bass(out, note(bar === 3 && n % 16 >= 12 ? -2 : -5), at, 0.09);
      if (beat === 2) hiss(out, at);
      if (bar >= 2) {
        const degree = lead[n % 16];
        if (degree !== null)
          pluck(out, note(degree), at, {
            gain: 0.035,
            decay: 0.18,
            type: "sawtooth",
          });
      }
    },
  },

  // Slow, shimmering, far away, with stars.
  library: {
    bpm: 50,
    reverb: 0.85,
    echo: 0.5,
    home: 10,
    hold: (out, at) =>
      pad(out, [-1, 2, 4, 5, 8].map(note), at, { cutoff: 1600 }),
    step: (out, _n, at) => {
      if (chance(0.18))
        bell(out, note(12 + Math.floor(Math.random() * 6)), at, {
          gain: 0.04,
          decay: 3,
        });
    },
  },

  // "dbm" in Morse over a quiet chord.
  mailbox: {
    bpm: 120,
    reverb: 0.3,
    echo: 0.2,
    home: 11,
    hold: (out, at) => pad(out, [note(0), note(3)], at, { gain: 0.02 }),
    step: (out, n, at) => {
      const unit = 15 / 120;
      const mark = morse.find(([start]) => start === n % morseLength);
      if (mark) beep(out, note(11), at, mark[1] * unit * 0.95);
    },
  },

  // Turned all the way up.
  eleven: {
    bpm: 90,
    reverb: 0.4,
    echo: 0.2,
    home: 12,
    hold: (out, at) => overdrive(out, [-5, -2, 0].map(note), at),
    step: (out, n, at) => {
      if (n % 32 === 0) hiss(out, at, { gain: 0.05, length: 1.6, from: 4000 });
    },
  },

  // A music box, for whoever finds every station.
  operator: {
    bpm: 92,
    reverb: 0.6,
    echo: 0.3,
    home: 7,
    hold: (out, at) => pad(out, [0, 3, 5, 7].map(note), at),
    step: (out, n, at) => {
      if (n % 2) return;
      const degree = lullaby[(n / 2) % lullaby.length];
      if (degree !== null)
        bell(out, note(degree), at, { gain: 0.07, decay: 1.8 });
    },
  },
};

/** Bell notes for the tune-in chime, as scale degrees above a station's home. */
export const chimes = {
  lock: [0, 2],
  logged: [0, 2, 4],
  complete: [0, 1, 2, 3, 4, 5, 7, 10],
};
