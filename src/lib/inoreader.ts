import { XMLParser } from "fast-xml-parser";
import type { SavedArticle } from "./types/reading";

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  author?: string;
  description?: string;
}

export async function getInoreaderSavedArticles(
  rssUrl: string,
): Promise<SavedArticle[]> {
  const response = await fetch(rssUrl);
  if (!response.ok) return [];

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  });
  const data = parser.parse(xml);

  const items: RssItem[] = data?.rss?.channel?.item || [];

  return items.map((item) => {
    const plainDescription =
      typeof item.description === "string"
        ? item.description.replace(/<[^>]*>/g, "")
        : undefined;
    const description =
      plainDescription && plainDescription.length > 200
        ? plainDescription.slice(0, 200) + "..."
        : plainDescription;
    return {
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: extractSource(item),
      description,
    };
  });
}

function extractSource(item: RssItem): string {
  if (item.author) return item.author;

  try {
    const url = new URL(item.link);
    return url.hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}
