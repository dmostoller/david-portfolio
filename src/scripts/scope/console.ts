// Scope's console: keyboard navigation, filtering, the command line, help,
// the boot sequence, activity-driven meters, and opt-in sound. Loaded only on
// Scope pages, so Signal never pays for it.
import { bindABSwitch, crossTo, paintStatic } from "../crossing";
import { accents, commandHelp } from "../../lib/scope/commands";
import { playBlip, playBoot, playClick, setSound, soundEnabled } from "./sound";

interface Route {
  name: string;
  aliases: string[];
  href: string;
}

interface ScopeData {
  cwd: string;
  exit: string;
  email: string;
  whoami: string[];
  routes: Route[];
  boot: string[];
}

const data: ScopeData = JSON.parse(document.getElementById("scope-data")?.textContent ?? "{}");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

function required<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`scope: missing ${selector}`);
  return element;
}

const output = required<HTMLElement>("#scope-output");
const outputLines = required<HTMLElement>("[data-output-lines]");
const prompt = required<HTMLFormElement>("[data-prompt]");
const promptInput = required<HTMLInputElement>("[data-prompt-input]");
const promptSigil = required<HTMLElement>("[data-prompt-sigil]");
const mode = required<HTMLElement>("[data-mode]");
const statusPath = required<HTMLElement>("[data-status-path]");
const suggestions = required<HTMLUListElement>("[data-suggestions]");
const help = required<HTMLElement>("#scope-help");
const toast = required<HTMLElement>("[data-toast]");
const basePath = statusPath.textContent?.trim() ?? data.cwd;

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
      // Private modes can block storage; the console still works without it.
    }
  },
};

// ---------------------------------------------------------------- rows

let selected: HTMLElement | undefined;
const hasDetailPanels = document.querySelector("[data-detail-panel]") !== null;
const visibleRows = () =>
  [...document.querySelectorAll<HTMLElement>("[data-row]")].filter((row) => !row.hidden);

function select(row: HTMLElement | undefined, { scroll = true } = {}) {
  selected?.removeAttribute("data-selected");
  selected = row;
  if (!row) return;
  row.setAttribute("data-selected", "");
  if (scroll) row.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  const detail = row.dataset.detail;
  if (!detail) return;
  for (const panel of document.querySelectorAll<HTMLElement>("[data-detail-panel]")) {
    panel.hidden = panel.dataset.detailPanel !== detail;
  }
}

function move(step: number) {
  const rows = visibleRows();
  if (rows.length === 0) return;
  const index = selected ? rows.indexOf(selected) : -1;
  const next = index === -1 ? (step > 0 ? 0 : rows.length - 1) : index + step;
  select(rows[Math.max(0, Math.min(rows.length - 1, next))]);
}

function openRow(row = selected) {
  const href = row?.dataset.href;
  if (!href) return false;
  playBlip(660);
  if (/^https?:/.test(href)) window.open(href, "_blank", "noopener");
  else window.location.href = href;
  return true;
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const row = event.target.closest<HTMLElement>("[data-row]");
  if (row && !event.target.closest("a, button")) select(row, { scroll: false });
});
document.addEventListener("dblclick", (event) => {
  if (!(event.target instanceof Element)) return;
  const row = event.target.closest<HTMLElement>("[data-row]");
  if (row) openRow(row);
});

// Master-detail windows start with the first row selected so the detail pane has something to show.
if (hasDetailPanels) select(visibleRows()[0], { scroll: false });

// ---------------------------------------------------------------- output

function line(text: string, className?: string) {
  const div = document.createElement("div");
  div.textContent = text;
  if (className) div.className = className;
  return div;
}

function print(...lines: string[]) {
  output.hidden = false;
  const block = document.createElement("div");
  block.className = "py-0.5";
  block.append(...lines.map((text) => line(text || " ", "whitespace-pre-wrap")));
  outputLines.append(block);
  while (outputLines.childElementCount > 14) outputLines.firstElementChild?.remove();
  outputLines.scrollTop = outputLines.scrollHeight;
}

