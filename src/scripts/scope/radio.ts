// The radio, Scope's one page: a dial from 0 to 11 with stations hidden in
// the static. Each station is a picture traced by the beam
// (src/lib/scope/stations.ts) and, with sound on, a little piece of music
// (music.ts). Arriving tunes away from the internet at 0; leaving tunes back
// to it and crosses over to the main site.
import { crossTo } from "../crossing";
import {
  arrival,
  BASE_DETAIL,
  DIAL_MAX,
  findable,
  internet,
  operator,
  SPAN_X,
  stations,
  trace,
  type Station,
} from "../../lib/scope/stations";
import { createScreen } from "./beam";
import { chime, setMusic, tuneMusic } from "./music";
import { setSound, soundChosen, soundEnabled } from "./sound";

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function required<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`radio: missing ${selector}`);
  return element;
}

const canvas = required<HTMLCanvasElement>("[data-screen]");
const dial = required<HTMLInputElement>("[data-dial]");
const frequencyLabel = required<HTMLElement>("[data-frequency]");
const nameLabel = required<HTMLElement>("[data-name]");
const captionLabel = required<HTMLElement>("[data-caption]");
const loggedLabel = required<HTMLElement>("[data-logged]");
const marks = required<HTMLElement>("[data-marks]");
const announcer = required<HTMLElement>("[data-announce]");
const away = required<HTMLElement>("[data-away]");
const soundButton = required<HTMLButtonElement>("[data-sound]");
const abSwitch = required<HTMLAnchorElement>("[data-ab-switch]");

