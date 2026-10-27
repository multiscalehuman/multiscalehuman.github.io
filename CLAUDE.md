# CLAUDE.md

Guidance for Claude Code in this repository. For people, start with [README.md](README.md) and the component guide, [packages/mhu-cube/README.md](packages/mhu-cube/README.md).

## Project

- `packages/mhu-cube`: the `<mhu-cube>` web component, the Time Space Organ Graph (TypeScript and SCSS). It renders into the light DOM and has no runtime dependencies.
- `preview`: the preview page. Run `npm run dev` and open `http://localhost:5173/preview/`.
- `tests`: Node tests (`*.test.mjs`) and the browser harness (`tests/browser`).

This repository is the organization's GitHub Pages site, published from `main` at the root by the legacy Pages build, which doesn't run Vite. Merging to `main` publishes the README as the site's home page, and `/preview/` won't work there until a build-and-deploy workflow exists. Never push to `main` or merge a pull request without the maintainer's approval.

## Validation

Run what CI runs (`.github/workflows/validate.yml`), on Node.js 22 or later:

```bash
npm run typecheck
npm test
npm run build
npm run build:embed
npm run test:embed
npm run test:browser:build
npm run test:package
```

Don't add dependencies without the maintainer's approval.

## Tests

- `npm test` runs `node:test` on the TypeScript source with `--experimental-strip-types`. It fails below 85% line, branch, or function coverage of the source modules it loads: validation, projection, the details transition, and the copy. Add tests with new code rather than lowering the thresholds.
- Node has no DOM, so the element, card, and SVG modules aren't loaded or measured there. The browser harness (`npm run test:browser`) checks them in a real browser, including layout, container queries, and computed styles. CI builds the harness but doesn't run it, so run it by hand after changing those modules.
- The `test` script lists its files explicitly, because `tests/embed-import.test.mjs` needs a build first and runs separately. Add new test files to that list.

## UX copy

- The intro copy lives in `packages/mhu-cube/src/mhu-cube-copy.ts`. To change wording, edit only that file.
- Tests read the expected text from `MHU_CUBE_INTRO_COPY`. Don't hard-code intro copy in tests. Put copy constraints in `tests/mhu-cube-copy.test.mjs` as rules, such as the desktop heading's 28-character limit.
- The desktop and compact descriptions both state the preview's dataset and team counts. Update them together.
- Keep the Metacube attribution link to `https://github.com/Chair-for-Clinical-Bioinformatics/metacube`. It's a required credit, so the browser harness checks the literal URL.
- Other interface text, such as status labels, button names, and fallback messages, is still in the component modules.

## Conventions

- Scope every style rule to `mhu-cube` or a `.mhu-cube__*` class; `tests/mhu-cube-styles.test.mjs` enforces this. Use Angular Material system tokens with fallbacks.
- Text styles are defined once and shared. For example, every eyebrow uses the `.mhu-cube__eyebrow` style (`label-medium`, 600 weight, uppercase, primary color), and its own class sets only spacing.
- Document exported and nontrivial functions with JSDoc `@param` and `@returns`, as the existing source does.
- When behavior, copy fields, or styles change, update `packages/mhu-cube/README.md` to match.
- `dist/` folders are build output. Don't commit or hand-edit them.
