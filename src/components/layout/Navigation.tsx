import { cn } from "../../lib/utils";

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  items: NavItem[];
  currentPath: string;
}

export default function Navigation({ items, currentPath }: Props) {
  const handleMouseEnter = (href: string) => {
    if (href === "/reading") {
      fetch("/api/articles.json").catch(() => {});
    }
  };

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-1 sm:gap-2"
    >
      {items.map((item) => {
        const isActive = currentPath === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onMouseEnter={() => handleMouseEnter(item.href)}
            className={cn(
              "relative px-3 py-2 text-sm transition-colors rounded-md",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {item.label}
            {isActive && (
              <span
                className="absolute inset-x-3 -bottom-px h-px bg-primary"
                style={{ viewTransitionName: "nav-indicator" }}
              />
            )}
          </a>
        );
      })}
    </nav>
  );
}
