import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from 'sass';

// Specs are bundled, so resolve sources from the workspace root rather than import.meta.url.
const libDir = join(process.cwd(), 'libs/mhu-cube/src/lib');
const read = (file: string) => readFileSync(join(libDir, file), 'utf8');

// Prettier spreads rules over several lines and prefers single quotes, so the assertions match against a
// whitespace-collapsed copy with double quotes, which reads like a stylesheet written one rule per line.
const normalize = (stylesheet: string) =>
  stylesheet.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/'/g, '"');

// The core partials split one sequence of rules, so the assertions read them as one stylesheet, in load order.
const CORE_PARTIALS = [
  '_host.scss',
  '_layout.scss',
  '_frame.scss',
  '_blocks.scss',
  '_hover-card.scss',
  '_unpositioned.scss',
  '_intro.scss',
  '_details.scss',
  '_utilities.scss',
  '_responsive.scss',
];
const rawStyles = CORE_PARTIALS.map((file) => read(`styles/${file}`)).join('\n');
const rawDataStyles = read('styles/_data.scss');
const rawCardStyles = read('styles/_cards.scss');
const styles = normalize(rawStyles);
const dataStyles = normalize(rawDataStyles);
const cardStyles = normalize(rawCardStyles);

describe('mhu-cube styles', () => {
  it('the SCSS entry compiles the partials in cascade order', () => {
    const { css } = compile(join(libDir, 'styles/mhu-cube.scss'));
    const order = ['.mhu-cube__plot {', '.mhu-cube__intro-attribution {', '.mhu-cube__compact-card {'].map((selector) =>
      css.indexOf(selector),
    );

    expect(
      order.every((index) => index >= 0),
      'Every partial is included.',
    ).toBe(true);
    expect(
      [...order].sort((a, b) => a - b),
      'Core, data, then card styles, so later partials refine earlier ones.',
    ).toEqual(order);
  });

  it('light DOM styles stay scoped to the element', () => {
    expect(styles).not.toMatch(/:host/);
    expect(styles).toMatch(/^mhu-cube \{[\s\S]*?container: mhu-cube-host \/ inline-size;/);
    expect(styles).toMatch(/\} mhu-cube \* \{ box-sizing: border-box; \}/);
    [rawStyles, rawDataStyles, rawCardStyles].forEach((stylesheet) => {
      const selectors = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '').match(/(^|[};]\s*)[^@{};\s][^{};]*(?=\{)/g) ?? [];
      selectors
        .flatMap((selector) => selector.replace(/^[};]?\s*/, '').split(','))
        .map((selector) => selector.trim())
        .forEach((selector) => {
          expect(selector, `${selector} must be scoped to the element`).toMatch(
            /^(mhu-cube\b|\.mhu-cube|from\b|to\b|\d+%)/,
          );
        });
    });
  });

  it('component styles preserve non-color states and forced-colors support', () => {
    expect(styles).toMatch(/@media \(forced-colors: active\)/);
    expect(styles).toMatch(/mhu-cube__item--unavailable[\s\S]*stroke-dasharray/);
    expect(styles).not.toMatch(/\.mhu-cube__item--unavailable\s*\{\s*opacity:/);
    expect(styles).toMatch(/--mat-sys-body-small-size, 0\.75rem/);
    expect(styles).toMatch(/mhu-cube__top,[\s\S]*?stroke-linejoin: bevel;/);
    expect(styles).toMatch(/mhu-cube__item--unavailable \.mhu-cube__cube \{ opacity: 1; filter: none; \}/);
  });

  it('public typography follows Material 3 roles with limited semibold overrides', () => {
    [styles, dataStyles, cardStyles].forEach((stylesheet) => {
      expect(stylesheet).not.toMatch(/font-weight:\s*700/);
    });
    expect(styles).toMatch(
      /mhu-cube__intro-heading[\s\S]*?--mat-sys-headline-large-size, 2rem[\s\S]*?--mat-sys-headline-large-weight, 600[\s\S]*?white-space: nowrap/,
    );
    expect(styles).toMatch(
      /mhu-cube__intro-heading[\s\S]*?--mat-sys-headline-medium-size, 1\.75rem[\s\S]*?--mat-sys-headline-medium-weight, 600[\s\S]*?white-space: normal/,
    );
    expect(styles).toMatch(/mhu-cube__axis-title[\s\S]*?font-weight: 600/);
    expect(styles).toMatch(
      /\.mhu-cube__eyebrow \{[\s\S]*?color: var\(--_primary\);[\s\S]*?--mat-sys-label-medium-size, 0\.75rem[\s\S]*?font-weight: 600;[\s\S]*?--mat-sys-label-medium-line-height, 1rem[\s\S]*?text-transform: uppercase;/,
    );
    // Every eyebrow shares that one style, so the per-eyebrow classes set only spacing.
    expect(styles).not.toMatch(
      /\.mhu-cube__(intro|details)-eyebrow[^{]*\{[^}]*(font|line-height|letter-spacing|color|text-transform)/,
    );
    expect(styles).toMatch(
      /mhu-cube__details-heading[\s\S]*?--mat-sys-title-large-size, 1\.375rem[\s\S]*?font-weight: 500/,
    );
    expect(dataStyles).toMatch(/mhu-cube__details-metadata \{[\s\S]*?--mat-sys-body-medium-size, 0\.875rem/);
    expect(styles).toMatch(/mhu-cube__intro-visualization \{[\s\S]*?--mat-sys-body-large-size, 1rem/);
    // The lead paragraph follows AtlasNG's content paragraph, so it scales body-large instead of fixing a size.
    expect(styles).toMatch(
      /\.mhu-cube__intro-summary \{\s*font-size: calc\(var\(--ang-content-paragraph-size-multiplier, 1\.0625\) \* var\(--mat-sys-body-large-size, 1rem\)\);/,
    );
    expect(styles).toMatch(
      /\.mhu-cube__intro-summary \{[^}]*line-height: calc\([^;]*--ang-content-paragraph-line-height-multiplier, var\(--ang-content-paragraph-size-multiplier, 1\.0625\)\)[^;]*--mat-sys-body-large-line-height, 1\.5rem/,
    );
    expect(styles).not.toMatch(/\.mhu-cube__intro-summary \{[^}]*letter-spacing/);
    expect(styles).toMatch(
      /\.mhu-cube__intro-summary-compact \{[\s\S]*?--mat-sys-body-large-size, 1rem[\s\S]*?--mat-sys-body-large-line-height, 1\.5rem/,
    );
    expect(dataStyles).toMatch(/\.mhu-cube__intro-attribution \{[\s\S]*?--mat-sys-body-medium-size, 0\.875rem/);
    expect(styles).toMatch(/mhu-cube__details-unavailable \{[\s\S]*?--mat-sys-body-large-size, 1rem/);
    expect(dataStyles).toMatch(/mhu-cube__details-metadata dt \{ color: var\(--_on-surface\); font-weight: 500; \}/);
    expect(dataStyles).toMatch(/mhu-cube__details-metadata dd \{ color: var\(--_on-surface-variant\); \}/);
    expect(dataStyles).toMatch(
      /mhu-cube__intro-dimensions dt \{ color: var\(--_on-surface\); font-weight: 500; white-space: nowrap; \}/,
    );
  });

  it('selection preserves scene depth while active preview cards remain visible', () => {
    expect(styles).not.toMatch(/\.mhu-cube__item--selected \{[^}]*z-index:/);
    expect(styles).not.toMatch(/z-index: 20000/);
    expect(styles).toMatch(/\.mhu-cube__cube \{[^}]*position: relative;[^}]*z-index: var\(--cube-layer, 1\);/);
    expect(styles).toMatch(/\.mhu-cube__card \{[^}]*z-index: 1000;[^}]*top: var\(--card-top, 50%\);/);
    expect(styles).toMatch(/\.mhu-cube__select:focus-visible \{ z-index: 999;/);
    expect(styles).toMatch(/\.mhu-cube__item--selected \.mhu-cube__select \.mhu-cube__card \{ opacity: 0; \}/);
  });

  it('only painted block faces receive pointer input on desktop', () => {
    expect(styles).toMatch(/\.mhu-cube__item \{[^}]*pointer-events: none;/);
    expect(styles).toMatch(/\.mhu-cube__select \{[^}]*pointer-events: none;/);
    expect(styles).toMatch(/\.mhu-cube__top, \.mhu-cube__left, \.mhu-cube__right \{[^}]*pointer-events: fill;/);
    expect(styles).toMatch(/\.mhu-cube__edge \{[^}]*pointer-events: none;/);
    expect(styles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__item \{[^}]*pointer-events: auto;/,
    );
    expect(styles).not.toMatch(/\.mhu-cube__item--current \.mhu-cube__cube \{[^}]*outline/);
  });

  it('axis styles name the space, time, and organ axes', () => {
    expect(styles).toMatch(/\.mhu-cube__axis-title--time \{/);
    expect(styles).toMatch(/\.mhu-cube__axis-value \{/);
    expect(styles).toMatch(/\.mhu-cube__axis-title--space, \.mhu-cube__axis-title--organ,/);
    expect(styles).not.toMatch(/mhu-cube__axis-(title|value)--[xyz]\b/);
    expect(styles).toMatch(
      /\.mhu-cube__frame-guide, \.mhu-cube__frame-floor-guide \{[\s\S]*?vector-effect: non-scaling-stroke;/,
    );
    expect(styles).toMatch(
      /@media \(forced-colors: active\)[\s\S]*?\.mhu-cube__frame-guide, \.mhu-cube__frame-floor-guide, \.mhu-cube__shadow-drop \{ stroke: GrayText; \}/,
    );
  });

  it("axis labels are pushed off the frame along each edge's outward normal", () => {
    const view = read('geometry/view.ts');

    expect(styles).toMatch(
      /transform: translate\(\s*calc\(var\(--_align-x\) \+ var\(--axis-normal-x, 0\) \* var\(--_offset\)\),\s*calc\(var\(--_align-y\) \+ var\(--axis-normal-y, 0\) \* var\(--_offset\)\)\s*\);/,
    );
    // Value alignment and floor-title offsets are set inline from each edge's normal, so CSS only supplies defaults.
    expect(styles).toMatch(/--_align-x: -50%;\s*--_align-y: -50%;\s*--_offset: 0\.5rem;/);
    // Normals are computed for the camera's drawing-area shape, so CSS must size the plot from the same ratio.
    const element = read('element/mhu-cube.ts');
    expect(styles).toMatch(
      /\.mhu-cube__plot \{[^}]*\/ var\(--_area-ratio, 1\) \+ var\(--_gutter-x\)[^}]*\* var\(--_area-ratio, 1\) \+ var\(--_gutter-y\)/,
    );
    expect(element).toMatch(/style\.setProperty\(['"]--_area-ratio['"], String\(DRAWING_AREA_RATIO\)\)/);
    expect(view).toMatch(/heightRatio: \(height \* DESIGN_HEIGHT_RATIO\) \/ width/);
  });

  it('block shadows paint beneath every block and age markers appear only when a block is active', () => {
    expect(styles).toMatch(/\.mhu-cube__shadow \{[^}]*z-index: 0;[^}]*overflow: visible;[^}]*pointer-events: none;/);
    expect(styles).toMatch(/\.mhu-cube__time-marker \{ opacity: 0;/);
    expect(styles).toMatch(
      /\.mhu-cube__select:hover \.mhu-cube__time-marker,\s*\.mhu-cube__select:focus-visible \.mhu-cube__time-marker,\s*\.mhu-cube__item--selected \.mhu-cube__time-marker \{ opacity: 1; \}/,
    );
    expect(styles).toMatch(
      /\.mhu-cube--has-selection \.mhu-cube__item:not\(\.mhu-cube__item--selected\) \.mhu-cube__shadow \{ opacity: 0\.35; \}/,
    );
    expect(styles).toMatch(
      /@media \(forced-colors: active\)[\s\S]*?\.mhu-cube__time-leader, \.mhu-cube__time-bracket \{ stroke: Highlight; \}/,
    );
  });

  it('desktop content precedes the visualization and selected details use a card', () => {
    expect(styles).toMatch(/grid-template-columns: minmax\(22rem, clamp\(28rem, 31%, 35rem\)\) minmax\(0, 1fr\)/);
    expect(styles).toMatch(/grid-template-rows: minmax\(0, 1fr\)/);
    expect(styles).toMatch(/grid-template-areas: "content stage"/);
    expect(styles).toMatch(
      /\.mhu-cube__content \{[\s\S]*?align-self: stretch;[\s\S]*?flex-direction: column;[\s\S]*?height: 100%;[\s\S]*?min-height: 0;[\s\S]*?padding: 0 0 1rem;/,
    );
    expect(styles).not.toMatch(/\.mhu-cube__content \{[^}]*overflow: auto/);
    expect(styles).toMatch(
      /--_surface-container-lowest: var\(--mhu-cube-surface-container-lowest, var\(--mat-sys-surface-container-lowest, #ffffff\)\);/,
    );
    expect(styles).toMatch(
      /\.mhu-cube__details-card \{[\s\S]*?border: 1px solid[\s\S]*?background: var\(--_surface-container\);[\s\S]*?box-shadow:/,
    );
  });

  it('responsive introductions swap the heading text and replace visualization guidance with the compact description', () => {
    expect(styles).toMatch(/\.mhu-cube__intro-heading-compact \{ display: none; \}/);
    expect(styles).toMatch(/\.mhu-cube__intro-summary-compact \{\s*display: none;/);
    expect(styles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__intro-heading-wide, \.mhu-cube__intro-visualization \{ display: none; \}/,
    );
    expect(styles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__intro-heading-compact \{ display: inline; \}/,
    );
    expect(styles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__intro-summary-compact \{ display: block; \}/,
    );
  });

  it('component spacing follows the host width rather than the browser window', () => {
    expect(styles).toMatch(
      /\.mhu-cube \{[\s\S]*?gap: clamp\(1\.5rem, 3cqw, 4rem\);[\s\S]*?padding: clamp\(1\.5rem, 3cqw, 3rem\);/,
    );
    expect(styles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?padding: clamp\(1\.5rem, 4cqw, 2\.5rem\) 0 0;/,
    );
    expect(styles).not.toMatch(/\dvw/);
  });

  it('desktop guidance uses a compact dimension key and tighter details spacing', () => {
    expect(styles).toMatch(/\.mhu-cube__content \{[\s\S]*?gap: clamp\(1\.5rem, 3vh, 2\.5rem\);/);
    expect(styles).toMatch(/\.mhu-cube__intro \{[\s\S]*?flex-direction: column;[\s\S]*?height: 100%;/);
    expect(styles).toMatch(/\.mhu-cube__intro-visualization \{[\s\S]*?display: flex;[\s\S]*?flex: 1;/);
    expect(dataStyles).toMatch(/\.mhu-cube__intro-attribution \{[\s\S]*?margin-top: auto;[\s\S]*?padding-top: 1rem;/);
    expect(dataStyles).toMatch(/\.mhu-cube__intro-dimensions \{[\s\S]*?margin: 0;/);
    expect(dataStyles).toMatch(
      /\.mhu-cube__intro-dimensions-header,[\s\S]*?\.mhu-cube__intro-dimensions-row \{[\s\S]*?grid-template-columns: 7rem minmax\(0, 1fr\);/,
    );
    expect(dataStyles).toMatch(
      /\.mhu-cube__intro-dimensions-header \{[\s\S]*?margin-top: 2rem;[\s\S]*?font-weight: 600;/,
    );
    expect(dataStyles).toMatch(
      /\.mhu-cube__intro-dimensions-row \{[\s\S]*?grid-template-columns: 7rem minmax\(0, 1fr\);[\s\S]*?padding: 0\.5rem 0;/,
    );
    expect(dataStyles).toMatch(
      /\.mhu-cube--has-selection \.mhu-cube__intro-dimensions-header,[\s\S]*?\.mhu-cube--has-selection \.mhu-cube__intro-dimensions \{ display: none; \}/,
    );
    expect(dataStyles).toMatch(/\.mhu-cube__details \{ margin: 1\.5rem 0 0; \}/);
    expect(dataStyles).toMatch(/\.mhu-cube__details-header \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
    expect(dataStyles).toMatch(
      /\.mhu-cube__details-close \{[\s\S]*?width: 2\.75rem;[\s\S]*?height: 2\.75rem;[\s\S]*?border: 0;[\s\S]*?border-radius: 50%;[\s\S]*?color: var\(--_on-surface\);/,
    );
    expect(dataStyles).toMatch(
      /\.mhu-cube__details-close:hover \{ background: color-mix\(in srgb, var\(--_on-surface\) 8%, transparent\); \}/,
    );
    expect(dataStyles).toMatch(
      /\.mhu-cube__details-close:focus-visible \{[\s\S]*?var\(--_on-surface\) 10%, transparent/,
    );
    expect(dataStyles).toMatch(
      /\.mhu-cube__details-close:active \{ background: color-mix\(in srgb, var\(--_on-surface\) 10%, transparent\); \}/,
    );
    expect(dataStyles).toMatch(/\.mhu-cube__details-close-icon \{[\s\S]*?fill: currentColor;/);
  });

  it('dimension key and dataset details use scannable separation', () => {
    expect(dataStyles).toMatch(
      /\.mhu-cube__intro-dimensions-row \{[\s\S]*?border-bottom: 1px solid var\(--_outline-variant\);/,
    );
    expect(dataStyles).toMatch(/\.mhu-cube__intro-dimensions-row:last-child \{ border-bottom: 0; \}/);
    expect(dataStyles).toMatch(/\.mhu-cube__intro-dimensions dd \{ color: var\(--_on-surface-variant\); \}/);
    expect(dataStyles).toMatch(
      /\.mhu-cube__details-metadata-row \{[\s\S]*?grid-template-columns: minmax\(5\.5rem, 38%\) minmax\(0, 1fr\);[\s\S]*?border-bottom: 1px solid var\(--_outline-variant\);/,
    );
    expect(dataStyles).toMatch(/\.mhu-cube__details-metadata-row:last-child \{ border-bottom: 0; \}/);
    expect(dataStyles).toMatch(/@media \(forced-colors: active\)[\s\S]*?border-color: CanvasText;/);
  });

  it('compact cards stay hidden until the compact layout and keep their styles in one file', () => {
    expect(cardStyles).toMatch(
      /^[\s\S]*?\.mhu-cube__compact-card \{ display: none; \}[\s\S]*?@container mhu-cube-host \(max-width: 64rem\)/,
    );
    expect(styles).not.toMatch(/\.mhu-cube__compact-card[\s,{]/);
    expect(dataStyles).not.toMatch(/mhu-cube__compact-card/);
  });

  it('compact cards follow the Figma card: a square image on the primary container, facts, title, and details', () => {
    expect(cardStyles).toMatch(
      /\.mhu-cube__compact-card \{[\s\S]*?align-items: center;[\s\S]*?padding: 1rem;[\s\S]*?border: 1px solid var\(--_outline-variant\);[\s\S]*?background: var\(--_surface-container-lowest\);/,
    );
    expect(cardStyles).toMatch(
      /\.mhu-cube__compact-media \{[\s\S]*?width: min\(100%, 14rem\);[\s\S]*?aspect-ratio: 1;[\s\S]*?overflow: hidden;[\s\S]*?background: var\(--_primary-container\);/,
    );
    expect(cardStyles).toMatch(
      /\.mhu-cube__compact-image \{[\s\S]*?object-fit: contain;[\s\S]*?object-position: bottom;/,
    );
    expect(cardStyles).toMatch(
      /\.mhu-cube__compact-fact::before \{[\s\S]*?width: 0\.25rem;[\s\S]*?height: 0\.25rem;[\s\S]*?background: var\(--_primary\);/,
    );
    expect(cardStyles).toMatch(
      /\.mhu-cube__compact-heading \{[\s\S]*?--mat-sys-title-medium-size, 1rem[\s\S]*?font-weight: 600;/,
    );
    expect(cardStyles).toMatch(
      /\.mhu-cube__compact-details \{[\s\S]*?padding-top: 0\.75rem;[\s\S]*?border-top: 1px solid var\(--_outline-variant\);/,
    );
    expect(styles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, 16\.125rem\), 1fr\)\);/,
    );
  });

  it('touch screens open the dataset from the whole card; mice use the image and title with hover feedback', () => {
    expect(cardStyles).toMatch(
      /@container mhu-cube-host \(max-width: 64rem\)[\s\S]*?\.mhu-cube__compact-link::after \{ content: ""; position: absolute; inset: 0; \}/,
    );
    expect(cardStyles).toMatch(/\.mhu-cube__compact-link:focus-visible::after \{ outline: 3px solid var\(--_focus\);/);
    expect(cardStyles).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.mhu-cube__compact-link::after \{ content: none; \}[\s\S]*?\.mhu-cube__compact-link:hover \{ text-decoration: underline;[\s\S]*?\.mhu-cube__compact-media:hover \.mhu-cube__compact-image \{ transform: scale\(1\.08\); \}/,
    );
    expect(cardStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.mhu-cube__compact-image \{ transition: none; \}/,
    );
    expect(cardStyles).toMatch(
      /@media \(forced-colors: active\)[\s\S]*?\.mhu-cube__compact-fact::before \{ forced-color-adjust: none; background: CanvasText; \}/,
    );
  });
});
