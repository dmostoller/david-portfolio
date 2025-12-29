export interface Book {
  title: string;
  author: string;
  status: "reading" | "completed" | "want-to-read";
  rating?: number;
  link?: string;
  notes?: string;
  dateFinished?: string;
}

export interface SavedArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
}