function echo(command: string) {
  output.hidden = false;
  const div = document.createElement("div");
  div.className = "mt-1 text-muted-foreground";
  const sigil = document.createElement("span");
  sigil.className = "text-primary";
  sigil.textContent = ": ";
  div.append(sigil, command);
  outputLines.append(div);
}

function hideOutput() {
  output.hidden = true;
  outputLines.replaceChildren();
}

required<HTMLButtonElement>("[data-output-close]").addEventListener("click", hideOutput);

let toastTimer: number | undefined;
function showToast(message: string, ms = 1800) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), ms);
}

// ---------------------------------------------------------------- filter

let activeFilter = "";

function applyFilter(query: string) {
  activeFilter = query.trim().toLowerCase();
  let shown = 0;
  let total = 0;
  for (const row of document.querySelectorAll<HTMLElement>("[data-row]")) {
    total++;
    const match = !activeFilter || (row.textContent ?? "").toLowerCase().includes(activeFilter);
    row.hidden = !match;
    if (match) shown++;
  }
  statusPath.textContent = activeFilter ? `${data.cwd} · /${activeFilter} · ${shown}/${total}` : basePath;
  if (!selected || selected.hidden) select(hasDetailPanels ? visibleRows()[0] : undefined, { scroll: false });
}

// ---------------------------------------------------------------- prompt

type PromptKind = "command" | "filter";
let promptKind: PromptKind | undefined;
const history: string[] = JSON.parse(session.get("scope-history") ?? "[]");
let historyIndex = history.length;

function setMode(label: string) {
  mode.textContent = label;
}

function openPrompt(kind: PromptKind, initial = "") {
  promptKind = kind;
  prompt.hidden = false;
  statusPath.hidden = true;
  promptSigil.textContent = kind === "command" ? ":" : "/";
  promptInput.setAttribute("aria-label", kind === "command" ? "Command" : "Filter this window");
  promptInput.value = initial;
  historyIndex = history.length;
  setMode(kind === "command" ? "COMMAND" : "FILTER");
  promptInput.focus();
  updateSuggestions();
}

function closePrompt({ clearFilter = false } = {}) {
  if (promptKind === "filter" && clearFilter) applyFilter("");
  promptKind = undefined;
  prompt.hidden = true;
  statusPath.hidden = false;
  suggestions.hidden = true;
  setMode("NORMAL");
  promptInput.blur();
}

function commandNames() {
  return commandHelp.map((c) => c.name);
}

function argumentOptions(command: string) {
  if (command === "cd") return data.routes.map((r) => r.name);
  if (command === "theme") return [...accents];
  if (command === "sound") return ["on", "off"];
  if (command === "mail") return ["--copy"];
  return [];
}

function completions(value: string) {
  const parts = value.trimStart().split(/\s+/);
  if (parts.length <= 1) return commandNames().filter((name) => name.startsWith(parts[0].toLowerCase()));
  const partial = parts[parts.length - 1].toLowerCase();
  return argumentOptions(parts[0].toLowerCase())
    .filter((option) => option.startsWith(partial))
    .map((option) => [...parts.slice(0, -1), option].join(" "));
}

function updateSuggestions() {
  if (promptKind !== "command") {
    suggestions.hidden = true;
    return;
  }
  const items = completions(promptInput.value).slice(0, 7);
  suggestions.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.suggestion = item;
      button.className = "flex w-full gap-3 px-3 py-1 text-left hover:bg-muted";
      const name = document.createElement("span");
      name.className = "text-foreground";
      name.textContent = item;
      const summary = document.createElement("span");
      summary.className = "truncate text-muted-foreground";
      summary.textContent = commandHelp.find((c) => c.name === item)?.summary ?? "";
      button.append(name, summary);
      li.append(button);
      return li;
    }),
  );
  suggestions.hidden = items.length === 0;
}

