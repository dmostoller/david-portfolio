// The site's pages, shared by both designs. Signal (the main design) lives at
// the root; Scope, the alternate design behind the footer's A/B switch,
// mirrors every page under /scope.

export const pages = [
  {
    id: "home",
    label: "Home",
    path: "",
    title: "David Mostoller — Senior Software Engineer",
    description:
      "Senior software engineer building security tools, threat intelligence platforms, and automated defenses for network security at Comcast.",
  },
  {
    id: "projects",
    label: "Projects",
    path: "/projects",
    title: "Projects — David Mostoller",
    description: "A selection of things I've built.",
  },
  {
    id: "blog",
    label: "Writing",
    path: "/blog",
    title: "Writing — David Mostoller",
    description: "Published work and thoughts on software, design, and building things.",
  },
  {
    id: "reading",
    label: "Reading",
    path: "/reading",
    title: "Reading — David Mostoller",
    description: "Current reads and bookmarked articles.",
  },
] as const;

export type Page = (typeof pages)[number]["id"];

export const pageMeta = (page: Page) => pages.find((p) => p.id === page) ?? pages[0];

export const signalHref = (page: Page) => pageMeta(page).path || "/";
export const scopeHref = (page: Page) => `/scope${pageMeta(page).path}`;
