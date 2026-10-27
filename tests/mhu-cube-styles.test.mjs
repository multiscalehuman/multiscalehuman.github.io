import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as sass from "sass";

const stylesEntry = new URL("../packages/mhu-cube/src/mhu-cube.scss", import.meta.url);
const styles = await readFile(new URL("../packages/mhu-cube/src/_mhu-cube-core.scss", import.meta.url), "utf8");
const dataStyles = await readFile(new URL("../packages/mhu-cube/src/_mhu-cube-data.scss", import.meta.url), "utf8");
const cardStyles = await readFile(new URL("../packages/mhu-cube/src/_mhu-cube-cards.scss", import.meta.url), "utf8");
const previewStyles = await readFile(new URL("../preview/styles.scss", import.meta.url), "utf8");
const previewMarkup = await readFile(new URL("../preview/index.html", import.meta.url), "utf8");

test("the SCSS entry compiles the partials in cascade order", () => {
  const { css } = sass.compile(fileURLToPath(stylesEntry));
  const order = [".mhu-cube__plot {", ".mhu-cube__intro-attribution {", ".mhu-cube__compact-card {"].map((selector) => css.indexOf(selector));

  assert.ok(order.every((index) => index >= 0), "Every partial is included.");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "Core, data, then card styles, so later partials refine earlier ones.");
  assert.match(previewStyles, /^\/\/[^\n]*\n@use "\.\.\/packages\/mhu-cube\/src\/mhu-cube";/);
});