// Keep focus in the input while a suggestion is being clicked.
suggestions.addEventListener("pointerdown", (event) => event.preventDefault());
suggestions.addEventListener("click", (event) => {
  const value = (event.target as Element).closest<HTMLElement>("[data-suggestion]")?.dataset.suggestion;
  if (!value) return;
  const needsArgument = argumentOptions(value).length > 0 && !value.includes(" ");
  if (needsArgument) {
    promptInput.value = `${value} `;
    updateSuggestions();
    promptInput.focus();
  } else {
    closePrompt();
    run(value);
  }
});

function complete() {
  const items = completions(promptInput.value);
  if (items.length === 0) return;
  if (items.length === 1) {
    const [only] = items;
    promptInput.value = argumentOptions(only).length > 0 && !only.includes(" ") ? `${only} ` : only;
  } else {
    // Extend to the longest prefix every option shares.
    let prefix = items[0];
    for (const item of items) while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (prefix.length > promptInput.value.length) promptInput.value = prefix;
  }
  updateSuggestions();
}

promptInput.addEventListener("input", () => {
  if (promptKind === "filter") applyFilter(promptInput.value);
  updateSuggestions();
});

promptInput.addEventListener("keydown", (event) => {
  bump(0.18);
  playClick();
  if (event.key === "Escape") {
    event.preventDefault();
    closePrompt({ clearFilter: true });
  } else if (event.key === "Tab" && promptKind === "command") {
    event.preventDefault();
    complete();
  } else if (promptKind === "command" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
    promptInput.value = history[historyIndex] ?? "";
    updateSuggestions();
  }
});

prompt.addEventListener("submit", (event) => {
  event.preventDefault();
  const kind = promptKind;
  const value = promptInput.value;
  closePrompt();
  if (kind === "command") run(value);
});

promptInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (promptKind && document.activeElement !== promptInput) closePrompt();
  }, 120);
});

required<HTMLButtonElement>("[data-prompt-open]").addEventListener("click", () => openPrompt("command"));

// ---------------------------------------------------------------- commands

function navigate(target: string) {
  const key = target.replace(/^~\/?/, "").replace(/\/$/, "").toLowerCase() || "home";
  const route = data.routes.find((r) => r.name === key || r.aliases.includes(key));
  if (!route) {
    print(`cd: no such route: ${target}`, "packet dropped.");
    playBlip(220);
    return;
  }
  playBlip();
  window.location.href = route.href;
}

function exitScope() {
  for (const link of document.querySelectorAll<HTMLElement>("[data-ab-switch]")) link.dataset.state = "a";
  crossTo(data.exit);
}

function setAccent(name: string) {
  root.dataset.accent = name;
  try {
    localStorage.setItem("scope-accent", name);
  } catch {
    // Accent lasts for this page only.
  }
}

async function mail(flag?: string) {
  if (flag === "--copy") {
    try {
      await navigator.clipboard.writeText(data.email);
      print(`copied ${data.email}`);
    } catch {
      print(`couldn't copy. the address is ${data.email}`);
    }
    return;
  }
  print(`opening mail to ${data.email}…`, "(mail --copy copies the address instead)");
  window.location.href = `mailto:${data.email}`;
}

const commands: Record<string, (args: string[]) => void> = {
  help: () => openHelp(),
  ls: () => print(data.routes.map((r) => `${r.name}/`).join("   ")),
  cd: ([target = "~"]) => navigate(target),
  open: ([n]) => {
    const row = n ? visibleRows()[Number(n) - 1] : selected;
    if (!row) print(n ? `open: no row ${n}` : "open: nothing selected (j/k to select)");
    else if (!openRow(row)) print("open: that row has no link");
  },
  whoami: () => print(...data.whoami),
  mail: ([flag]) => void mail(flag),
  theme: ([name]) => {
    if (!name || !(accents as readonly string[]).includes(name)) {
      print(`theme: ${accents.join(" | ")}`);
      return;
    }
    setAccent(name);
    print(`accent → ${name}`);
  },
  sound: ([state]) => {
    const on = state ? state === "on" : !soundEnabled();
    setSound(on);
    syncSoundToggle();
    print(`sound ${on ? "on" : "off"}`);
    if (on) playBoot();
  },
  history: () =>
    print(...(history.length ? history.map((entry, i) => `${String(i + 1).padStart(3)}  ${entry}`) : ["(empty)"])),
  clear: () => hideOutput(),
  exit: () => exitScope(),
  // Not listed in help.
  sudo: () => print("nice try. this incident will be reported."),
  date: () => print(new Date().toString()),
  echo: (args) => print(args.join(" ")),
};

