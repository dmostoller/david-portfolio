// The crossing between Signal and Scope: a burst of static, then the
// navigation. Used by Signal's A/B switch and by the radio when it leaves.
import { playStatic } from "./scope/sound";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Paints animated static into a canvas for `duration` ms. */
export function paintStatic(canvas: HTMLCanvasElement, duration: number) {
  // Low resolution scaled up keeps this cheap on any screen.
  const scale = 4;
  canvas.width = Math.ceil(window.innerWidth / scale);
  canvas.height = Math.ceil(window.innerHeight / scale);
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve();
  const image = context.createImageData(canvas.width, canvas.height);
  const start = performance.now();

  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      done = true;
      resolve();
    };
    const frame = (now: number) => {
      if (done) return;
      const pixels = image.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const v = Math.random() * 190;
        pixels[i] = v * 0.82;
        pixels[i + 1] = v;
        pixels[i + 2] = v * 0.95;
        pixels[i + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      if (now - start < duration) requestAnimationFrame(frame);
      else finish();
    };
    requestAnimationFrame(frame);
    // Animation frames pause in background tabs; the timer makes sure this always ends.
    window.setTimeout(finish, duration + 50);
  });
}

export function crossTo(url: string, duration = 450) {
  if (reducedMotion()) {
    window.location.href = url;
    return;
  }
  playStatic(duration / 1000);
  const canvas = document.createElement("canvas");
  canvas.dataset.crossing = "";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "9999",
    pointerEvents: "none",
    imageRendering: "pixelated",
    opacity: "0",
    transition: `opacity ${Math.round(duration * 0.4)}ms ease-out`,
  });
  document.body.append(canvas);
  requestAnimationFrame(() => (canvas.style.opacity = "1"));
  void paintStatic(canvas, duration);
  window.setTimeout(() => {
    window.location.href = url;
  }, duration);
}

/** Wires Signal's A/B switch to flip and cross over to the radio. */
export function bindABSwitch() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    "[data-ab-switch]",
  )) {
    link.dataset.origin = link.dataset.state;
    link.addEventListener("click", (event) => {
      // Let modified clicks open a new tab the normal way.
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      link.dataset.state = link.dataset.state === "a" ? "b" : "a";
      // The radio is one page, so it remembers where to send visitors back to.
      try {
        sessionStorage.setItem("dbm-return", window.location.pathname);
      } catch {
        // Without storage, leaving the radio goes to the home page.
      }
      crossTo(link.href);
    });
  }
}

// Coming back through the back/forward cache would otherwise restore the page
// mid-crossing, with the static still covering it.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  document
    .querySelectorAll("canvas[data-crossing]")
    .forEach((canvas) => canvas.remove());
  for (const link of document.querySelectorAll<HTMLElement>(
    "[data-ab-switch]",
  )) {
    if (link.dataset.origin) link.dataset.state = link.dataset.origin;
  }
});
