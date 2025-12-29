import { motion } from "framer-motion";
import type { SavedArticle } from "../../lib/types/reading";

interface Props extends SavedArticle {
  index: number;
}

export default function ArticlePreview({
  title,
  link,
  pubDate,
  source,
  description,
  index,
}: Props) {
  const date = new Date(pubDate);
  const formattedDate = isNaN(date.getTime())
    ? pubDate || "Unknown date"
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <motion.a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.05,
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="space-y-1 flex-1">
          <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
            {source}
          </span>
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <time className="text-sm text-muted-foreground whitespace-nowrap" dateTime={pubDate}>
          {formattedDate}
        </time>
      </div>
    </motion.a>
  );
}
