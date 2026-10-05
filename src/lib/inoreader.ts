import { XMLParser } from "fast-xml-parser";
import { FEED_TIMEOUT } from "./content";
import { decodeEntities, hostname } from "./format";
import type { SavedArticle } from "./types/reading";

interface RssItem {
  title: string | number;
  link: string;
  pubDate: string;
}

async function fetchSavedArticles(rssUrl: string): Promise<SavedArticle[]> {
  try {
    const response = await fetch(rssUrl, {
      signal: AbortSignal.timeout(FEED_TIMEOUT),
    });
    if (!response.ok) return [];

    const parser = new XMLParser({
      ignoreAttributes: false,
      // A feed with a single item would otherwise parse as an object, not a list.
      isArray: (name) => name === "item",
    });
    const data = parser.parse(await response.text());
    const items: RssItem[] = data?.rss?.channel?.item ?? [];

    return items.map((item) => ({
      title: decodeEntities(String(item.title)),
      link: item.link,
      pubDate: item.pubDate,
      source: hostname(item.link) ?? "",
    }));
  } catch {
    return [];
  }
}

export async function getSavedArticles() {
  const rssUrl = import.meta.env.INOREADER_RSS_URL;
  if (!rssUrl) return [];
  return (await fetchSavedArticles(rssUrl)).slice(0, 10);
}
