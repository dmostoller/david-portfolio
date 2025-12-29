import { motion } from "framer-motion";
import Github from "lucide-react/dist/esm/icons/github";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

interface Props {
  title: string;
  description: string;
  tech: string[];
  github?: string;
  live?: string;
  index: number;
}

export default function ProjectCard({
  title,
  description,
  tech,
  github,
  live,
  index,
}: Props) {
  return (
    <motion.div
      className="group p-4 -mx-4 rounded-lg hover:bg-muted/50 transition-colors"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.05,
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tech.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              aria-label="View source code"
            >
              <Github size={16} />
            </a>
          )}
          {live && (
            <a
              href={live}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
              aria-label="View live site"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
