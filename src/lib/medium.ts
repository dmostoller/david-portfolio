interface MediumPost {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  thumbnail?: string;
}

interface MediumApiItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  thumbnail?: string;
}

export async function getMediumPosts(username: string): Promise<MediumPost[]> {
  try {
    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@${username}`,
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (data.status !== "ok") {
      return [];
    }

    return data.items.map((item: MediumApiItem) => {
      const plainDescription =
        typeof item.description === "string"
          ? item.description.replace(/<[^>]*>/g, "")
          : undefined;
      const description =
        plainDescription && plainDescription.length > 160
          ? plainDescription.slice(0, 160) + "..."
          : plainDescription;
      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description,
        thumbnail: item.thumbnail,
      };
    });
  } catch {
    return [];
  }
}
