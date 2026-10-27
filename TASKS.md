# Open tasks

These tasks remain after the Nx + AtlasNG workspace setup. Each one needs a decision, an account, or content that the code can't supply.

## Repository and deployment

- [ ] In the GitHub repo settings, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. The `Deploy` workflow fails until you do.
- [ ] Add branch protection on `main` that requires the `CI` workflow to pass.
- [ ] Decide on Nx Cloud (remote cache, distributed CI). It is off for now. To turn it on, run `npx nx connect` and add the `NX_CLOUD_ACCESS_TOKEN` secret.
- [ ] Decide whether you want PR preview deploys. wpp-ui uses Netlify for these; see `../wpp-ui/.github/actions/deploy-preview`.

## Branding and content

- [ ] Check the CIFAR social media URLs in `apps/portal/src/app/social-media.ts`. They were filled in from CIFAR's public accounts and should be verified.
- [ ] Confirm the footer text: organization `CIFAR`, link `https://cifar.ca/`, and the copyright line.
- [ ] Supply a favicon. `apps/portal/public/favicon.ico` is still the Nx default.
- [ ] The CIFAR logo (`apps/portal/public/assets/logos/cifar.svg`) was exported from the Figma footer. Approve it or replace it with the official asset.
- [ ] Keep the theme in `apps/portal/src/styles/` in sync with the Multiscale Human theme in AtlasNG ([cns-iu/AtlasNG#201](https://github.com/cns-iu/AtlasNG/pull/201)). The token JSON (`styles/tokens/`) and the generated `_palettes`, `_shape`, and `_typography` partials are copies from that PR. After the designer changes the tokens, regenerate them in AtlasNG and copy them over again.
- [ ] Ask the designer about the primary palette tones 25, 35, 50, 60, 70, 95, 98, and 99 in `palette.tokens.json`. They are blue (for example `#2F5E89`), while the rest of the primary palette is red.
- [ ] Review dark mode with the designer. The portal follows the visitor's light or dark preference. The CIFAR logo is red on both backgrounds, so it may need a dark-mode variant.
- [ ] Decide whether the site needs a global header. The Figma "Branded Header/CIFAR" layer is hidden on both pages, so no `ang-header-shell` was added.
- [ ] Write the privacy policy. `/privacy-policy` is a placeholder.

## Analytics and cookie consent

- [ ] Confirm the analytics setup in `apps/portal/src/app/app.config.ts`. It uses the AtlasNG default backend at `https://api.atlasng.dev/t` with `appName: 'multiscalehuman-portal'`, copied from wpp-ui. If the site needs no analytics, remove `provideAnalytics` and the cookie banner and modal.

## Mhu cube (PR #2)

- [ ] Integrate the `<mhu-cube>` web component from [PR #2](https://github.com/multiscalehuman/multiscalehuman.github.io/pull/2):
  - Generate a library, for example with `npx nx g @nx/js:library libs/mhu-cube --bundler=none --unitTestRunner=vitest`, and copy `packages/mhu-cube/src` into it.
  - Port the Node tests (`tests/*.test.mjs`) to Vitest. Decide where the browser harness lives.
  - Move the sample datasets from `preview/main.ts` and the 7 images in `preview/images/` into the app, or into data files under `apps/portal/public/`.
  - In the app, call `defineMhuCube()` at startup, add `@use 'mhu-cube'` (the lib's SCSS entry) to `styles.scss`, and render it with `CUSTOM_ELEMENTS_SCHEMA` or a small signal-based wrapper component.
  - Coordinate with LibbyUX to close or supersede PR #2 after the port.

## Pages from the Figma design

- [ ] **Homepage:** a hero with breadcrumbs (Home › Research Programs › CIFAR MacMillan Multiscale Human Program › Data Portal), the title, and the tagline. Below that come the "Space Time Organ Graph" section (the cube), the "3D Human Body Visualization" section that embeds the HRA Exploration User Interface, and the footer.
- [ ] **Metadata page template** (for example "Heart, 100 µm, ~40–70 years"):
  - Page label and organ icon, then a table of contents
  - Sections: Data Overview, 3D Visualizations (HRA Organ Gallery), 2D Cell Distance Distributions (Cell Distance Explorer embed), Lead Contacts, References, License, Acknowledgments
  - The last-modified date
  - AtlasNG has `content/*` and `table-of-contents` components for most of this.
- [ ] Decide where per-dataset content lives. wpp-ui uses YAML in `public/assets/content/`. Also decide the URL scheme for metadata pages; the cube currently links to `#metadata-<id>`.
