import { motion } from "framer-motion";
import Github from "lucide-react/dist/esm/icons/github";
import Linkedin from "lucide-react/dist/esm/icons/linkedin";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import Mail from "lucide-react/dist/esm/icons/mail";

const links = [
  { label: "GitHub", href: "https://github.com/dmostoller", icon: Github },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/david-mostoller",
    icon: Linkedin,
  },
  { label: "Medium", href: "https://medium.com/@dmostoller", icon: BookOpen },
  {
    label: "Bluesky",
    href: "https://bsky.app/profile/davemostoller.bsky.social",
    icon: AtSign,
  },
  {
    label: "Get in touch",
    href: "mailto:dmostoller@gmail.com",
    icon: Mail,
  },
];

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export default function SocialLinks() {
  return (
    <motion.section
      className="pt-8 border-t border-border"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Connect
      </h2>
      <ul className="space-y-1">
        {links.map((link) => (
          <motion.li key={link.label} variants={item}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <link.icon
                size={18}
                className="text-muted-foreground group-hover:text-primary transition-colors"
              />
              <span className="flex-1">{link.label}</span>
              <span className="text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all">
                &rarr;
              </span>
            </a>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
