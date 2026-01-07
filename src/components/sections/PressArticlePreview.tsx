import { motion, useReducedMotion } from "framer-motion";

interface Props {
  title: string;
  publication: string;
  url: string;
  date: string;
  description: string;
  index: number;
}

export default function PressArticlePreview({
  title,
  publication,
  url,
  date,
  description,
  index,
}: Props) {
  const shouldReduceMotion = useReducedMotion();
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors"
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div className="space-y-1 flex-1">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-0.5 whitespace-nowrap">
          <span className="text-sm font-medium text-foreground">
            {publication}
          </span>
          <time dateTime={date} className="text-sm text-muted-foreground">
            {formattedDate}
          </time>
        </div>
      </div>
    </motion.a>
  );
}
