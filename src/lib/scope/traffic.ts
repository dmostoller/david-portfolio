// Deterministic generator for the Scope traffic chart. It runs at build
// time, so the SVG ships as static markup with no client JS.

export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = [number, number];

function toPath(points: Point[]) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("");
}

/**
 * Raw ingress with attack bursts, plus the legitimate traffic left
 * after scrubbing. Two identical periods are emitted so the group can be
 * translated by one period and loop seamlessly.
 */
export function scrubbedTraffic({
  width = 680,
  height = 140,
  samples = 136,
  seed = 5,
} = {}) {
  const rand = rng(seed);
  const bursts = [
    { at: 0.14, spread: 0.018, peak: 0.5 },
    { at: 0.42, spread: 0.03, peak: 0.78 },
    { at: 0.49, spread: 0.012, peak: 0.42 },
    { at: 0.77, spread: 0.022, peak: 0.62 },
  ];
  const legit: number[] = [];
  const ingress: number[] = [];
  for (let i = 0; i < samples; i++) {
    const u = i / samples;
    // Integer cycle counts keep the baseline periodic across the loop seam.
    const base =
      0.26 +
      0.06 * Math.sin(u * Math.PI * 4) +
      0.035 * Math.sin(u * Math.PI * 10 + 1.3);
    const clean = base + (rand() - 0.5) * 0.045;
    let attack = 0;
    for (const b of bursts) {
      const d = (u - b.at) / b.spread;
      attack += b.peak * Math.exp(-d * d) * (0.7 + rand() * 0.6);
    }
    legit.push(clean);
    ingress.push(clean + attack);
  }

  const pad = 10;
  const max = 1.25;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const dx = width / samples;
  const points = (series: number[]) =>
    Array.from(
      { length: samples * 2 + 1 },
      (_, i): Point => [i * dx, y(series[i % samples])],
    );

  const ingressPoints = points(ingress);
  const cleanPoints = points(legit);
  return {
    ingress: toPath(ingressPoints),
    clean: toPath(cleanPoints),
    scrubbed: toPath([...ingressPoints, ...[...cleanPoints].reverse()]) + "Z",
    thresholdY: y(0.5),
    width,
    height,
  };
}
