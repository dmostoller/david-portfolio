// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://www.davidmostoller.com",
  trailingSlash: "never",
  integrations: [
    // Scope (/scope) is the hidden alternate design; search engines only get Signal.
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith("/scope") }),
  ],
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
