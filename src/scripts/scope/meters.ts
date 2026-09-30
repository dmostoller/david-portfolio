// Level meters: an idle wobble that activity (bump) pushes harder and the aux
// send knob (setGain) scales. Peak ticks hang at the highest recent level and
// then fall; the clip light latches when a level goes over the top, until
// it's clicked.
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const root = document.documentElement;

interface Channel {
  bar: HTMLElement;
  peak?: HTMLElement;
  peakLevel: number;
  peakAt: number;
}

const channels: Channel[] = [
  ...document.querySelectorAll<HTMLElement>("[data-meter-channel]"),
].map((bar) => ({
  bar,
  peak:
    bar.parentElement?.querySelector<HTMLElement>("[data-meter-peak]") ??
    undefined,
  peakLevel: 0,
  peakAt: 0,
}));
const clipLights = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-clip]"),
];

let energy = 0;
let gain = 1;
let pinned = false;

export function bump(amount: number) {
  energy = Math.min(1, energy + amount);
}

/** Scales every meter; 1 is unity. */
export function setGain(value: number) {
  gain = value;
  if (reducedMotion) showStill();
}

/** Holds every meter at the top (and over it), for as long as `on`. */
export function pin(on: boolean) {
  pinned = on;
  if (on) clip();
  if (reducedMotion) showStill();
}

// With reduced motion the meters don't move, but the knob still sets their level.
function showStill() {
  const level = pinned ? 1 : Math.min(0.98, 0.45 * gain);
  for (const channel of channels)
    channel.bar.style.setProperty("--level", `${(level * 100).toFixed(1)}%`);
}

function clip() {
  for (const light of clipLights) {
    if (light.hasAttribute("data-lit")) continue;
    light.setAttribute("data-lit", "");
    light.setAttribute("aria-label", "Clipped. Reset the clip light");
  }
}

for (const light of clipLights) {
  light.addEventListener("click", () => {
    light.removeAttribute("data-lit");
    light.setAttribute("aria-label", "Clip light");
  });
}

// How long a peak tick holds before it starts to fall, and how fast it falls.
const PEAK_HOLD = 900;
const PEAK_FALL = 0.5;

if (channels.length > 0 && !reducedMotion) {
  root.dataset.metersLive = "";
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    energy *= Math.pow(0.12, dt);
    const t = now / 1000;
    channels.forEach((channel, i) => {
      const idle =
        0.34 +
        0.09 * Math.sin(t * 1.9 + i * 1.7) +
        0.05 * Math.sin(t * 5.3 + i * 0.6);
      const jitter = (Math.random() - 0.5) * 0.08 * (0.3 + energy);
      const raw = pinned
        ? 1.02 + jitter * 0.2
        : (idle + energy * 0.6 + jitter) * gain;
      if (raw > 1) clip();
      const level = Math.max(0, Math.min(pinned ? 1 : 0.98, raw));
      channel.bar.style.setProperty("--level", `${(level * 100).toFixed(1)}%`);

      if (!channel.peak) return;
      if (level >= channel.peakLevel) {
        channel.peakLevel = level;
        channel.peakAt = now;
      } else if (now - channel.peakAt > PEAK_HOLD) {
        channel.peakLevel = Math.max(level, channel.peakLevel - PEAK_FALL * dt);
      }
      channel.peak.style.setProperty(
        "--peak",
        `${(channel.peakLevel * 100).toFixed(1)}%`,
      );
      channel.peak.toggleAttribute("data-hot", channel.peakLevel > 0.9);
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.addEventListener("scroll", () => bump(0.03), { passive: true });
  window.addEventListener("pointerdown", () => bump(0.15), { passive: true });
  // So does the packet landing at the end of the signal path.
  const landing = document.querySelector("[data-hop-land]");
  for (const type of ["animationstart", "animationiteration"])
    landing?.addEventListener(type, () => bump(0.25));
}
