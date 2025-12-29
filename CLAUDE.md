# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Use pnpm, not npm.**

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm preview  # Preview production build locally
```

## Architecture

This is an Astro 5 portfolio site with hybrid rendering deployed on Vercel.

**Stack:** Astro + React 19 (with React Compiler) + Tailwind v4 + Framer Motion

### Rendering Strategy

- `output: "server"` in astro.config.mjs enables SSR by default
- Pages can opt into static generation with `export const prerender = true` (see index.astro)

### Project Structure

- `src/pages/` - Astro pages and API routes
- `src/layouts/BaseLayout.astro` - Main layout with SEO meta, fonts, theme script, and button press animation
- `src/components/layout/` - Header, Footer, Navigation
- `src/components/sections/` - Page-specific components (cards, lists, previews)
- `src/components/ui/` - Reusable UI components (ThemeToggle)
- `src/lib/` - Utility functions and external API integrations
- `src/content/` - JSON data files for projects and books
- `src/styles/global.css` - Tailwind v4 config with CSS variables for theming

### External Integrations

- **Medium:** `src/lib/medium.ts` - Fetches blog posts via rss2json API
- **Inoreader:** `src/lib/inoreader.ts` - Fetches saved articles RSS feed (requires `INOREADER_RSS_URL` env var)
- **OG Images:** `src/pages/api/og.png.ts` - Dynamic Open Graph image generation using @vercel/og

### Styling Conventions

- Tailwind v4 with OKLCH color variables defined in global.css
- Dark mode via `.dark` class on html element (toggled by ThemeToggle component)
- Uses shadcn/ui-style semantic color tokens: `background`, `foreground`, `primary`, `muted`, `border`, etc.
- Framer Motion for React component animations with inline, per-component animation variants and reduced motion support

### Key Patterns

- React components use Astro `client:*` directives for lazy hydration (e.g. Navigation uses `client:idle`, ThemeToggle uses `client:visible`), chosen based on component requirements
- View Transitions API enabled via `<ClientRouter />` in layout
- Security headers configured in vercel.json including CSP
