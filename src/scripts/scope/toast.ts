// The console's one-line toast, shared by the console and its toys.
let timer: number | undefined;

export function showToast(message: string, ms = 1800) {
  const toast = document.querySelector<HTMLElement>("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => (toast.hidden = true), ms);
}
