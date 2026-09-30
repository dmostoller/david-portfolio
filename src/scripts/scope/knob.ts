// The aux send knob: drag it, scroll it, or use the arrow keys, and
// double-click to reset. It scales the meters, and it goes to eleven.
import { pin, setGain } from "./meters";
import { playClick, playFeedback } from "./sound";
import { showToast } from "./toast";

const knob = document.querySelector<HTMLElement>("[data-knob]");

if (knob) {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const readout = document.querySelector("[data-knob-readout]");
  const ticks = [...knob.querySelectorAll<SVGElement>("[data-tick]")];
  const max = Number(knob.getAttribute("aria-valuemax"));
  const initial = Number(knob.getAttribute("aria-valuenow"));
  let value = initial;

  function set(next: number) {
    next = Math.max(0, Math.min(max, Math.round(next)));
    if (next === value) return;
    const wasEleven = value === max;
    value = next;

    knob!.setAttribute("aria-valuenow", String(value));
    knob!.style.setProperty("--value", String(value));
    knob!.toggleAttribute("data-eleven", value === max);
    if (readout) readout.textContent = String(value);
    for (const tick of ticks)
      tick.toggleAttribute(
        "data-on",
        Number(tick.dataset.tick) <= Math.min(value, max - 1),
      );

    playClick();
    // The initial position is unity gain.
    setGain(value / initial);
    if (value === max) goesToEleven();
    else if (wasEleven) pin(false);
  }

  function goesToEleven() {
    pin(true);
    playFeedback();
    showToast("these go to eleven.", 2400);
    if (reducedMotion) return;
    document.getElementById("main")?.animate(
      {
        translate: [
          "0 0",
          "-4px 1px",
          "4px -1px",
          "-3px 0",
          "3px 1px",
          "-1px 0",
          "0 0",
        ],
      },
      { duration: 450, easing: "ease-out" },
    );
  }

  let drag: { x: number; y: number; value: number } | undefined;
  knob.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    knob.focus();
    knob.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, value };
  });
  knob.addEventListener("pointermove", (event) => {
    if (!drag) return;
    // Up or right turns it up, one notch per 12px.
    set(drag.value + (drag.y - event.clientY + event.clientX - drag.x) / 12);
  });
  const endDrag = () => (drag = undefined);
  knob.addEventListener("pointerup", endDrag);
  knob.addEventListener("pointercancel", endDrag);

  // Trackpads send lots of small deltas and mouse wheels a few big ones; either way, one notch per 40.
  let wheel = 0;
  knob.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      wheel += event.deltaY;
      if (Math.abs(wheel) < 40) return;
      set(value - Math.sign(wheel));
      wheel = 0;
    },
    { passive: false },
  );

  const steps: Record<string, number> = {
    ArrowUp: 1,
    ArrowRight: 1,
    ArrowDown: -1,
    ArrowLeft: -1,
    PageUp: 2,
    PageDown: -2,
  };
  knob.addEventListener("keydown", (event) => {
    if (event.key in steps) set(value + steps[event.key]);
    else if (event.key === "Home") set(0);
    else if (event.key === "End") set(max);
    else return;
    event.preventDefault();
  });

  knob.addEventListener("dblclick", () => set(initial));
}
