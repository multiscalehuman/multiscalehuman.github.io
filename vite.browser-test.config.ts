import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "tests/browser"),
  publicDir: false,
  build: {
    outDir: resolve(__dirname, "dist/browser-test"),
    emptyOutDir: true,
  },
});
