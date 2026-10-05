# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Use pnpm, not npm.**

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm check         # Type-check .astro and .ts files
pnpm format        # Format with Prettier
pnpm format:check  # Check formatting (what to run before a PR)
```

There's no linter or test suite; `pnpm check`, `pnpm format:check`, and `pnpm build` are the checks. `pnpm preview` doesn't work: the Vercel adapter doesn't support it. Prettier's config (`.prettierrc`) formats `.astro` files with tabs, single quotes, and 120 columns, and everything else with Prettier's defaults.

After adding new files, restart `pnpm dev`: the Tailwind v4 Vite plugin doesn't pick up classes from files created while the server is running.

## Architecture

This is an Astro 5 portfolio site with hybrid rendering deployed on Vercel.

**Stack:** Astro + Tailwind v4. No UI framework: components are `.astro`, and client behavior is plain TypeScript in `<script>` tags.

### Content

- The design is called Signal internally (`src/layouts/BaseLayout.astro`, `src/components/signal/`). Pages: `/`, `/projects`, `/blog`, `/reading`.
- Edit content in one place: `src/content/profile.ts` (focus, path, stack, socials), `src/content/*.json`, and `src/lib/routes.ts` (page titles and descriptions).

### Rendering Strategy

- `output: "server"` in astro.config.mjs enables SSR by default
- Home and Projects are prerendered with `export const prerender = true`
- Writing and Reading render on request and send `Cache-Control` from `feedCacheControl()` (`src/lib/content.ts`) so Vercel's CDN caches them for an hour and serves stale while refreshing. Failed feeds are cached for only a minute.

### Project Structure

- `src/pages/` - The pages, and `api/og.png.ts`
- `src/layouts/` - `BaseLayout.astro` (SEO meta, fonts, theme script, stripes, header, footer)
- `src/components/signal/` - Section and page header
- `src/components/ui/` - ThemeToggle, Icon (inline Lucide SVGs from `icons.ts`), StripedBackground
- `src/lib/` - Routes, content helpers, formatting (UTC dates, entity decoding), feed timeouts and Cache-Control, Medium and Inoreader clients
- `src/content/` - JSON data for projects, books, press, plus `profile.ts`
- `src/styles/global.css` - Tailwind v4 config with CSS variables for theming

### External Integrations

- **Medium:** `src/lib/medium.ts` - Fetches posts via the rss2json API; excerpts come from the first paragraph
- **Inoreader:** `src/lib/inoreader.ts` - Fetches the saved-articles RSS feed on the server (requires `INOREADER_RSS_URL` env var)
- **OG Images:** `src/pages/api/og.png.ts` - Dynamic Open Graph image generation using @vercel/og
- **Analytics:** `@vercel/analytics/astro` in BaseLayout

### Styling Conventions

- Tailwind v4 with OKLCH color variables defined in global.css
- Dark mode via `.dark` class on html element (toggled by ThemeToggle, which picks its icon with CSS so it's correct before scripts run)
- Uses shadcn/ui-style semantic color tokens: `background`, `foreground`, `primary`, `muted`, `border`, etc.
- Animations are CSS only (with `prefers-reduced-motion` fallbacks). Don't render content hidden until JavaScript runs.
- Motion classes live in BaseLayout: `rise` on a page's wrapper (its blocks rise in one after another), `reveal` on a list (items fade up as they scroll in, where scroll-driven animations are supported; `[--reveal-shift:0px]` for a fade only), `press` on buttons, `live-dot` on "now" markers, and `arrow` on a `↗` inside a `group` link.
- `html` has `scrollbar-gutter: stable`, so pages line up the same whether or not they scroll.
- Format dates with `formatDate()` from `src/lib/format.ts`, which uses UTC so server and browser agree.

### Key Patterns

- Everything is plain Astro with no hydrated islands. Don't add React or another framework; add icons by copying Lucide shapes into `src/components/ui/icons.ts`.
- Cross-document view transitions via `@view-transition { navigation: auto; }` in BaseLayout; there's no `<ClientRouter />`. The header stays put, the nav underline slides, and `main` (`page`) fades out while the new page rises in. Theme changes drop all transition names (global.css).
- Security headers configured in vercel.json including CSP
