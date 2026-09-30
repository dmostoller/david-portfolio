// Scope's command and key reference, shared by the help overlay and the
// command line's suggestions.

export const commandHelp = [
  { name: "help", summary: "keys and commands" },
  { name: "ls", summary: "list windows" },
  { name: "cd", summary: "switch window: cd projects" },
  { name: "open", summary: "open the selected row, or row n" },
  { name: "whoami", summary: "who runs this console" },
  { name: "attack", summary: "try to take me down" },
  { name: "mail", summary: "write to me · mail --copy" },
  { name: "theme", summary: "accent: teal | amber | green | mono" },
  { name: "sound", summary: "ui sounds: on | off" },
  { name: "history", summary: "commands you've run" },
  { name: "clear", summary: "clear the output" },
  { name: "exit", summary: "back to the main site" },
];

export const keyHelp = [
  { keys: "j / k", summary: "move the selection" },
  { keys: "↵ or o", summary: "open the selected row" },
  { keys: "/", summary: "filter this window" },
  { keys: ":", summary: "command line" },
  { keys: "1–4 · g h/p/w/r", summary: "switch window" },
  { keys: "?", summary: "this help" },
  { keys: "esc", summary: "close · twice to go back" },
];

export const accents = ["teal", "amber", "green", "mono"] as const;
