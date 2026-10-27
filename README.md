# multiscalehuman.github.io

Source for the Multiscale Human site. It currently holds `<mhu-cube>`, the Space Time Organ Graph: an accessible, responsive web component that compares organ-imaging datasets by space, time, and organ and links to their metadata.

## Quick start

The toolchain requires Node.js 22 or later.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/preview/` to see the component with example datasets. Vite picks another port when 5173 is busy.

## Using the component

Start with [`packages/mhu-cube/README.md`](packages/mhu-cube/README.md). It covers:

- Angular integration
- properties, events, and validated data contracts
- including and overriding the component's SCSS
- responsive behavior and theming
- accessibility behavior and testing

The component renders into the light DOM. A page includes its stylesheet (`@use "@mhu/mhu-cube";` from SCSS, or the built `mhu-cube.css`), and the site's own stylesheets can restyle its parts.

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run build:embed
npm run test:embed
npm run test:browser:build
npm run test:package
```

`npm test` runs the Node tests. It fails if they cover less than 85% of the lines, branches, or functions in the source modules Node can load: validation, projection, the details transition, and the copy. Node has no DOM, so the browser harness checks the element, its cards, and its SVG drawing.

`npm run build:embed` writes the package's `dist/` folder: the ESM module, compiled CSS, source maps, and TypeScript declarations. `dist/` is build output and isn't committed.

For the interactive browser checks, run `npm run test:browser` and open the URL it prints.

## Repository map

| Path | Purpose |
| --- | --- |
| [`packages/mhu-cube`](packages/mhu-cube) | Component source (TypeScript and SCSS), handoff guide, and license |
| [`preview`](preview) | Preview page and example datasets; its `styles.scss` shows the SCSS integration |
| [`tests`](tests) | Node tests for validation, layout, styles, and copy, plus the browser harness |
| [`CLAUDE.md`](CLAUDE.md) | Guidance for Claude Code in this repository |

## License

This repository is available under the [MIT license](LICENSE). The `mhu-cube` package is copyright Cyberinfrastructure for Network Science Center and is distributed under its own [MIT license](packages/mhu-cube/LICENSE).
