const easeOut = [0.22, 1, 0.36, 1] as const;

const defaultTransition = {
  duration: 0.2,
  ease: easeOut,
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: defaultTransition },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: defaultTransition },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const slideIn = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: defaultTransition },
  exit: { opacity: 0, x: 8, transition: { duration: 0.15 } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: defaultTransition },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.93 },
  animate: { opacity: 1, scale: 1, transition: defaultTransition },
  exit: { opacity: 0, scale: 0.93, transition: { duration: 0.15 } },
};
