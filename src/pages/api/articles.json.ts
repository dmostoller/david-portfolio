import type { APIRoute } from "astro";
import { getInoreaderSavedArticles } from "../../lib/inoreader";

export const GET: APIRoute = async () => {
  const rssUrl = import.meta.env.INOREADER_RSS_URL || "";

  if (!rssUrl) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const articles = await getInoreaderSavedArticles(rssUrl);

  return new Response(JSON.stringify(articles), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
};
