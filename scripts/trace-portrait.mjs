// Traces src/assets/headshot.jpg into a few contour lines for the radio's
// hidden station, and writes them to src/lib/scope/portrait.ts. Run it again
// after changing the photo:
//
//   node scripts/trace-portrait.mjs [--preview out.png]
//
// The lines are isolines (marching squares) of the blurred photo at a few
// brightness levels: the first outlines the head and shoulders against the
// background, the darker ones the features (hair, glasses, eyes, beard).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SOURCE = fileURLToPath(
  new URL("../src/assets/headshot.jpg", import.meta.url),
);
const OUTPUT = new URL("../src/lib/scope/portrait.ts", import.meta.url);
const SIZE = 320;
const LEVELS = [
  { level: 188, minLength: 60 },
  { level: 112, minLength: 22 },
  { level: 60, minLength: 22 },
];

const { data } = await sharp(SOURCE)
  .resize(SIZE, SIZE)
  .greyscale()
  .blur(1.1)
  .raw()
  .toBuffer({ resolveWithObject: true });
const at = (x, y) => data[y * SIZE + x];

/** Marching squares: the contour at `level` as polylines in pixel coordinates. */
function isolines(level) {
  // Each segment joins two cell edges, named by position so neighbors share them.
  const ends = new Map();
  const points = new Map();
  const segments = [];
  const edge = (x0, y0, x1, y1) => {
    const id = `${x0},${y0},${x1},${y1}`;
    if (!points.has(id)) {
      const a = at(x0, y0);
      const b = at(x1, y1);
      const t = (level - a) / (b - a);
      points.set(id, [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
    return id;
  };
  for (let y = 0; y < SIZE - 1; y++) {
    for (let x = 0; x < SIZE - 1; x++) {
      const corners = [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
      ];
      const inside = corners.map(([cx, cy]) => at(cx, cy) < level);
      const crossings = [];
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = corners[i];
        const [bx, by] = corners[(i + 1) % 4];
        if (inside[i] === inside[(i + 1) % 4]) continue;
        // Name the edge the same way from either cell.
        crossings.push(
          ax < bx || ay < by ? edge(ax, ay, bx, by) : edge(bx, by, ax, ay),
        );
      }
      // Two crossings make one segment; four (a saddle) make two.
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const segment = [crossings[i], crossings[i + 1]];
        segments.push(segment);
        for (const id of segment) {
          if (!ends.has(id)) ends.set(id, []);
          ends.get(id).push(segment);
        }
      }
    }
  }

  // Walk segments into chains.
  const used = new Set();
  const chains = [];
  const extend = (chain, from) => {
    let current = from;
    for (;;) {
      const next = (ends.get(current) ?? []).find((s) => !used.has(s));
      if (!next) return;
      used.add(next);
      current = next[0] === current ? next[1] : next[0];
      chain.push(current);
    }
  };
  for (const segment of segments) {
    if (used.has(segment)) continue;
    used.add(segment);
    const forward = [segment[0], segment[1]];
    extend(forward, segment[1]);
    const backward = [];
    extend(backward, segment[0]);
    chains.push(
      [...backward.reverse(), ...forward].map((id) => points.get(id)),
    );
  }
  return chains;
}

const length = (chain) =>
  chain.reduce(
    (total, p, i) =>
      i
        ? total + Math.hypot(p[0] - chain[i - 1][0], p[1] - chain[i - 1][1])
        : 0,
    0,
  );

/** Douglas–Peucker. */
function simplify(chain, epsilon = 0.6) {
  if (chain.length < 3) return chain;
  const [ax, ay] = chain[0];
  const [bx, by] = chain[chain.length - 1];
  const span = Math.hypot(bx - ax, by - ay) || 1;
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < chain.length - 1; i++) {
    const [px, py] = chain[i];
    const d =
      span === 1 && ax === bx && ay === by
        ? Math.hypot(px - ax, py - ay)
        : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / span;
    if (d > farthest) {
      farthest = d;
      index = i;
    }
  }
  if (farthest <= epsilon) return [chain[0], chain[chain.length - 1]];
  return [
    ...simplify(chain.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(chain.slice(index), epsilon),
  ];
}

const chains = LEVELS.flatMap(({ level, minLength }) =>
  isolines(level)
    .filter((chain) => length(chain) >= minLength)
    .map((chain) => simplify(chain)),
);

// Order the chains so the beam's jumps between them are short: always go to
// the nearest unvisited chain, entering at whichever end (or, for a loop,
// whichever point) is closest.
const ordered = [];
let pen = [SIZE / 2, 0];
const remaining = [...chains];
while (remaining.length) {
  let best = { distance: Infinity, index: 0, chain: remaining[0] };
  remaining.forEach((chain, index) => {
    const first = chain[0];
    const last = chain[chain.length - 1];
    const closed = Math.hypot(first[0] - last[0], first[1] - last[1]) < 1;
    const candidates = closed ? chain.map((_, i) => i) : [0, chain.length - 1];
    for (const i of candidates) {
      const d = Math.hypot(chain[i][0] - pen[0], chain[i][1] - pen[1]);
      if (d >= best.distance) continue;
      let entered = chain;
      if (closed) entered = [...chain.slice(i, -1), ...chain.slice(0, i + 1)];
      else if (i !== 0) entered = [...chain].reverse();
      best = { distance: d, index, chain: entered };
    }
  });
  remaining.splice(best.index, 1);
  ordered.push(best.chain);
  pen = best.chain[best.chain.length - 1];
}

// Points on a 0–999 grid, "x,y" pairs, chains separated by ";".
const scale = 999 / (SIZE - 1);
const encoded = ordered
  .map((chain) =>
    chain
      .map(([x, y]) => `${Math.round(x * scale)},${Math.round(y * scale)}`)
      .join(" "),
  )
  .join(";");
const pointCount = ordered.reduce((total, chain) => total + chain.length, 0);

writeFileSync(
  OUTPUT,
  `// Generated by scripts/trace-portrait.mjs from src/assets/headshot.jpg. Don't edit by hand.
// ${ordered.length} lines, ${pointCount} points on a 0–999 grid: "x,y" pairs, lines separated by ";".
export const portrait =
  "${encoded}";
`,
);
console.log(`wrote ${ordered.length} lines, ${pointCount} points`);

const previewAt = process.argv.indexOf("--preview");
if (previewAt !== -1) {
  const lines = ordered
    .map(
      (chain) =>
        `<polyline points="${chain.map(([x, y]) => `${x * 4},${y * 4}`).join(" ")}" />`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * 4}" height="${SIZE * 4}"><rect width="100%" height="100%" fill="#050908"/><g fill="none" stroke="#6effb4" stroke-width="2" stroke-linejoin="round">${lines}</g></svg>`;
  await sharp(Buffer.from(svg))
    .png()
    .toFile(process.argv[previewAt + 1]);
}
