import type { IconName } from "../components/ui/icons";

export const email = "dmostoller@gmail.com";

export const socials: { label: string; href: string; icon: IconName }[] = [
  { label: "GitHub", href: "https://github.com/dmostoller", icon: "github" },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/david-mostoller",
    icon: "linkedin",
  },
  { label: "Medium", href: "https://medium.com/@dmostoller", icon: "book-open" },
  {
    label: "Bluesky",
    href: "https://bsky.app/profile/davemostoller.bsky.social",
    icon: "at-sign",
  },
];

// Bodies are the sanitized Current Role bullets, verbatim. Only the titles are new.
export const focus = [
  {
    title: "Internal tools",
    body: "Build internal tools and platforms that help network and security engineers find, understand, and stop threats at enterprise scale.",
  },
  {
    title: "Threat intelligence & automation",
    body: "Develop threat intelligence and automation systems, including AI-assisted analysis, that turn raw network data into clear, actionable insight.",
  },
  {
    title: "Built with operators",
    body: "Work closely with security engineers to turn their operational needs into reliable, maintainable software.",
  },
];

export interface PathStep {
  id: string;
  stage: string;
  title: string;
  detail?: string;
  when?: string;
  current?: boolean;
}

// Chronological. Titles say what, details say where.
export const path: PathStep[] = [
  { id: "wesleyan", stage: "study", title: "B.A. Government", detail: "Wesleyan University" },
  { id: "developer", stage: "dev", title: "Software Developer", detail: "Entourage Yearbooks, Princeton" },
  { id: "data", stage: "data", title: "Business Analyst", detail: "Zoomer, Philadelphia" },
  { id: "flatiron", stage: "code", title: "Software Engineering", detail: "Flatiron School, NYC" },
  { id: "agency", stage: "agency", title: "Software Engineer", detail: "SPRY Group, Brooklyn" },
  {
    id: "comcast",
    stage: "security",
    title: "Senior Software Engineer, Network Security",
    detail: "Comcast, Philadelphia",
    when: "2025 – now",
    current: true,
  },
];

// Runs alongside the steps listed in `alongside`.
export const parallelTrack = {
  stage: "aux",
  title: "Audio engineering",
  detail: "Music technology",
  alongside: ["wesleyan", "developer", "data", "flatiron", "agency"],
};

export const stack = [
  {
    label: "Security",
    items: [
      "DDoS Mitigation",
      "Threat Intelligence",
      "Network Traffic Analysis",
      "Security Automation",
      "LLM Agents",
    ],
  },
  { label: "Languages", items: ["Python", "TypeScript", "JavaScript"] },
  {
    label: "Frontend",
    items: ["React", "TanStack", "Next.js", "Astro", "Tailwind CSS", "shadcn/ui"],
  },
  {
    label: "Backend",
    items: ["FastAPI", "Flask", "Node.js", "GraphQL", "REST APIs"],
  },
  { label: "Data", items: ["PostgreSQL", "MySQL", "SQLite", "Prisma"] },
  { label: "Infra", items: ["AWS", "Docker", "Linux", "CI/CD", "Git"] },
];
