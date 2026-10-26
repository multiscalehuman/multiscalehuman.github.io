import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, "packages/mhu-cube/src/index.ts"),
      formats: ["es"],
      fileName: "mhu-cube",
    },
    outDir: "packages/mhu-cube/dist",
    sourcemap: true,
  },
});
