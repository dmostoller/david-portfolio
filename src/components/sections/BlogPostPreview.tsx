import { motion } from "framer-motion";

interface Props {
  title: string;
  href: string;
  date: string;
  description: string;
  index: number;
}

export default function BlogPostPreview({
  title,
  href,
  date,
  description,
  index,
}: Props) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.a
      href={href}
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
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
        <time className="text-sm text-muted-foreground whitespace-nowrap">
          {formattedDate}
        </time>
      </div>
    </motion.a>
  );
}
