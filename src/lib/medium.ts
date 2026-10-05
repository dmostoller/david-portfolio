import { FEED_TIMEOUT } from "./content";
import { decodeEntities, toText, truncate } from "./format";

export interface MediumPost {
  title: string;
  href: string;
  date: string;
  excerpt: string;
}

interface MediumApiItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

async function fetchMediumPosts(username: string): Promise<MediumPost[]> {
  try {
    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@${username}`,
      { signal: AbortSignal.timeout(FEED_TIMEOUT) },
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== "ok") return [];

    return data.items.map((item: MediumApiItem) => {
      // Medium puts a figure (sometimes with a caption) before the first paragraph.
      const firstParagraph =
        /<p>([\s\S]*?)<\/p>/.exec(item.description ?? "")?.[1] ?? "";
      return {
        title: decodeEntities(item.title),
        href: item.link.split("?")[0],
        date: item.pubDate,
        excerpt: truncate(toText(firstParagraph), 170),
      };
    });
  } catch {
    return [];
  }
}

export const getMediumPosts = () => fetchMediumPosts("dmostoller");
