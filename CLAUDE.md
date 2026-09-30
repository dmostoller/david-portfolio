# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Use pnpm, not npm.**

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm preview  # Preview production build locally
```

After adding new files, restart `pnpm dev`: the Tailwind v4 Vite plugin doesn't pick up classes from files created while the server is running.

## Architecture

This is an Astro 5 portfolio site with hybrid rendering deployed on Vercel.

**Stack:** Astro + Tailwind v4. No UI framework: components are `.astro`, client behavior is plain TypeScript in `<script>` tags or `src/scripts/`.

### Two designs, one set of content

- **Signal** is the main design at `/`, `/projects`, `/blog`, `/reading` (`src/layouts/BaseLayout.astro`).
- **Scope** is a hidden alternate design that mirrors every page under `/scope` (`src/layouts/ScopeLayout.astro`). Visitors reach it through the A/B switch in Signal's footer (`src/components/ui/ABSwitch.astro`); flipping it plays a static "crossing" (`src/scripts/crossing.ts`) and loads the same page on the other side.
- Never show the word "Scope" to visitors. It's an internal name; the console prompt and tab titles use `dbm`.
- Scope pages set a canonical link to their Signal page and are excluded from the sitemap. Unknown `/scope/*` paths render a 404 ("packet dropped").
- Scope is always dark, uses its own palette (overrides on `html.scope` in ScopeLayout), and is keyboard-driven. Its client code is `src/scripts/scope/console.ts` (navigation, filter, command line, help, boot log, meters) and `src/scripts/scope/sound.ts` (opt-in Web Audio sounds). Commands and key help live in `src/lib/scope/commands.ts`.
- Both designs read the same content, so edit data once: `src/content/profile.ts` (focus, path, stack, socials), `src/content/*.json`, `src/lib/routes.ts` (page titles and descriptions).

### Rendering Strategy

- `output: "server"` in astro.config.mjs enables SSR by default
- Home and Projects (both designs) are prerendered with `export const prerender = true`
- Writing and Reading render on request and send `Cache-Control` from `feedCacheControl()` (`src/lib/content.ts`) so Vercel's CDN caches them for an hour and serves stale while refreshing. Failed feeds are cached for only a minute.

### Project Structure

- `src/pages/` - Signal pages, `scope/` pages, and `api/og.png.ts`
- `src/layouts/` - `BaseLayout.astro` (Signal: SEO meta, fonts, theme script, stripes, radar, header, footer) and `ScopeLayout.astro`
- `src/components/signal/` - Signal section and page header
- `src/components/scope/` - Scope panes, page title, traffic chart, level meter
- `src/components/ui/` - ThemeToggle, Icon (inline Lucide SVGs from `icons.ts`), StripedBackground, Radar, ABSwitch
- `src/scripts/` - Client scripts bundled by Astro (crossing, Scope console and sound)
- `src/lib/` - Routes, content helpers, formatting (UTC dates, entity decoding), feed caching, Medium and Inoreader clients
- `src/content/` - JSON data for projects, books, press, plus `profile.ts`
- `src/styles/global.css` - Tailwind v4 config with CSS variables for theming

### External Integrations

- **Medium:** `src/lib/medium.ts` - Fetches posts via the rss2json API; excerpts come from the first paragraph
- **Inoreader:** `src/lib/inoreader.ts` - Fetches the saved-articles RSS feed on the server (requires `INOREADER_RSS_URL` env var)
- **OG Images:** `src/pages/api/og.png.ts` - Dynamic Open Graph image generation using @vercel/og
- **Analytics:** `@vercel/analytics/astro` in both layouts

### Styling Conventions

- Tailwind v4 with OKLCH color variables defined in global.css
- Dark mode via `.dark` class on html element (toggled by ThemeToggle, which picks its icon with CSS so it's correct before scripts run)
- Uses shadcn/ui-style semantic color tokens: `background`, `foreground`, `primary`, `muted`, `border`, etc.
- Animations are CSS only (with `prefers-reduced-motion` fallbacks). Don't render content hidden until JavaScript runs.
- Format dates with `formatDate()` from `src/lib/format.ts`, which uses UTC so server and browser agree.

### Key Patterns

- Everything is plain Astro with no hydrated islands. Don't add React or another framework; add icons by copying Lucide shapes into `src/components/ui/icons.ts`.
- Cross-document view transitions via `@view-transition { navigation: auto; }` in each layout; there's no `<ClientRouter />`.
- Security headers configured in vercel.json including CSP
