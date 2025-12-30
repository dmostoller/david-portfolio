import { motion, useReducedMotion } from "framer-motion";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Book from "lucide-react/dist/esm/icons/book";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Star from "lucide-react/dist/esm/icons/star";
import type { Book as BookType } from "../../lib/types/reading";

interface Props extends BookType {
  index: number;
}

const statusConfig = {
  reading: {
    icon: BookOpen,
    label: "Currently Reading",
    color: "text-primary",
  },
  completed: { icon: Book, label: "Finished", color: "text-muted-foreground" },
  "want-to-read": {
    icon: Bookmark,
    label: "Want to Read",
    color: "text-muted-foreground",
  },
};

export default function BookCard({
  title,
  author,
  status,
  rating,
  link,
  notes,
  index,
}: Props) {
  const shouldReduceMotion = useReducedMotion();
  const StatusIcon = statusConfig[status].icon;

  return (
    <motion.div
      className="group p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors"
      initial={
        shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
      }
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              delay: index * 0.05,
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon size={14} className={statusConfig[status].color} />
            <span className="text-xs text-muted-foreground">
              {statusConfig[status].label}
            </span>
          </div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{author}</p>
          {rating && (
            <div
              className="flex gap-0.5"
              aria-label={`Rating: ${rating} out of 5 stars`}
              role="img"
            >
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < rating ? "text-primary fill-primary" : "text-muted"
                  }
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
          {notes && (
            <p className="text-sm text-muted-foreground italic pt-1">{notes}</p>
          )}
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
            aria-label="View book details"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </motion.div>
  );
}
