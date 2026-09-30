// The signal / noise chart's reactions. As each burst reaches the detector it
// flashes red, then teal, and the scrubbed count ticks up. Clicking the chart
// (or the `attack` command) launches the visitor's own attack, which rises in
// red and gets scrubbed like the rest.
import { bump } from "./meters";
import { playBlip } from "./sound";
import { showToast } from "./toast";

interface ChartData {
  period: number;
  width: number;
  samples: number;
  dx: number;
  cleanY: number[];
  unit: number;
  detections: number[];
}

interface Attack {
  /** Positions the attack; moved every frame to scroll with the chart. */
  holder: SVGGElement;
  /** Scroll position (unwrapped) of the attack's center when it launched. */
  origin: number;
}

const SVG = "http://www.w3.org/2000/svg";
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const container = document.querySelector<HTMLElement>("[data-traffic]");

const scrubbedLines = [
  "nice try. scrubbed.",
  "attack absorbed. clean traffic unaffected.",
  "detected in 600ms. scrubbed.",
  "is that all you've got?",
];

const session = {
  get(key: string) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // The count then lasts for this page only.
    }
  },
};

let launch: ((x?: number) => void) | undefined;

/** Launches an attack at `x` (chart units), or near the detector. False if there's no chart. */
export function attack(x?: number) {
  if (!launch) return false;
  container?.scrollIntoView({
    block: "nearest",
    behavior: reducedMotion ? "auto" : "smooth",
  });
  launch(x);
  return true;
}

if (container) {
  const chart: ChartData = JSON.parse(container.dataset.traffic ?? "{}");
  const svg = container.querySelector("svg")!;
  const layer = container.querySelector<SVGGElement>("[data-attacks]")!;
  const detector = container.querySelector<HTMLElement>("[data-detector]")!;
  const counter = container.querySelector<HTMLElement>("[data-scrubbed]")!;
  // No scroll animation with reduced motion; the chart then holds still.
  const scroll = container
    .querySelector("[data-traffic-scroll]")
    ?.getAnimations()[0];
  const speed = chart.width / chart.period;
  const elapsed = () => Number(scroll?.currentTime ?? 0);

  let count = Number(session.get("scope-scrubbed")) || 0;
  counter.textContent = String(count);

  function countOne() {
    count++;
    session.set("scope-scrubbed", String(count));
    counter.textContent = String(count);
    counter.removeAttribute("data-bumped");
    void counter.getBoundingClientRect();
    counter.setAttribute("data-bumped", "");
  }

  let detectorTimers: number[] = [];

  /** Red on detection, teal once scrubbed, then back to waiting. */
  function detect(onScrubbed?: () => void) {
    // A new detection restarts the label, but every attack still gets scrubbed and counted.
    detectorTimers.forEach((timer) => window.clearTimeout(timer));
    detector.dataset.state = "alert";
    detector.textContent = "attack";
    bump(0.3);
    window.setTimeout(() => {
      countOne();
      onScrubbed?.();
    }, 600);
    detectorTimers = [
      window.setTimeout(() => {
        detector.dataset.state = "clear";
        detector.textContent = "scrubbed";
      }, 600),
      window.setTimeout(() => {
        delete detector.dataset.state;
        detector.textContent = "detect";
      }, 1800),
    ];
  }

  // ------------------------------------------------------------ attacks

  const attacks: Attack[] = [];
  let recent: number[] = [];

  function path(d: string, attributes: Record<string, string>) {
    const element = document.createElementNS(SVG, "path");
    element.setAttribute("d", d);
    for (const [name, value] of Object.entries(attributes))
      element.setAttribute(name, value);
    return element;
  }

  function place(item: Attack) {
    const x = item.origin - (reducedMotion ? 0 : speed * elapsed());
    item.holder.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
    return x;
  }

  launch = (x = chart.width * (0.6 + Math.random() * 0.25)) => {
    const now = performance.now();
    recent = recent.filter((at) => now - at < 2000);
    if (recent.length >= 5) {
      showToast("429 too many requests. easy, attacker.");
      playBlip(180);
      return;
    }
    recent.push(now);

    // Snap to a sample so the attack's base sits exactly on the clean line.
    const scrolled = reducedMotion ? 0 : speed * elapsed();
    const center = Math.round((x + scrolled) / chart.dx);
    const spread = 1.8 + Math.random() * 1.6;
    const peak = 0.55 + Math.random() * 0.45;
    const top: string[] = [];
    const base: string[] = [];
    for (let i = -8; i <= 8; i++) {
      const sample =
        (((center + i) % chart.samples) + chart.samples) % chart.samples;
      const clean = chart.cleanY[sample];
      const lift =
        peak *
        Math.exp(-((i / spread) ** 2)) *
        (0.75 + Math.random() * 0.5) *
        chart.unit;
      const px = (i * chart.dx).toFixed(1);
      top.push(`${px} ${(clean - lift).toFixed(1)}`);
      base.unshift(`${px} ${clean.toFixed(1)}`);
    }

    const holder = document.createElementNS(SVG, "g");
    const shape = document.createElementNS(SVG, "g");
    shape.setAttribute("class", "attack");
    shape.append(
      path(`M${[...top, ...base].join("L")}Z`, {
        fill: "url(#scrub-hatch)",
        class: "attack-scrubbed text-muted-foreground/35",
      }),
      path(`M${top.join("L")}`, {
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.25",
        "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke",
        class: "attack-ingress",
      }),
    );
    holder.append(shape);
    layer.append(holder);

    const item = { holder, origin: center * chart.dx };
    place(item);
    attacks.push(item);
    // Anything past a handful just clutters the chart.
    if (attacks.length > 8) attacks.shift()?.holder.remove();

    playBlip(220);
    detect(() => {
      shape.setAttribute("data-scrubbed", "");
      showToast(
        scrubbedLines[Math.floor(Math.random() * scrubbedLines.length)],
      );
      playBlip(660);
    });

    if (reducedMotion) {
      window.setTimeout(() => shape.setAttribute("data-leaving", ""), 5000);
      window.setTimeout(() => {
        holder.remove();
        attacks.splice(attacks.indexOf(item), 1);
      }, 5600);
    }
  };

  container.addEventListener("click", (event) => {
    const rect = svg.getBoundingClientRect();
    launch?.(((event.clientX - rect.left) / rect.width) * chart.width);
  });

  // ------------------------------------------------------------ frame loop

  if (scroll) {
    const offsetAt = (time: number) =>
      ((time % chart.period) / chart.period) * chart.width;
    // True if the scroll offset moved past `d` between two frames, allowing for the loop.
    const crossed = (from: number, to: number, d: number) =>
      from <= to ? d > from && d <= to : d > from || d <= to;
    let last: number | undefined;

    const frame = () => {
      const time = elapsed();
      // Skip big jumps (a tab coming back into view) rather than firing a burst of detections.
      if (last !== undefined && time > last && time - last < 1000) {
        const from = offsetAt(last);
        const to = offsetAt(time);
        if (chart.detections.some((d) => crossed(from, to, d))) detect();
      }
      last = time;

      for (let i = attacks.length - 1; i >= 0; i--) {
        if (place(attacks[i]) < -chart.dx * 10) {
          attacks[i].holder.remove();
          attacks.splice(i, 1);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
