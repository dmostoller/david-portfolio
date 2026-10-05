// The radio's stations: where each sits on the dial, what it's called, and
// the picture its beam draws. Drawings are polylines in screen units, x from
// -1.75 to 1.75 and y from -1 (bottom) to 1 (top), drawn fresh each frame
// from the time in seconds. They're plain functions, so the page can also
// render a still for visitors without JavaScript.
import { portrait } from "./portrait";

export type Point = [number, number];
export type Drawing = Point[][];

export interface Station {
  id: string;
  /** Where it sits on the dial, 0–11. */
  at: number;
  name: string;
  caption: string;
  links?: { label: string; href: string }[];
  /** How many points the beam traces per frame. Detailed pictures need more. */
  detail?: number;
  draw: (t: number, random: () => number) => Drawing;
}

export const DIAL_MAX = 11;
/** Half the screen's width in drawing units; the height is always -1 to 1. */
export const SPAN_X = 1.75;
export const BASE_DETAIL = 900;

const TAU = Math.PI * 2;

function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  steps = 40,
) {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    points.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return points;
}

const circle = (cx: number, cy: number, r: number, steps = 56) =>
  arc(cx, cy, r, r, 0, TAU, steps);

const square = (x: number, y: number, half: number): Point[] => [
  [x - half, y - half],
  [x + half, y - half],
  [x + half, y + half],
  [x - half, y + half],
  [x - half, y - half],
];

const rotate = (points: Point[], angle: number) =>
  points.map(
    ([x, y]): Point => [
      x * Math.cos(angle) - y * Math.sin(angle),
      x * Math.sin(angle) + y * Math.cos(angle),
    ],
  );

/** What the internet shouts while you're tuned to it. */
export const chatter = [
  "37 unread",
  "sponsored",
  "trending now",
  "accept all cookies?",
  "you won't believe",
  "breaking",
  "new follower",
  "limited time",
  "for you",
  "autoplay in 3",
  "rate us",
  "reply all",
  "are you still watching?",
  "2 new notifications",
  "sign up to continue",
];

export const internet: Station = {
  id: "internet",
  at: 0,
  name: "the internet",
  caption: "everything, all at once",
  draw: (_t, random) => [
    Array.from(
      { length: 40 },
      (): Point => [(random() * 2 - 1) * SPAN_X, random() * 2 - 1],
    ),
  ],
};

const hello: Station = {
  id: "dbm",
  at: 1.7,
  name: "dbm",
  caption: "hi. you made it out.",
  draw: (t) => {
    const bounce = Math.abs(Math.sin(t * 3)) * 0.12;
    const voice: Point[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = -0.9 + (1.8 * i) / 60;
      const swell = Math.sin((Math.PI * i) / 60);
      voice.push([x, -0.82 + 0.07 * Math.sin(x * 9 - t * 6) * swell]);
    }
    return [
      // h: down the stem, back up, then over the shoulder.
      [
        [-0.62, 0.7],
        [-0.62, -0.55],
        [-0.62, -0.05],
        ...arc(-0.33, -0.05, 0.29, 0.29, Math.PI, 0),
        [-0.04, -0.55],
      ],
      // i, with a bouncing dot.
      [
        [0.42, -0.55],
        [0.42, 0.15],
      ],
      circle(0.42, 0.42 + bounce, 0.06, 20),
      voice,
    ];
  },
};

const ride: Station = {
  id: "ride",
  at: 3.3,
  name: "the ride",
  caption: "out of range, on purpose",
  draw: (t) => {
    const r = 0.4;
    const axle = -0.3;
    const rear = -0.78;
    const front = 0.78;
    const crank: Point = [-0.02, axle];
    const seat: Point = [-0.22, 0.28];
    const head: Point = [0.56, 0.28];
    const spokes = (cx: number) =>
      [0, 1, 2].map((i): Point[] => {
        const a = -t * 3 + (i * Math.PI) / 3;
        return [
          [cx + r * Math.cos(a), axle + r * Math.sin(a)],
          [cx - r * Math.cos(a), axle - r * Math.sin(a)],
        ];
      });
    const pedal = -t * 2.2;
    const road: Point[][] = [];
    for (let x = -SPAN_X + 0.4 - ((t * 1.2) % 0.4); x < SPAN_X; x += 0.4) {
      road.push([
        [x, -0.8],
        [x + 0.18, -0.8],
      ]);
    }
    return [
      circle(rear, axle, r),
      circle(front, axle, r),
      ...spokes(rear),
      ...spokes(front),
      [[rear, axle], crank, seat, [rear, axle]],
      [seat, head, crank],
      [head, [front, axle]],
      [head, [0.5, 0.48], [0.68, 0.5]],
      [seat, [-0.23, 0.36], [-0.36, 0.36], [-0.1, 0.36]],
      [
        [crank[0] + 0.15 * Math.cos(pedal), axle + 0.15 * Math.sin(pedal)],
        [crank[0] - 0.15 * Math.cos(pedal), axle - 0.15 * Math.sin(pedal)],
      ],
      ...road,
    ];
  },
};