const commandAliases: Record<string, string> = { quit: "exit", q: "exit", man: "help", "?": "help" };

function run(input: string) {
  const text = input.trim();
  if (!text) return;
  history.push(text);
  session.set("scope-history", JSON.stringify(history.slice(-50)));
  echo(text);
  const [rawName, ...args] = text.split(/\s+/);
  const name = commandAliases[rawName.toLowerCase()] ?? rawName.toLowerCase();
  const command = commands[name];
  if (!command) {
    print(`command not found: ${rawName}. type help`);
    playBlip(220);
    return;
  }
  if (name !== "cd" && name !== "exit") playBlip();
  command(args);
}

for (const button of document.querySelectorAll<HTMLElement>("[data-run]")) {
  button.addEventListener("click", () => run(button.dataset.run ?? ""));
}

// ---------------------------------------------------------------- help

let focusBeforeHelp: HTMLElement | null = null;

function openHelp() {
  focusBeforeHelp = document.activeElement as HTMLElement | null;
  help.hidden = false;
  help.querySelector<HTMLElement>("[data-help-close]")?.focus();
}

function closeHelp() {
  help.hidden = true;
  focusBeforeHelp?.focus?.();
}

for (const button of document.querySelectorAll("[data-help-open]")) button.addEventListener("click", openHelp);
required<HTMLButtonElement>("[data-help-close]").addEventListener("click", closeHelp);
help.addEventListener("click", (event) => {
  if (event.target === help) closeHelp();
});

// ---------------------------------------------------------------- keyboard

const chords: Record<string, string> = { h: "home", p: "projects", w: "writing", r: "reading" };
let awaitingChord = false;
let lastEscape = 0;

function handleEscape() {
  if (!output.hidden) return hideOutput();
  if (activeFilter) return applyFilter("");
  const now = Date.now();
  if (now - lastEscape < 900) return exitScope();
  lastEscape = now;
  showToast("press esc again to go back", 900);
}

document.addEventListener("keydown", (event) => {
  bump(0.22);
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target instanceof Element ? event.target : document.body;
  if (target === promptInput || target.closest("input, textarea, select, [contenteditable='true']")) return;

  if (bootActive) {
    event.preventDefault();
    finishBoot();
    return;
  }
  if (!help.hidden) {
    if (event.key === "Escape" || event.key === "?") {
      event.preventDefault();
      closeHelp();
    }
    return;
  }
  if (awaitingChord) {
    awaitingChord = false;
    const route = chords[event.key];
    if (route) {
      event.preventDefault();
      navigate(route);
    }
    return;
  }
  // Enter on a focused link or button keeps its native behavior.
  if (event.key === "Enter" && target.closest("a, button")) return;

  let handled = true;
  switch (event.key) {
    case "j":
      move(1);
      break;
    case "k":
      move(-1);
      break;
    case "Enter":
    case "o":
      handled = openRow();
      break;
    case "/":
      openPrompt("filter", activeFilter);
      break;
    case ":":
      openPrompt("command");
      break;
    case "?":
      openHelp();
      break;
    case "g":
      awaitingChord = true;
      window.setTimeout(() => (awaitingChord = false), 900);
      break;
    case "Escape":
      handleEscape();
      break;
    default:
      if (/^[1-4]$/.test(event.key)) navigate(data.routes[Number(event.key) - 1].name);
      else handled = false;
  }
  if (handled) {
    event.preventDefault();
    playClick();
  }
});

