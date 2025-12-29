import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  items: NavItem[];
}

export default function Navigation({ items }: Props) {
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {items.map((item, index) => {
        const isActive = currentPath === item.href;

        return (
          <motion.a
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-3 py-2 text-sm transition-colors rounded-md",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.05,
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            {item.label}
            {isActive && (
              <motion.span
                className="absolute inset-x-3 -bottom-px h-px bg-primary"
                layoutId="navbar-indicator"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
          </motion.a>
        );
      })}
    </nav>
  );
}