const dayJob: Station = {
  id: "day-job",
  at: 5,
  name: "the day job",
  caption: "floods in, clean traffic out",
  draw: (t) => {
    const cx = 0.55;
    const wall = cx - 0.48;
    const shield = (
      [
        [0, 0.78],
        [0.5, 0.62],
        [0.47, 0],
        [0.3, -0.45],
        [0, -0.78],
        [-0.3, -0.45],
        [-0.47, 0],
        [-0.5, 0.62],
        [0, 0.78],
      ] as Point[]
    ).map(([x, y]): Point => [x + cx, y]);
    const check: Point[] = [
      [cx - 0.2, 0.02],
      [cx - 0.05, -0.15],
      [cx + 0.22, 0.22],
    ];
    // Every fourth packet is real traffic and passes through; the rest
    // bounce off the shield and fall away.
    const packets: Point[][] = [];
    for (let k = 0; k < 12; k++) {
      const progress = (t * 0.3 + k / 12) % 1;
      const y = ((k * 0.618) % 1) * 1.2 - 0.6;
      const x = -SPAN_X + progress * 3.3;
      if (k % 4 === 0) {
        if (x < wall || x > cx + 0.5) packets.push(square(x, y, 0.018));
      } else if (x < wall) {
        packets.push(square(x, y, 0.045));
      } else {
        const past = x - wall;
        const size = 0.045 * (1 - past / 1.4);
        if (size > 0.006)
          packets.push(square(wall - past * 0.7, y - past * past * 1.6, size));
      }
    }
    return [shield, check, ...packets];
  },
};

const nightJob: Station = {
  id: "night-job",
  at: 6.6,
  name: "the night job",
  caption: "electronic music as",
  links: [
    { label: "kabayun", href: "https://kabayun.com" },
    { label: "superluminal", href: "https://superluminalpsy.com" },
  ],
  // A 3:2 Lissajous figure (two tones a perfect fifth apart, drawn against
  // each other), pumping at 145 bpm.
  draw: (t) => {
    const beat = ((t * 145) / 60) % 1;
    const size = 0.62 + 0.22 * Math.exp(-beat * 7);
    const drift = t * 0.7;
    const figure: Point[] = [];
    for (let i = 0; i <= 400; i++) {
      const u = (i / 400) * TAU;
      figure.push([
        1.25 * size * Math.sin(3 * u + drift),
        size * Math.sin(2 * u),
      ]);
    }
    return [figure];
  },
};

const library: Station = {
  id: "library",
  at: 8.2,
  name: "the library",
  caption: "somewhere in a sci-fi novel",
  draw: (t, random) => {
    const moon = t * 0.9;
    const x = ((t * 0.22) % 1) * 4 - 2;
    return [
      circle(0, 0, 0.42, 64),
      rotate(arc(0, 0, 0.95, 0.2, 0, TAU, 72), -0.35),
      circle(1.15 * Math.cos(moon), 0.55 * Math.sin(moon) + 0.05, 0.06, 16),
      // A small rocket crossing the top, exhaust flickering.
      [
        [x, 0.78],
        [x - 0.12, 0.84],
        [x - 0.24, 0.84],
        [x - 0.24, 0.72],
        [x - 0.12, 0.72],
        [x, 0.78],
      ],
      [
        [x - 0.24, 0.78],
        [x - 0.32 - 0.06 * random(), 0.78],
      ],
    ];
  },
};

