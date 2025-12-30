// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://www.davidmostoller.com",
  trailingSlash: "never",
  integrations: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    sitemap(),
  ],
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
