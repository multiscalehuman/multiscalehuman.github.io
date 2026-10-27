# multiscalehuman.github.io

Source for the CIFAR MacMillan Multiscale Human Data Portal, published at https://multiscalehuman.github.io/.

The workspace uses Nx 23 and Angular 22, with npm as the package manager. It builds on [AtlasNG](https://github.com/cns-iu/AtlasNG) for UI components, analytics, and shared tooling (`@atlasng/nx-plugin`, `@atlasng/eslint-plugin`, `@atlasng/prettier-config`, `@atlasng/tsconfig`, `@atlasng/commitlint-config`).

## Layout

| Path             | Contents                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `apps/portal/`   | The portal application                                                                        |
| `libs/mhu-cube/` | The `<mhu-cube>` web component, the Space Time Organ Graph ([guide](libs/mhu-cube/README.md)) |

## Getting started

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npx nx serve portal          # dev server at http://localhost:4200
npx nx build portal          # production build in dist/apps/portal/browser
npx nx test portal           # Vitest unit tests with coverage
npx nx lint portal
npx nx format:write
```

The `@atlasng/nx-plugin:sync` generator manages shared config files (`.editorconfig`, husky hooks, `.vscode`, agent instructions, and parts of `nx.json`). Run `npx nx sync` after you add or rename a project.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`. It builds the portal and publishes it to GitHub Pages. `.github/workflows/ci.yml` runs format, lint, test, and build checks on pull requests.

## License

[MIT](LICENSE)