const mailbox: Station = {
  id: "mailbox",
  at: 9.6,
  name: "the mailbox",
  caption: "write in:",
  links: [
    { label: "dmostoller@gmail.com", href: "mailto:dmostoller@gmail.com" },
  ],
  draw: (t) => {
    const bob = 0.04 * Math.sin(t * 2);
    // "dbm" in Morse, tapped out under the envelope.
    const morse: Point[][] = [];
    let x = -0.62;
    for (const mark of "-.. -... --") {
      if (mark === " ") {
        x += 0.14;
        continue;
      }
      const length = mark === "." ? 0.04 : 0.16;
      morse.push([
        [x, -0.82],
        [x + length, -0.82],
      ]);
      x += length + 0.08;
    }
    const tapped = Math.floor((t * 4) % (morse.length + 4));
    return [
      [
        [-0.8, -0.5 + bob],
        [0.8, -0.5 + bob],
        [0.8, 0.5 + bob],
        [-0.8, 0.5 + bob],
        [-0.8, -0.5 + bob],
      ],
      [
        [-0.8, 0.5 + bob],
        [0, -0.05 + bob],
        [0.8, 0.5 + bob],
      ],
      ...morse.slice(0, tapped),
    ];
  },
};

const eleven: Station = {
  id: "eleven",
  at: 11,
  name: "eleven",
  caption: "these go to eleven.",
  // Driven too hard: the figure runs off the screen and flattens at the edges.
  draw: (t, random) => {
    const figure: Point[] = [];
    for (let i = 0; i <= 300; i++) {
      const u = (i / 300) * TAU;
      const x = 2.1 * Math.sin(11 * u + t * 4) + 0.3 * (random() - 0.5);
      const y = 1.5 * Math.sin(7 * u + t * 6.3) + 0.3 * (random() - 0.5);
      figure.push([
        Math.max(-1.6, Math.min(1.6, x)),
        Math.max(-0.92, Math.min(0.92, y)),
      ]);
    }
    return [figure];
  },
};

// The portrait's lines, decoded once into screen units.
const portraitLines: Drawing = portrait.split(";").map((line) =>
  line.split(" ").map((pair): Point => {
    const [x, y] = pair.split(",").map(Number);
    return [((x / 999) * 2 - 1) * 0.98, (1 - (y / 999) * 2) * 0.98];
  }),
);

/** Comes on the air once every other station is logged. */
export const operator: Station = {
  id: "operator",
  at: 4.2,
  name: "the operator",
  caption: "david mostoller. thanks for tuning in.",
  detail: 1600,
  // A faint ripple, like mains hum on the beam.
  draw: (t) =>
    portraitLines.map((line) =>
      line.map(([x, y]): Point => [x, y + 0.004 * Math.sin(t * 40 + x * 12)]),
    ),
};

/** On the dial from the start, in order. */
export const stations = [
  internet,
  hello,
  ride,
  dayJob,
  nightJob,
  library,
  mailbox,
  eleven,
];
/** Where arriving visitors land. */
export const arrival = hello;
/** The stations a visitor can log. */
export const findable = stations.filter((station) => station !== internet);

/**
 * Spreads `count` points evenly along a drawing's lines into `out`, as x, y
 * pairs. The beam moves between lines instantly, so the jumps take no points;
 * `jumps` gets a 1 at each point that starts a new line.
 */
export function trace(
  drawing: Drawing,
  count: number,
  out: Float32Array,
  jumps: Uint8Array,
) {
  const segments: { a: Point; b: Point; length: number; line: number }[] = [];
  let total = 0;
  drawing.forEach((points, line) => {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segments.push({ a, b, length, line });
      total += length;
    }
  });
  let index = 0;
  let walked = 0;
  let line = -1;
  for (let k = 0; k < count; k++) {
    const distance = (k / count) * total;
    while (
      index < segments.length - 1 &&
      walked + segments[index].length < distance
    ) {
      walked += segments[index].length;
      index++;
    }
    const { a, b, length } = segments[index];
    const f = length ? (distance - walked) / length : 0;
    out[2 * k] = a[0] + (b[0] - a[0]) * f;
    out[2 * k + 1] = a[1] + (b[1] - a[1]) * f;
    jumps[k] = segments[index].line === line ? 0 : 1;
    line = segments[index].line;
  }
}

/** A drawing as an SVG path, for a viewBox of "-175 -105 350 210". */
export const svgPath = (drawing: Drawing) =>
  drawing
    .map((line) =>
      line
        .map(
          ([x, y], i) =>
            `${i ? "L" : "M"}${(x * 100).toFixed(1)} ${(-y * 100).toFixed(1)}`,
        )
        .join(""),
    )
    .join("");
