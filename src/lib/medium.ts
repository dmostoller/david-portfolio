interface MediumPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
}

interface MediumApiItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
}

export async function getMediumPosts(username: string): Promise<MediumPost[]> {
  const response = await fetch(
    `https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@${username}`,
  );

  const data = await response.json();

  if (data.status !== "ok") {
    return [];
  }

  return data.items.map((item: MediumApiItem) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: item.description.replace(/<[^>]*>/g, "").slice(0, 160) + "...",
    thumbnail: item.thumbnail,
  }));
}
