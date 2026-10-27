import { defineConfig } from 'vite';

/** Serves the manual browser harness for `<mhu-cube>` layout, hit-testing, and responsive checks. */
export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  server: { port: 4300 },
});