function store(storage: () => Storage) {
  return {
    get(key: string) {
      try {
        return storage().getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string) {
      try {
        storage().setItem(key, value);
      } catch {
        // Blocked storage only means this lasts for the page.
      }
    },
    remove(key: string) {
      try {
        storage().removeItem(key);
      } catch {
        // As above.
      }
    },
  };
}
const local = store(() => localStorage);
const session = store(() => sessionStorage);

/** A repeatable stand-in for Math.random, so stills don't flicker. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- the log

const loggedIds = new Set<string>(
  (() => {
    try {
      const saved: unknown = JSON.parse(local.get("dbm-logged") ?? "[]");
      return Array.isArray(saved)
        ? saved.filter((id) => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  })(),
);
const loggedCount = () =>
  findable.filter((station) => loggedIds.has(station.id)).length;
const allLogged = () => loggedCount() === findable.length;
const onAir = () => (allLogged() ? [...stations, operator] : stations);

function renderMarks() {
  marks.replaceChildren(
    ...onAir()
      .filter((station) => loggedIds.has(station.id) || station === operator)
      .map((station) => {
        const mark = document.createElement("span");
        mark.className = "dial-mark";
        mark.title = station.name;
        mark.style.setProperty("--at", String(station.at / DIAL_MAX));
        return mark;
      }),
  );
  loggedLabel.textContent = allLogged()
    ? `all ${findable.length} logged`
    : `logged ${loggedCount()}/${findable.length}`;
}

/** Logs a newly found station. Says whether that was a new find or the last one. */
function log(station: Station) {
  if (!findable.includes(station) || loggedIds.has(station.id)) return;
  loggedIds.add(station.id);
  local.set("dbm-logged", JSON.stringify([...loggedIds]));
  renderMarks();
  loggedLabel.removeAttribute("data-bumped");
  void loggedLabel.offsetWidth;
  loggedLabel.setAttribute("data-bumped", "");
  if (!allLogged()) return "logged";
  // The last one puts the operator on the air, and the dial goes to find it.
  window.setTimeout(() => {
    if (!sweep && !leaving && nearest() === station)
      sweepTo(operator.at, 2400, "all logged. something just came on the air…");
  }, 1800);
  return "complete";
}

// ---------------------------------------------------------------- tuning

let value = Number(dial.value);
let sweep:
  | { from: number; to: number; start: number; duration: number; note: string }
  | undefined;
let arrivalTimer: number | undefined;
let leaving = false;

function tune(next: number) {
  if (leaving) return;
  window.clearTimeout(arrivalTimer);
  sweep = undefined;
  setValue(next);
}

function setValue(next: number) {
  value = Math.max(0, Math.min(DIAL_MAX, next));
  dial.value = String(value);
  if (reducedMotion) requestRender();
}

function sweepTo(to: number, duration: number, note = "") {
  if (reducedMotion) {
    setValue(to);
    return;
  }
  sweep = { from: value, to, start: performance.now(), duration, note };
}

const ease = (k: number) =>
  k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

/** The station the dial is locked onto, if any. */
function nearest() {
  let best: Station | undefined;
  let distance = Infinity;
  for (const station of onAir()) {
    const d = Math.abs(value - station.at);
    if (d < distance) {
      distance = d;
      best = station;
    }
  }
  return distance < LOCK ? best : undefined;
}

/** Glides to the next station up (1) or down (-1) the dial. */
function jump(direction: 1 | -1) {
  const ordered = [...onAir()].sort((a, b) => a.at - b.at);
  if (direction < 0) ordered.reverse();
  const next = ordered.find((station) =>
    direction > 0 ? station.at > value + 0.05 : station.at < value - 0.05,
  );
  if (!next) return;
  window.clearTimeout(arrivalTimer);
  sweepTo(next.at, 800);
}

// ---------------------------------------------------------------- rendering

// How wide a station's signal is on the dial, and how close counts as tuned in.
const WIDTH = 0.3;
const LOCK = 0.15;
// A faint flat line under everything, so the static has somewhere to sit.
const CARRIER = 0.04;

const maxDetail = Math.max(
  BASE_DETAIL,
  ...[...stations, operator].map((s) => s.detail ?? BASE_DETAIL),
);
const mixed = new Float32Array(maxDetail * 2);
const mixedJumps = new Uint8Array(maxDetail);
const sample = new Float32Array(maxDetail * 2);
const sampleJumps = new Uint8Array(maxDetail);

// Stills only render when something changes.
let renderQueued = false;
function requestRender() {
  if (!reducedMotion || renderQueued) return;
  renderQueued = true;
  requestAnimationFrame((now) => {
    renderQueued = false;
    render(now);
  });
}

const screen = createScreen(canvas, {
  still: reducedMotion,
  onResize: () => requestRender(),
});

function render(now: number) {
  if (sweep) {
    const k = Math.min(1, (now - sweep.start) / sweep.duration);
    setValue(sweep.from + (sweep.to - sweep.from) * ease(k));
    if (k >= 1) sweep = undefined;
  }

  // Stills freeze time and randomness so nothing flickers.
  const t = reducedMotion ? 0.6 : now / 1000;
  const random = reducedMotion ? seeded(11) : Math.random;

  // Each station within reach is mixed in by how close the dial is to it.
  let total = 0;
  let clarity = 0;
  let count = BASE_DETAIL;
  let nearInternet = 0;
  let nearEleven = 0;
  const reached: [Station, number][] = [];
  for (const station of onAir()) {
    const weight = Math.exp(-(((value - station.at) / WIDTH) ** 2));
    if (weight < 0.004) continue;
    reached.push([station, weight]);
    total += weight;
    clarity = Math.max(clarity, weight);
    count = Math.max(count, station.detail ?? BASE_DETAIL);
    if (station === internet) nearInternet = weight;
    if (station.at === DIAL_MAX) nearEleven = weight;
  }
  // The carrier fades out as a station comes in, so it can't skew the picture.
  const carrier = CARRIER * (1 - clarity) ** 2;
  total += carrier;
  for (let k = 0; k < count; k++) {
    mixed[2 * k] = carrier * (-SPAN_X + (2 * SPAN_X * k) / count);
    mixed[2 * k + 1] = 0;
  }
  // The beam lifts between lines only once a station comes in clearly;
  // until then it's all one scribble.
  mixedJumps.fill(0);
  for (const [station, weight] of reached) {
    trace(station.draw(t, random), count, sample, sampleJumps);
    for (let i = 0; i < count * 2; i++) mixed[i] += weight * sample[i];
    if (weight === clarity && clarity > 0.5) mixedJumps.set(sampleJumps);
  }
  for (let i = 0; i < count * 2; i++) mixed[i] /= total;

  screen.draw(
    {
      path: mixed,
      jumps: mixedJumps,
      count,
      noise: 1 - clarity,
      internet: nearInternet,
      eleven: nearEleven,
      random,
    },
    now,
  );
  if (soundOn)
    tuneMusic(
      new Map(reached.map(([station, weight]) => [station.id, weight])),
      clarity,
    );
  updateReadout();
}

function loop(now: number) {
  render(now);
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- readout

let shownKey = "";
let shownNote = "";
let lockedId: string | undefined;

function renderCaption(station: Station | undefined, note: string) {
  if (!station) {
    captionLabel.textContent = note || "static";
    return;
  }
  captionLabel.textContent = station.caption;
  for (const link of station.links ?? []) {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = `${link.label}${link.href.startsWith("http") ? " ↗" : ""}`;
    a.className = "radio-link";
    captionLabel.append(" ", a);
  }
  if (station === internet && !note) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "rejoin it ↵";
    button.className = "radio-link";
    button.addEventListener("click", leave);
    captionLabel.append(" · ", button);
  }
}

function updateReadout() {
  const frequency = value.toFixed(1).padStart(4, "0");
  const station = nearest();
  const note = sweep?.note ?? "";
  const key = `${frequency}|${station?.id}|${note}`;
  if (key === shownKey) return;
  shownKey = key;

  frequencyLabel.textContent = frequency;
  dial.setAttribute(
    "aria-valuetext",
    `${frequency}, ${station ? station.name : "static"}`,
  );
  if (station?.id === lockedId && note === shownNote) return;
  const locked = station && station.id !== lockedId ? station : undefined;
  lockedId = station?.id;
  shownNote = note;
  nameLabel.textContent = station ? station.name : "—";
  renderCaption(station, note);
  document.title = `dbm · ${station === arrival ? "david mostoller" : (station?.name ?? "static")}`;
  if (!locked) return;
  announcer.textContent = `${locked.name}: ${locked.caption}`;
  const found = log(locked);
  if (soundOn) chime(locked.id, found ?? "lock");
}

// ---------------------------------------------------------------- input

dial.addEventListener("input", () => tune(dial.valueAsNumber));

let dragX: number | undefined;
canvas.addEventListener("pointerdown", (event) => {
  dragX = event.clientX;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (dragX === undefined) return;
  // Dragging across the whole screen covers about half the dial.
  tune(value + ((event.clientX - dragX) / canvas.clientWidth) * 6);
  dragX = event.clientX;
});
const endDrag = () => (dragX = undefined);
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    // Firefox can report lines instead of pixels.
    const pixels = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
    tune(value + (event.deltaY + event.deltaX) * pixels * 0.003);
  },
  { passive: false },
);

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target instanceof Element ? event.target : null;
  const onControl = Boolean(target?.closest("a, button"));
  const step = event.shiftKey ? 0.5 : 0.1;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowUp":
      tune(value + step);
      break;
    case "ArrowLeft":
    case "ArrowDown":
      tune(value - step);
      break;
    case "PageUp":
    case "]":
      jump(1);
      break;
    case "PageDown":
    case "[":
      jump(-1);
      break;
    case "Home":
      tune(0);
      break;
    case "End":
      tune(DIAL_MAX);
      break;
    case "Escape":
      leave();
      break;
    case "Enter":
      if (onControl || nearest() !== internet) return;
      leave();
      break;
    default:
      return;
  }
  event.preventDefault();
});

