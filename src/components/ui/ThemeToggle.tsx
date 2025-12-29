import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import Sun from "lucide-react/dist/esm/icons/sun";
import Moon from "lucide-react/dist/esm/icons/moon";

function getThemeFromDOM(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTheme(getThemeFromDOM());
    setMounted(true);

    const syncTheme = () => setTheme(getThemeFromDOM());
    document.addEventListener("astro:after-swap", syncTheme);
    document.addEventListener("astro:page-load", syncTheme);
    return () => {
      document.removeEventListener("astro:after-swap", syncTheme);
      document.removeEventListener("astro:page-load", syncTheme);
    };
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";

    const supportsViewTransition =
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!supportsViewTransition || !buttonRef.current) {
      setTheme(newTheme);
      localStorage.setItem("theme", newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      return;
    }

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    // Mark as theme transition so CSS can scope view-transition-name
    document.documentElement.dataset.themeTransition = "";

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      });
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: "ease-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );

    // Clean up after transition completes
    await transition.finished;
    delete document.documentElement.dataset.themeTransition;
  };

  if (!mounted) {
    return (
      <button className="p-2 rounded-md text-muted-foreground" aria-label="Toggle theme">
        <Moon size={18} />
      </button>
    );
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={toggleTheme}
      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </motion.div>
    </motion.button>
  );
}
