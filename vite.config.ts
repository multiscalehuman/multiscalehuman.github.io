import { resolve } from "node:path";
import { defineConfig } from "vite";

// Builds the component preview page. The component package itself builds with vite.embed.config.ts.
export default defineConfig({
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        preview: resolve(__dirname, "preview/index.html"),
      },
    },
  },
});
