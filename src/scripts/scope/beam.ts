// The radio's screen: a phosphor beam on a canvas. In motion, each frame fades
// the last one instead of clearing it, so the beam leaves a trail like a real
// tube. Between stations it jitters and the screen fills with snow; near the
// internet, scraps of its chatter flash past; at eleven, it shakes.
import { chatter } from "../../lib/scope/stations";

export interface Frame {
  /** The beam's path as x, y pairs in drawing units. */
  path: Float32Array;
  /** 1 where the beam jumps to a new line instead of drawing to it. */
  jumps: Uint8Array;
  count: number;
  /** 0 on a station, 1 in the static between them. */
  noise: number;
  /** How close the dial is to the internet (0–1) and to eleven. */
  internet: number;
  eleven: number;
  random: () => number;
}

const SCREEN = "5 9 8";
const PHOSPHOR = "110 255 190";
const HOT = "255 140 80";

/**
 * Draws frames onto `canvas`. With `still`, every frame starts from a clear
 * screen and there's no snow, chatter, or shake, for reduced motion.
 */
export function createScreen(
  canvas: HTMLCanvasElement,
  { still, onResize }: { still: boolean; onResize?: () => void },
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("radio: no 2d canvas");
  const ctx = context;
  let width = 0;
  let height = 0;
  let scale = 1;
  let last = 0;

  function resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Most pictures stay within ±1.3 across; on narrow screens the widest
    // (the road, the incoming packets, the internet) run off the edges.
    scale = Math.min(width / 2.7, height / 2.1) * 0.92;
    ctx.fillStyle = `rgb(${SCREEN})`;
    ctx.fillRect(0, 0, width, height);
    onResize?.();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function graticule(alpha: number) {
    ctx.strokeStyle = `rgb(120 190 160 / ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      const x = Math.round((width * i) / 10) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let j = 1; j < 8; j++) {
      const y = Math.round((height * j) / 8) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  function draw(frame: Frame, now: number) {
    const { path, jumps, count, noise, internet, eleven, random } = frame;
    // Fade by elapsed time so the trail looks the same at any frame rate.
    const dt = Math.min(1, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = still
      ? `rgb(${SCREEN})`
      : `rgb(${SCREEN} / ${1 - Math.pow(0.7, dt * 60)})`;
    ctx.fillRect(0, 0, width, height);
    graticule(still ? 0.12 : 0.05);

    ctx.save();
    if (!still && eleven > 0.2) {
      const shake = 8 * eleven;
      ctx.translate((random() - 0.5) * shake, (random() - 0.5) * shake);
    }
    ctx.globalCompositeOperation = "lighter";
    const color = eleven > 0.35 ? HOT : PHOSPHOR;
    const jitter = Math.pow(noise, 1.3) * 0.65;
    const cx = width / 2;
    const cy = height / 2;
    let nx = 0;
    let ny = 0;
    ctx.beginPath();
    for (let k = 0; k < count; k++) {
      nx = nx * 0.8 + (random() * 2 - 1) * 0.45;
      ny = ny * 0.8 + (random() * 2 - 1) * 0.45;
      const x = cx + (path[2 * k] + nx * jitter * 1.3) * scale;
      const y = cy - (path[2 * k + 1] + ny * jitter) * scale;
      if (k === 0 || jumps[k]) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgb(${color} / 0.07)`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = `rgb(${color} / ${still ? 0.9 : 0.55})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    if (!still) {
      const snow = ((noise * 0.9 + internet * 0.6) * width * height) / 3000;
      ctx.fillStyle = `rgb(${color} / 0.35)`;
      for (let i = 0; i < snow; i++)
        ctx.fillRect(random() * width, random() * height, 1.5, 1.5);

      if (internet > 0.08 && random() < internet * 0.6) {
        ctx.font = '12px "Fira Code", ui-monospace, monospace';
        ctx.fillStyle = `rgb(${color} / ${0.85 * internet})`;
        ctx.fillText(
          chatter[Math.floor(random() * chatter.length)],
          12 + random() * Math.max(12, width - 200),
          20 + random() * Math.max(0, height - 32),
        );
      }
    }
    ctx.restore();
  }

  return { draw };
}