// ---------------------------------------------------------------- sound

let soundOn = false;

function syncSoundButton(label = soundEnabled() ? "on" : "off") {
  soundButton.setAttribute("aria-pressed", String(soundEnabled()));
  soundButton.classList.toggle("text-primary", soundEnabled());
  const text = soundButton.querySelector("[data-sound-label]");
  if (text) text.textContent = label;
}

function startSound(on: boolean) {
  const ok = setMusic(on);
  soundOn = on && ok;
  if (on && !ok) {
    setSound(false);
    syncSoundButton("n/a");
  }
  // Turning it on mid-station rings that station in.
  if (soundOn && lockedId) chime(lockedId, "lock");
}

soundButton.addEventListener("click", () => {
  const on = !soundEnabled();
  setSound(on);
  soundButton.removeAttribute("data-invite");
  syncSoundButton();
  startSound(on);
});
syncSoundButton();
// Until a visitor has chosen, the button glows a little to say there's sound.
soundButton.toggleAttribute("data-invite", !soundChosen());

// Remembered as on: browsers wait for a gesture before playing anything.
if (soundEnabled()) {
  const unlock = (event: Event) => {
    if (event.target === soundButton) return;
    removeEventListener("pointerdown", unlock);
    removeEventListener("keydown", unlock);
    if (soundEnabled()) startSound(true);
  };
  addEventListener("pointerdown", unlock);
  addEventListener("keydown", unlock);
}

// ---------------------------------------------------------------- away timer

let since = Number(session.get("dbm-away-since"));
if (!since) {
  since = Date.now();
  session.set("dbm-away-since", String(since));
}
function tickAway() {
  const seconds = Math.floor((Date.now() - since) / 1000);
  away.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
tickAway();
window.setInterval(tickAway, 1000);

// ---------------------------------------------------------------- arriving and leaving

/** Where to go back to: the Signal page the visitor crossed over from. */
function returnPath() {
  const saved = session.get("dbm-return");
  return saved && /^\/(?!\/)/.test(saved) && !saved.startsWith("/scope")
    ? saved
    : "/";
}

function arrive() {
  leaving = false;
  abSwitch.dataset.state = "b";
  if (reducedMotion) {
    setValue(arrival.at);
    return;
  }
  // Land on the internet, then drift away from it.
  setValue(internet.at);
  arrivalTimer = window.setTimeout(
    () => sweepTo(arrival.at, 2800, "leaving the internet…"),
    1300,
  );
}

function leave() {
  if (leaving) return;
  leaving = true;
  window.clearTimeout(arrivalTimer);
  abSwitch.dataset.state = "a";
  session.remove("dbm-away-since");
  const destination = returnPath();
  if (reducedMotion) {
    crossTo(destination);
    return;
  }
  // Tune back to the internet, then cross over.
  const duration = Math.min(1400, 400 + value * 120);
  sweepTo(internet.at, duration, "rejoining the internet…");
  window.setTimeout(() => {
    if (soundOn) setMusic(false);
    crossTo(destination);
  }, duration);
}

abSwitch.href = returnPath();
abSwitch.dataset.origin = "b";
abSwitch.addEventListener("click", (event) => {
  // Let modified clicks open the main site in a new tab.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
    return;
  event.preventDefault();
  leave();
});

// Coming back through the back/forward cache lands mid-departure, so arrive again.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  since = Date.now();
  session.set("dbm-away-since", String(since));
  arrive();
});

renderMarks();
arrive();
if (reducedMotion) requestRender();
else requestAnimationFrame(loop);
