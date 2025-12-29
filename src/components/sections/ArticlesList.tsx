import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ArticlePreview from "./ArticlePreview";
import type { SavedArticle } from "../../lib/types/reading";

export default function ArticlesList() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/articles.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="p-4 -mx-4 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-muted-foreground py-8">
        Unable to load articles right now.
      </p>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="text-muted-foreground py-8">
        No saved articles yet. Check back soon!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {articles.slice(0, 10).map((article, index) => (
        <ArticlePreview key={article.link} {...article} index={index} />
      ))}
    </div>
  );
}