// ---------------------------------------------------------------- meters

const channels = [...document.querySelectorAll<HTMLElement>("[data-meter-channel]")];
let energy = 0;

function bump(amount: number) {
  energy = Math.min(1, energy + amount);
}

if (channels.length > 0 && !reducedMotion) {
  root.dataset.metersLive = "";
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    energy *= Math.pow(0.12, dt);
    const t = now / 1000;
    channels.forEach((channel, i) => {
      const idle = 0.34 + 0.09 * Math.sin(t * 1.9 + i * 1.7) + 0.05 * Math.sin(t * 5.3 + i * 0.6);
      const jitter = (Math.random() - 0.5) * 0.08 * (0.3 + energy);
      const level = Math.max(0.05, Math.min(0.98, idle + energy * 0.6 + jitter));
      channel.style.setProperty("--level", `${(level * 100).toFixed(1)}%`);
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.addEventListener("scroll", () => bump(0.03), { passive: true });
  window.addEventListener("pointerdown", () => bump(0.15), { passive: true });
}

// ---------------------------------------------------------------- sound toggle

const soundToggle = required<HTMLButtonElement>("[data-sound-toggle]");

function syncSoundToggle() {
  const on = soundEnabled();
  soundToggle.setAttribute("aria-pressed", String(on));
  const label = soundToggle.querySelector("[data-sound-label]");
  if (label) label.textContent = on ? "on" : "off";
  soundToggle.classList.toggle("text-primary", on);
}

soundToggle.addEventListener("click", () => {
  const on = !soundEnabled();
  setSound(on);
  syncSoundToggle();
  if (on) playBoot();
});
syncSoundToggle();

// ---------------------------------------------------------------- clock

const clock = document.querySelector("[data-clock]");
const tickClock = () => {
  if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
tickClock();
window.setInterval(tickClock, 15_000);

// ---------------------------------------------------------------- copy buttons

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  button.addEventListener("click", async () => {
    const label = button.querySelector("[data-copy-label]") ?? button;
    const original = label.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? "");
      label.textContent = "copied";
    } catch {
      label.textContent = "copy failed";
    }
    window.setTimeout(() => (label.textContent = original), 1500);
  });
}

bindABSwitch();

// ---------------------------------------------------------------- boot

const boot = document.getElementById("scope-boot");
let bootActive = false;
let bootTimers: number[] = [];

function finishBoot() {
  if (!boot || !bootActive) return;
  bootActive = false;
  bootTimers.forEach((timer) => window.clearTimeout(timer));
  bootTimers = [];
  boot.style.opacity = "0";
  window.setTimeout(() => (boot.hidden = true), 300);
  hintOnce();
}

function hintOnce() {
  if (session.get("scope-hinted")) return;
  session.set("scope-hinted", "1");
  window.setTimeout(() => showToast("? for help · : for commands", 2600), 400);
}

async function startBoot() {
  if (!boot) return;
  const lines = boot.querySelector<HTMLElement>("[data-boot-lines]");
  const canvas = boot.querySelector<HTMLCanvasElement>("[data-boot-static]");
  if (!lines || !canvas) return;
  bootActive = true;
  boot.hidden = false;
  boot.addEventListener("click", finishBoot, { once: true });

  // Pick up where Signal's static left off, then let it clear.
  await paintStatic(canvas, 280);
  if (!bootActive) return;
  canvas.style.transition = "opacity 200ms";
  canvas.style.opacity = "0";

  data.boot.forEach((text, i) => {
    bootTimers.push(
      window.setTimeout(() => {
        lines.append(line(text || " ", text.startsWith("[ ok ]") ? "text-muted-foreground" : undefined));
        bump(0.3);
      }, 120 + i * 95),
    );
  });
  bootTimers.push(window.setTimeout(finishBoot, 120 + data.boot.length * 95 + 650));
}

if (!reducedMotion && !session.get("scope-booted")) {
  session.set("scope-booted", "1");
  void startBoot();
} else {
  hintOnce();
}