test("light DOM styles stay scoped to the element", () => {
  assert.doesNotMatch(styles, /:host/);
  assert.match(styles, /^mhu-cube \{[\s\S]*?container: mhu-cube-host \/ inline-size;/);
  assert.match(styles, /\nmhu-cube \* \{ box-sizing: border-box; \}/);
  [styles, dataStyles, cardStyles].forEach((stylesheet) => {
    const selectors = stylesheet.replace(/\/\*[\s\S]*?\*\//g, "").match(/(^|[};]\s*)[^@{};\s][^{};]*(?=\{)/g) ?? [];
    selectors.flatMap((selector) => selector.replace(/^[};]?\s*/, "").split(",")).map((selector) => selector.trim()).forEach((selector) => {
      assert.match(selector, /^(mhu-cube\b|\.mhu-cube|from\b|to\b|\d+%)/, `${selector} must be scoped to the element`);
    });
  });
});

test("component styles preserve non-color states and forced-colors support", () => {
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /mhu-cube__item--unavailable[\s\S]*stroke-dasharray/);
  assert.doesNotMatch(styles, /\.mhu-cube__item--unavailable\s*\{\s*opacity:/);
  assert.match(styles, /--mat-sys-body-small-size, 0\.75rem/);
  assert.match(styles, /mhu-cube__top,[\s\S]*?stroke-linejoin: bevel;/);
  assert.match(styles, /mhu-cube__item--unavailable \.mhu-cube__cube \{ opacity: 1; filter: none; \}/);
});

test("public typography follows Material 3 roles with limited semibold overrides", () => {
  [styles, dataStyles, cardStyles, previewStyles].forEach((stylesheet) => {
    assert.doesNotMatch(stylesheet, /font-weight:\s*700/);
  });
  assert.match(styles, /mhu-cube__intro-heading[\s\S]*?--mat-sys-headline-large-size, 2rem[\s\S]*?--mat-sys-headline-large-weight, 600[\s\S]*?white-space: nowrap/);
  assert.match(styles, /mhu-cube__intro-heading[\s\S]*?--mat-sys-headline-medium-size, 1\.75rem[\s\S]*?--mat-sys-headline-medium-weight, 600[\s\S]*?white-space: normal/);
  assert.match(styles, /mhu-cube__axis-title[\s\S]*?font-weight: 600/);
  assert.match(styles, /\.mhu-cube__eyebrow \{[\s\S]*?color: var\(--_primary\);[\s\S]*?--mat-sys-label-medium-size, 0\.75rem[\s\S]*?font-weight: 600;[\s\S]*?--mat-sys-label-medium-line-height, 1rem[\s\S]*?text-transform: uppercase;/);
  // Every eyebrow shares that one style, so the per-eyebrow classes set only spacing.
  assert.doesNotMatch(styles, /\.mhu-cube__(intro|details)-eyebrow[^{]*\{[^}]*(font|line-height|letter-spacing|color|text-transform)/);
  assert.match(styles, /mhu-cube__details-heading[\s\S]*?--mat-sys-title-large-size, 1\.375rem[\s\S]*?font-weight: 500/);
  assert.match(dataStyles, /mhu-cube__details-metadata \{[\s\S]*?--mat-sys-body-medium-size, 0\.875rem/);
  assert.match(styles, /mhu-cube__intro-visualization \{[\s\S]*?--mat-sys-body-large-size, 1rem/);
  assert.match(styles, /\.mhu-cube__intro-summary \{ font-size: 1\.125rem; line-height: 1\.75rem; letter-spacing: 0; \}/);
  assert.match(styles, /\.mhu-cube__intro-summary-compact \{[\s\S]*?--mat-sys-body-large-size, 1rem[\s\S]*?--mat-sys-body-large-line-height, 1\.5rem/);
  assert.match(dataStyles, /\.mhu-cube__intro-attribution \{[\s\S]*?--mat-sys-body-medium-size, 0\.875rem/);
  assert.match(styles, /mhu-cube__details-unavailable \{[\s\S]*?--mat-sys-body-large-size, 1rem/);
  assert.match(dataStyles, /mhu-cube__details-metadata dt \{ color: var\(--_on-surface\); font-weight: 500; \}/);
  assert.match(dataStyles, /mhu-cube__details-metadata dd \{ color: var\(--_on-surface-variant\); \}/);
  assert.match(dataStyles, /mhu-cube__intro-dimensions dt \{ color: var\(--_on-surface\); font-weight: 500; white-space: nowrap; \}/);
  assert.match(previewStyles, /\.metadata-preview h2[\s\S]*?--mat-sys-headline-medium-weight, 400/);
  assert.match(previewStyles, /roboto-latin-600-normal\.woff2/);
  assert.match(previewStyles, /roboto-latin-ext-600-normal\.woff/);
});

test("preview opens directly on the component", () => {
  assert.doesNotMatch(previewMarkup, /class="preview-header"/);
  assert.match(previewMarkup, /<h1 class="visually-hidden">mhu-cube preview<\/h1>/);
  assert.match(previewStyles, /\.visually-hidden \{[\s\S]*?clip: rect\(0, 0, 0, 0\);/);
});

test("the visualization preview cannot expand the page scroll width", () => {
  assert.match(previewStyles, /\.mhu-cube-preview \{[\s\S]*?overflow-x: clip;/);
});

test("selection preserves scene depth while active preview cards remain visible", () => {
  assert.doesNotMatch(styles, /\.mhu-cube__item--selected \{[^}]*z-index:/);
  assert.doesNotMatch(styles, /z-index: 20000/);
  assert.match(styles, /\.mhu-cube__cube \{[^}]*position: relative;[^}]*z-index: var\(--cube-layer, 1\);/);
  assert.match(styles, /\.mhu-cube__card \{[^}]*z-index: 1000;[^}]*top: var\(--card-top, 50%\);/);
  assert.match(styles, /\.mhu-cube__select:focus-visible \{ z-index: 999;/);
  assert.match(styles, /\.mhu-cube__item--selected \.mhu-cube__select \.mhu-cube__card \{ opacity: 0; \}/);
});

test("only painted block faces receive pointer input on desktop", () => {
  assert.match(styles, /\.mhu-cube__item \{[^}]*pointer-events: none;/);
  assert.match(styles, /\.mhu-cube__select \{[^}]*pointer-events: none;/);
  assert.match(styles, /\.mhu-cube__top, \.mhu-cube__left, \.mhu-cube__right \{[^}]*pointer-events: fill;/);
  assert.match(styles, /\.mhu-cube__edge \{[^}]*pointer-events: none;/);
  assert.match(styles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__item \{[^}]*pointer-events: auto;/);
  assert.doesNotMatch(styles, /\.mhu-cube__item--current \.mhu-cube__cube \{[^}]*outline/);
});

test("axis styles name the space, time, and organ axes", () => {
  assert.match(styles, /\.mhu-cube__axis-title--time \{/);
  assert.match(styles, /\.mhu-cube__axis-value \{/);
  assert.match(styles, /\.mhu-cube__axis-title--space, \.mhu-cube__axis-title--organ,/);
  assert.doesNotMatch(styles, /mhu-cube__axis-(title|value)--[xyz]\b/);
  assert.match(styles, /\.mhu-cube__frame-guide, \.mhu-cube__frame-floor-guide \{[\s\S]*?vector-effect: non-scaling-stroke;/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.mhu-cube__frame-guide, \.mhu-cube__frame-floor-guide, \.mhu-cube__shadow-drop \{ stroke: GrayText; \}/);
});

test("axis labels are pushed off the frame along each edge's outward normal", async () => {
  const projection = await readFile(new URL("../packages/mhu-cube/src/projection.ts", import.meta.url), "utf8");

  assert.match(styles, /transform: translate\(\s*calc\(var\(--_align-x\) \+ var\(--axis-normal-x, 0\) \* var\(--_offset\)\),\s*calc\(var\(--_align-y\) \+ var\(--axis-normal-y, 0\) \* var\(--_offset\)\)\s*\);/);
  // Value alignment and floor-title offsets are set inline from each edge's normal, so CSS only supplies defaults.
  assert.match(styles, /--_align-x: -50%;\s*--_align-y: -50%;\s*--_offset: 0\.5rem;/);
  // Normals are computed for the camera's drawing-area shape, so CSS must size the plot from the same ratio.
  const element = await readFile(new URL("../packages/mhu-cube/src/mhu-cube.ts", import.meta.url), "utf8");
  assert.match(styles, /\.mhu-cube__plot \{[^}]*\/ var\(--_area-ratio, 1\) \+ var\(--_gutter-x\)[^}]*\* var\(--_area-ratio, 1\) \+ var\(--_gutter-y\)/);
  assert.match(element, /style\.setProperty\("--_area-ratio", String\(DRAWING_AREA_RATIO\)\)/);
  assert.match(projection, /heightRatio: \(height \* DESIGN_HEIGHT_RATIO\) \/ width/);
});

test("block shadows paint beneath every block and age markers appear only when a block is active", () => {
  assert.match(styles, /\.mhu-cube__shadow \{[^}]*z-index: 0;[^}]*overflow: visible;[^}]*pointer-events: none;/);
  assert.match(styles, /\.mhu-cube__time-marker \{ opacity: 0;/);
  assert.match(styles, /\.mhu-cube__select:hover \.mhu-cube__time-marker,\s*\.mhu-cube__select:focus-visible \.mhu-cube__time-marker,\s*\.mhu-cube__item--selected \.mhu-cube__time-marker \{ opacity: 1; \}/);
  assert.match(styles, /\.mhu-cube--has-selection \.mhu-cube__item:not\(\.mhu-cube__item--selected\) \.mhu-cube__shadow \{ opacity: 0\.35; \}/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.mhu-cube__time-leader, \.mhu-cube__time-bracket \{ stroke: Highlight; \}/);
});

test("desktop content precedes the visualization and selected details use a card", () => {
  assert.match(styles, /grid-template-columns: minmax\(22rem, clamp\(28rem, 31%, 35rem\)\) minmax\(0, 1fr\)/);
  assert.match(styles, /grid-template-rows: minmax\(0, 1fr\)/);
  assert.match(styles, /grid-template-areas: "content stage"/);
  assert.match(styles, /\.mhu-cube__content \{[\s\S]*?align-self: stretch;[\s\S]*?flex-direction: column;[\s\S]*?height: 100%;[\s\S]*?min-height: 0;[\s\S]*?padding: 0 0 1rem;/);
  assert.doesNotMatch(styles, /\.mhu-cube__content \{[^}]*overflow: auto/);
  assert.match(previewStyles, /:root \{[\s\S]*?--mat-sys-surface-container: #eceff1;/);
  assert.match(previewStyles, /@media \(prefers-color-scheme: dark\) \{\s*:root \{[\s\S]*?--mat-sys-surface-container: #222a30;/);
  assert.match(styles, /--_surface-container-lowest: var\(--mhu-cube-surface-container-lowest, var\(--mat-sys-surface-container-lowest, #ffffff\)\);/);
  assert.match(previewStyles, /:root \{[\s\S]*?--mat-sys-surface-container-lowest: #ffffff;/);
  assert.match(previewStyles, /@media \(prefers-color-scheme: dark\) \{\s*:root \{[\s\S]*?--mat-sys-surface-container-lowest: #101417;/);
  assert.match(styles, /\.mhu-cube__details-card \{[\s\S]*?border: 1px solid[\s\S]*?background: var\(--_surface-container\);[\s\S]*?box-shadow:/);
});

test("the preview page and component share the lowest container surface", () => {
  assert.match(previewStyles, /\nbody \{[^}]*background: var\(--mat-sys-surface-container-lowest\);/);
  assert.match(previewStyles, /\nmhu-cube \{[^}]*--mhu-cube-surface: var\(--mat-sys-surface-container-lowest\);/);
});

test("responsive introductions swap the heading text and replace visualization guidance with the compact description", () => {
  assert.match(styles, /\.mhu-cube__intro-heading-compact \{ display: none; \}/);
  assert.match(styles, /\.mhu-cube__intro-summary-compact \{\s*display: none;/);
  assert.match(styles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__intro-heading-wide, \.mhu-cube__intro-visualization \{ display: none; \}/);
  assert.match(styles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__intro-heading-compact \{ display: inline; \}/);
  assert.match(styles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__intro-summary-compact \{ display: block; \}/);
});

test("component spacing follows the host width rather than the browser window", () => {
  assert.match(styles, /\.mhu-cube \{[\s\S]*?gap: clamp\(1\.5rem, 3cqw, 4rem\);[\s\S]*?padding: clamp\(1\.5rem, 3cqw, 3rem\);/);
  assert.match(styles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?padding: clamp\(1\.5rem, 4cqw, 2\.5rem\) 0 0;/);
  assert.doesNotMatch(styles, /\dvw/);
});

test("desktop guidance uses a compact dimension key and tighter details spacing", () => {
  assert.match(styles, /\.mhu-cube__content \{[\s\S]*?gap: clamp\(1\.5rem, 3vh, 2\.5rem\);/);
  assert.match(styles, /\.mhu-cube__intro \{[\s\S]*?flex-direction: column;[\s\S]*?height: 100%;/);
  assert.match(styles, /\.mhu-cube__intro-visualization \{[\s\S]*?display: flex;[\s\S]*?flex: 1;/);
  assert.match(dataStyles, /\.mhu-cube__intro-attribution \{[\s\S]*?margin-top: auto;[\s\S]*?padding-top: 1rem;/);
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions \{[\s\S]*?margin: 0;/);
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions-header,[\s\S]*?\.mhu-cube__intro-dimensions-row \{[\s\S]*?grid-template-columns: 7rem minmax\(0, 1fr\);/);
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions-header \{[\s\S]*?margin-top: 2rem;[\s\S]*?font-weight: 600;/);
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions-row \{[\s\S]*?grid-template-columns: 7rem minmax\(0, 1fr\);[\s\S]*?padding: 0\.5rem 0;/);
  assert.match(dataStyles, /\.mhu-cube--has-selection \.mhu-cube__intro-dimensions-header,[\s\S]*?\.mhu-cube--has-selection \.mhu-cube__intro-dimensions \{ display: none; \}/);
  assert.match(dataStyles, /\.mhu-cube__details \{ margin: 1\.5rem 0 0; \}/);
  assert.match(dataStyles, /\.mhu-cube__details-header \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(dataStyles, /\.mhu-cube__details-close \{[\s\S]*?width: 2\.75rem;[\s\S]*?height: 2\.75rem;[\s\S]*?border: 0;[\s\S]*?border-radius: 50%;[\s\S]*?color: var\(--_on-surface\);/);
  assert.match(dataStyles, /\.mhu-cube__details-close:hover \{ background: color-mix\(in srgb, var\(--_on-surface\) 8%, transparent\); \}/);
  assert.match(dataStyles, /\.mhu-cube__details-close:focus-visible \{[\s\S]*?var\(--_on-surface\) 10%, transparent/);
  assert.match(dataStyles, /\.mhu-cube__details-close:active \{ background: color-mix\(in srgb, var\(--_on-surface\) 10%, transparent\); \}/);
  assert.match(dataStyles, /\.mhu-cube__details-close-icon \{[\s\S]*?fill: currentColor;/);
});

test("dimension key and dataset details use scannable separation", () => {
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions-row \{[\s\S]*?border-bottom: 1px solid var\(--_outline-variant\);/);
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions-row:last-child \{ border-bottom: 0; \}/);
  assert.match(dataStyles, /\.mhu-cube__intro-dimensions dd \{ color: var\(--_on-surface-variant\); \}/);
  assert.match(dataStyles, /\.mhu-cube__details-metadata-row \{[\s\S]*?grid-template-columns: minmax\(5\.5rem, 38%\) minmax\(0, 1fr\);[\s\S]*?border-bottom: 1px solid var\(--_outline-variant\);/);
  assert.match(dataStyles, /\.mhu-cube__details-metadata-row:last-child \{ border-bottom: 0; \}/);
  assert.match(dataStyles, /@media \(forced-colors: active\)[\s\S]*?border-color: CanvasText;/);
});

test("compact cards stay hidden until the compact layout and keep their styles in one file", () => {
  assert.match(cardStyles, /^[\s\S]*?\.mhu-cube__compact-card \{ display: none; \}[\s\S]*?@container mhu-cube-host \(max-width: 64rem\)/);
  assert.doesNotMatch(styles, /\.mhu-cube__compact-card[\s,{]/);
  assert.doesNotMatch(dataStyles, /mhu-cube__compact-card/);
});

test("compact cards follow the Figma card: a square image on the primary container, facts, title, and details", () => {
  assert.match(cardStyles, /\.mhu-cube__compact-card \{[\s\S]*?align-items: center;[\s\S]*?padding: 1rem;[\s\S]*?border: 1px solid var\(--_outline-variant\);[\s\S]*?background: var\(--_surface-container-lowest\);/);
  assert.match(cardStyles, /\.mhu-cube__compact-media \{[\s\S]*?width: min\(100%, 14rem\);[\s\S]*?aspect-ratio: 1;[\s\S]*?overflow: hidden;[\s\S]*?background: var\(--_primary-container\);/);
  assert.match(cardStyles, /\.mhu-cube__compact-image \{[\s\S]*?object-fit: contain;[\s\S]*?object-position: bottom;/);
  assert.match(cardStyles, /\.mhu-cube__compact-fact::before \{[\s\S]*?width: 0\.25rem;[\s\S]*?height: 0\.25rem;[\s\S]*?background: var\(--_primary\);/);
  assert.match(cardStyles, /\.mhu-cube__compact-heading \{[\s\S]*?--mat-sys-title-medium-size, 1rem[\s\S]*?font-weight: 600;/);
  assert.match(cardStyles, /\.mhu-cube__compact-details \{[\s\S]*?padding-top: 0\.75rem;[\s\S]*?border-top: 1px solid var\(--_outline-variant\);/);
  assert.match(styles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, 16\.125rem\), 1fr\)\);/);
});

test("touch screens open the dataset from the whole card; mice use the image and title with hover feedback", () => {
  assert.match(cardStyles, /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__compact-link::after \{ content: ""; position: absolute; inset: 0; \}/);
  assert.match(cardStyles, /\.mhu-cube__compact-link:focus-visible::after \{ outline: 3px solid var\(--_focus\);/);
  assert.match(cardStyles, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.mhu-cube__compact-link::after \{ content: none; \}[\s\S]*?\.mhu-cube__compact-link:hover \{ text-decoration: underline;[\s\S]*?\.mhu-cube__compact-media:hover \.mhu-cube__compact-image \{ transform: scale\(1\.08\); \}/);
  assert.match(cardStyles, /@media \(prefers-reduced-motion: reduce\) \{\s*\.mhu-cube__compact-image \{ transition: none; \}/);
  assert.match(cardStyles, /@media \(forced-colors: active\)[\s\S]*?\.mhu-cube__compact-fact::before \{ forced-color-adjust: none; background: CanvasText; \}/);
});
