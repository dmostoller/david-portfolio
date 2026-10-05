// Typed access to the JSON content files, and settings for the live feeds.
import projectsJson from "../content/projects.json";
import pressJson from "../content/press.json";
import booksJson from "../content/books.json";
import type { Book } from "./types/reading";

export interface Project {
  title: string;
  description: string;
  tech: string[];
  github?: string;
  live?: string;
}

const projects = projectsJson as Project[];

/** The first six in projects.json are featured; reorder the file to change them. */
export const selectedProjects = projects.slice(0, 6);
export const archivedProjects = projects.slice(6);
export const projectLink = (p: Project) => p.live ?? p.github;

export const press = pressJson;

export function getBooks() {
  const books = booksJson as Book[];
  return [
    { label: "Reading", books: books.filter((b) => b.status === "reading") },
    {
      label: "Finished",
      books: books.filter((b) => b.status === "completed").slice(0, 5),
    },
    {
      label: "Up next",
      books: books.filter((b) => b.status === "want-to-read").slice(0, 3),
    },
  ].filter((group) => group.books.length > 0);
}

/** How long a feed gets before it counts as failed, in ms, so a hung feed can't hang its page. */
export const FEED_TIMEOUT = 4000;

/**
 * Cache-Control for pages that render live feeds: Vercel's CDN serves them for
 * an hour and refreshes in the background, but a failed feed is retried soon.
 */
export const feedCacheControl = (ok: boolean) =>
  ok
    ? "public, s-maxage=3600, stale-while-revalidate=86400"
    : "public, s-maxage=60";
