# mhu-cube

`<mhu-cube>`, the Space Time Organ Graph, is an accessible, responsive web component for comparing Multiscale Human Portal organ-imaging datasets and opening their metadata. It was prototyped in a separate repository and is now an Nx library in this workspace; the portal renders it on its home page.

When its container is wider than `64rem`, the component keeps its introduction visible beside a perspective canvas that plots each dataset by **space** (spatial scale), **time** (donor age, vertical), and **organ** (alphabetical), and reveals the selected dataset card beneath that introduction. At `64rem` and below, it replaces the canvas and selection workflow with direct [dataset cards](#dataset-cards), as many per row as fit at the designed card width (about `16rem`).

## Status

- The element is a framework-neutral custom element with no runtime dependencies. It doesn't import Angular, so it can also be used outside the portal.
- The element renders into the light DOM, so the page includes its stylesheet and the site's own stylesheets can restyle its parts. See [Styles](#styles).
- Vitest specs run in jsdom and cover validation, projection, the details transition, the copy rules, the stylesheet rules, and the element's rendering, accessibility, keyboard, and event behavior. The workspace requires 85% coverage.
- jsdom has no layout, so geometry, computed styles, hit testing, and responsive behavior are checked by a [manual browser harness](#development). It isn't run in CI. One harness check currently fails: the harness renders with system fonts instead of Roboto, which makes the “Time (years)” title slightly wider than its `6rem` gutter.
- The portal shows sample datasets with placeholder metadata links until dataset metadata pages exist.

## Library contents

```text
libs/mhu-cube/
├── harness/            # Manual browser harness: runner, layout assertions, and suites
├── src/
│   ├── index.ts        # Public exports
│   ├── lib/            # Custom element source in feature folders, SCSS, and Vitest specs
│   └── testing/        # Shared spec and harness fixtures; not built or measured for coverage
├── LICENSE
├── ng-package.json     # Library build configuration
├── package.json
└── project.json        # Nx targets: build, test, lint, and harness
```

`npx nx build mhu-cube` writes the library to `dist/libs/mhu-cube`: ES modules, TypeScript declarations, and the SCSS source under `styles/`. `dist` is build output and is not committed. The portal doesn't use that build; it imports the source through the `@mhu/mhu-cube` TypeScript path.

### Source responsibilities

| Source                                           | Responsibility                                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                   | Supported package exports. The only barrel; other files import each other directly.                                                                                                                                                                                                      |
| `src/lib/types.ts`                               | Public data, event-detail, and validation types.                                                                                                                                                                                                                                         |
| `src/lib/element/mhu-cube.ts`                    | Custom-element lifecycle, state, rendering coordination, and registration.                                                                                                                                                                                                               |
| `src/lib/element/events.ts`                      | Event names and the global tag and event type declarations.                                                                                                                                                                                                                              |
| `src/lib/element/details-transition.ts`          | Animated swap between the dimension key and the selected dataset card.                                                                                                                                                                                                                   |
| `src/lib/cards/`                                 | Intro, selected-card, hover preview-card, compact-card, shared metadata-list, unpositioned-list, and icon markup.                                                                                                                                                                        |
| `src/lib/visualization/`                         | SVG frame with time and floor guides, axis labels, blocks with floor shadows and age markers, and each block's list item.                                                                                                                                                                |
| `src/lib/dom/`                                   | Typed element factory: `h()` for HTML and `svg()` for SVG elements, plus SVG path and point-list formatting. Cards, the plot, and the element build their DOM with it.                                                                                                                   |
| `src/lib/text/`                                  | Metadata and time formatting, and accessible names and descriptions.                                                                                                                                                                                                                     |
| `src/lib/geometry/`                              | Framework-independent camera view, projection, category spacing, time mapping, lane layout, and paint order.                                                                                                                                                                             |
| `src/lib/validation/`                            | Runtime normalization of axes, items, and metadata names; alphabetical organ order; URL safety; and validation issues.                                                                                                                                                                   |
| `src/lib/content/intro-content.ts`               | Editable introduction content; its types are in `content/types.ts`.                                                                                                                                                                                                                      |
| `src/lib/styles/mhu-cube.scss`                   | Stylesheet entry. Loads the partials below in cascade order.                                                                                                                                                                                                                             |
| `src/lib/styles/_host.scss` … `_responsive.scss` | Core styles, split by section: host properties, layout, frame and axis labels, blocks, hover cards, unpositioned list, introduction, details, utilities, and the container-query, reduced-motion, and forced-colors rules. They split one sequence of rules, so they load in that order. |
| `src/lib/styles/_data.scss`                      | Dimension key and dataset-detail presentation.                                                                                                                                                                                                                                           |
| `src/lib/styles/_cards.scss`                     | Compact dataset cards, including their touch and mouse interactions.                                                                                                                                                                                                                     |
| `src/lib/styles/_tokens.scss`                    | Helpers that name and read the custom properties: public theme hooks, private slots, and Material system tokens.                                                                                                                                                                         |
| `src/lib/styles/_typography.scss`                | The `typescale()` mixin and the Material 3 fallbacks for each type scale role in use.                                                                                                                                                                                                    |
| `src/testing/`                                   | Shared spec and harness fixtures and Testing Library queries. Excluded from the build and coverage.                                                                                                                                                                                      |

## Acknowledgment

The `mhu-cube` interaction and visual design were inspired by the original metacube visualization from the Chair for Clinical Bioinformatics. The component is an independent web-component implementation and does not copy substantive code from that visualization.

## Angular integration

The portal shows the complete integration. It registers the element once at startup in [`app.config.ts`](../../apps/portal/src/app/app.config.ts):

```ts
import { provideAppInitializer } from '@angular/core';
import { defineMhuCube } from '@mhu/mhu-cube';

export const appConfig: ApplicationConfig = {
  providers: [provideAppInitializer(defineMhuCube) /* … */],
};
```

`defineMhuCube()` is idempotent and safely returns when `customElements` is unavailable during server rendering. It must run in the browser before Angular creates `<mhu-cube>`.

The portal's global [`styles.scss`](../../apps/portal/src/styles.scss) includes the component stylesheet once, before any rules that adjust it:

```scss
@use '../../../libs/mhu-cube/src/lib/styles/mhu-cube';
```

See [Styles](#styles) for overriding the component from the site's stylesheets.

The component that renders the element allows it with Angular's [`CUSTOM_ELEMENTS_SCHEMA`](https://angular.dev/guide/components/advanced-configuration#custom-element-schemas), as the portal's [home page](../../apps/portal/src/app/pages/home-page/home-page.ts) does:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'mhu-dataset-browser',
  templateUrl: './dataset-browser.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DatasetBrowser {}
```

Bind arrays and objects as DOM properties, not serialized HTML attributes:

```html
<mhu-cube
  label="Organ imaging datasets"
  [axes]="axes"
  [items]="items"
  [selectedId]="selectedId"
  (mhu-cube-selection-change)="handleSelection($event)"
  (mhu-cube-validation)="handleValidation($event)"
/>
```

Angular commonly assigns bound properties synchronously. The component coalesces those assignments into one render and one final validation event, so setting `items` before `axes` does not expose a transient unknown-value warning.

### Optional Angular wrapper

The custom element works in Angular as-is. If the team prefers typed Angular inputs and outputs over `CUSTOM_ELEMENTS_SCHEMA` in feature templates, a thin wrapper can own the element. This sketch is a starting point, not a shipped file; the library adds no Angular dependency:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import {
  defineMhuCube,
  type MhuCubeAxes,
  type MhuCubeItem,
  type MhuCubeSelectionDetail,
  type MhuCubeValidationDetail,
} from '@mhu/mhu-cube';

defineMhuCube();

@Component({
  selector: 'mhu-cube-graph',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <mhu-cube
      [attr.label]="label()"
      [axes]="axes()"
      [items]="items()"
      [selectedId]="selectedId()"
      [compactMetadata]="compactMetadata()"
      [hoverMetadata]="hoverMetadata()"
      (mhu-cube-selection-change)="selectionChange.emit($event.detail)"
      (mhu-cube-validation)="validation.emit($event.detail)"
    />
  `,
})
export class MhuCubeGraph {
  readonly label = input('Organ imaging datasets');
  readonly axes = input.required<MhuCubeAxes>();
  readonly items = input.required<MhuCubeItem[]>();
  readonly selectedId = input<string | null>(null);
  readonly compactMetadata = input<string[] | null>(null);
  readonly hoverMetadata = input<string[] | null>(null);
  readonly selectionChange = output<MhuCubeSelectionDetail>();
  readonly validation = output<MhuCubeValidationDetail>();
}
```

Call `defineMhuCube()` only in the browser when the application uses server rendering.

The destination page owns external spacing. This matches the proposed Angular Material page gutters without special component configuration:

```css
.dataset-page {
  padding-inline: 20px;
}

@media (min-width: 961px) {
  .dataset-page {
    padding-inline: 40px;
  }
}

mhu-cube {
  display: block;
  width: 100%;
  height: calc(100dvh - var(--app-header-height));
}
```

The component responds to its available container width rather than the browser viewport, so page gutters and Angular layout containers are accounted for automatically. On compact layouts its height becomes content-driven.

## Public API

### Properties and JSON attributes

| Name              | Type               | Purpose                                                                                                                                                                                                              |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `axes`            | `MhuCubeAxes`      | Defines the `space`, `time`, and `organ` axes.                                                                                                                                                                       |
| `items`           | `MhuCubeItem[]`    | Supplies dataset labels, metadata, destinations, statuses, and plot positions.                                                                                                                                       |
| `selectedId`      | `string \| null`   | Selects a valid dataset on the desktop canvas. Property only.                                                                                                                                                        |
| `label`           | `string`           | Gives the component section its accessible name.                                                                                                                                                                     |
| `compactMetadata` | `string[] \| null` | Metadata names shown on [compact cards](#dataset-cards), in order and ignoring case. Defaults to `null`, which shows every entry the card does not already show. The selected dataset card always shows every entry. |
| `hoverMetadata`   | `string[] \| null` | Metadata names shown on the desktop hover card, in order and ignoring case. Defaults to `null`, which shows every entry. Block descriptions for assistive technology always include every entry.                     |

`axes` and `items` may also be passed as JSON attributes for static HTML prototypes. Property binding is recommended for Angular because it preserves types and avoids serialization. `compactMetadata` and `hoverMetadata` also accept `compact-metadata` and `hover-metadata` JSON attributes, such as `compact-metadata='["Corresponding authors"]'`; anything other than a list of strings falls back to `null` with a `compact-metadata.invalid` or `hover-metadata.invalid` warning.

### Axis model

```ts
interface MhuCubeAxes {
  time: { label: string; unit?: string; min: number; max: number; ticks?: number[] };
  space: { label: string; values: string[] };
  organ: { label: string; values: string[] };
}
```

```ts
const axes: MhuCubeAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: ['100 µm', '100 mm'] },
  organ: { label: 'Organ', values: ['Heart', 'Kidney', 'Liver', 'Thymus'] },
};
```

- **Space** values are displayed in the order supplied, so list them from smallest to largest.
- **Time** is the continuous vertical axis, measured as donor age. `min` must be less than `max`. `ticks` are optional; the default is five equal steps (`0, 20, 40, 60, 80, 100` above). The axis title appends `unit`, as in “Time (years)”; `unit` also appears in formatted ranges, such as “7–47 years”, and in the screen-reader axis summary. Faint guide lines on the back walls mark each interior tick.
- **Organ** values are always displayed alphabetically, regardless of the order supplied. Sorting ignores case and accents, so names that differ only that way are rejected as duplicates.
- Space and organ values must be nonempty, unique strings. The normalized `element.axes` value reflects the alphabetical organ order and the effective time ticks.

### Dataset model

```ts
interface MhuCubeItem {
  id: string;
  label: string;
  href?: string;
  image?: string;
  metadata?: Record<string, string | number | string[] | null | undefined>;
  position?: {
    time: { start: number; end: number; label?: string };
    space: string;
    organ: string;
  };
  status?: 'available' | 'current' | 'unavailable';
}
```

```ts
const item: MhuCubeItem = {
  id: 'zandstra-thymus-codex',
  label: 'Thymus, 100 µm, 4–5 months',
  href: '/metadata/zandstra-thymus-codex',
  image: '/images/zandstra-thymus-codex.png',
  metadata: { 'Corresponding authors': ['Peter W. Zandstra', 'Fabio M.V. Rossi'] },
  position: { time: { start: 4 / 12, end: 5 / 12, label: '4–5 months' }, space: '100 µm', organ: 'Thymus' },
};
```

- `id` must be nonempty and unique.
- `href` accepts relative, hash, HTTP, and HTTPS destinations. Unsafe or invalid protocols are removed.
- `image` is a square picture of the dataset with a transparent background, shown on compact cards over the primary container fill. It accepts relative, HTTP, and HTTPS URLs; unsafe ones are removed with an `item.image.unsafe` warning. A missing image, or one that fails to load, leaves the empty fill.
- `metadata` preserves supported values and their source order. A list of strings, such as several authors, shows one entry per line on compact cards and is joined with commas elsewhere, including the selected dataset card and hover card. `null`, `undefined`, and empty lists are retained in normalized data but not displayed.
- `position.space` and `position.organ` must exactly match a configured axis value. They are referenced by name, not index, so organ sorting never moves a dataset.
- `position.time` is inclusive and must lie inside the time axis, with `start` no later than `end`. A single age uses the same `start` and `end`. Use `label` when the numbers alone read poorly, for example months for infant donors; it replaces the formatted range in descriptions.
- A missing or unusable position keeps the dataset available but moves it to the desktop “Not plotted” fallback instead of inventing a block.
- A dataset without a valid destination is treated as unavailable.

### How positions are drawn

- The camera faces the organ axis: organs run left to right along the level front edge, time runs straight up the front-left edge, and space recedes upward into the page, with its labels along the right floor edge. Front-row heights read against the ticks; back-row heights read against the back-wall time lines.
- A time range draws a block from `start` to `end`, so wider ranges become taller, rectangular blocks.
- Single ages and ranges shorter than a block's width are drawn as cubes centered on their midpoint. Near either end of the axis, the cube shifts inward rather than being clipped, so its exact time is carried by its label, metadata, and accessible description.
- Datasets that share a space and organ and whose drawn heights overlap split that cell into side-by-side lanes along the organ axis. Only the overlapping datasets narrow; taller blocks take the farther lanes so they never hide shorter ones.
- Datasets in the same cell that do not overlap stack vertically at full width.
- Space usually has only a few values, so they spread toward the ends of the space axis instead of filling equal cells. With two values they form a back row and a front row. Larger sets fall back to equal cells.
- Faint floor guides run from every space and organ label across the floor. Each block casts its footprint onto the floor where its two guides cross, with dashed drop lines from its bottom corners, so a floating block can be traced back to its labels.
- The camera keeps the floor shallow, so depth moves a block up the screen far less than time does and heights read close to the time labels across the whole plot.
- Even so, a block's depth shifts it slightly against the time ticks. Hovering, keyboard focus, or selection reveals a bracket on the time axis for the dataset's exact start and end, plus level lines tracing those heights from the block to the axis. Single ages show a single level line and a dot.
- The plot is as large as its column allows. The frame fills a drawing area with the frame's own proportions, and labels hang into fixed `rem` gutters around that area, so they keep their room at any size. Whichever of the column's height or width runs out first sets the size; the other dimension keeps the leftover space, centered.
- Axis labels are placed from the frame itself. Each value label hangs from its axis position, offset straight out from the frame, and the space and organ titles sit in a second row beyond them. Labels stay clear of the frame and each other for values up to about `4rem` wide; longer space or organ names may need shorter display labels.
- Keyboard order, reading order, and compact-card order go alphabetically by organ, then by space, then by time, matching the dataset titles.

### Dataset cards

At `64rem` and below, each dataset is a card built from the [Figma design](https://www.figma.com/design/bSpc6bQC5nGwDaWJfx7Cen/CNS-Projects-2026?node-id=3169-242638&m=dev):

- A card on the lowest container surface (`surface-container-lowest`), white in light themes.
- The dataset's `image`, about `14rem` square, on the primary container fill. Non-square images are contained and sit on the bottom edge.
- Space and time, each after a small primary square.
- The organ as the card title.
- Below a divider, the metadata named in `compactMetadata`. Without it, every remaining entry appears, except entries whose key matches an axis label (ignoring case), because the card already shows them.
- Interaction depends on the input device, not the width:
  - **Mouse or trackpad** (`(hover: hover) and (pointer: fine)`): the image and the organ name both open the metadata page. Hovering the image grows it within its square; hovering the name underlines it. The rest of the card is not a link.
  - **Touch:** the title link stretches over the whole card, so pressing anywhere opens the metadata page.
- Unavailable datasets have no links and say that metadata is not available. The current dataset shows a “Current page” label.
- Datasets without a usable position fall back to their label as the title and all of their metadata.

Read `element.items`, `element.axes`, and `element.validationIssues` to inspect normalized values and current issues.

### Events

`mhu-cube-selection-change` fires after a desktop selection changes. Closing the selected-dataset card emits `null`:

```ts
element.addEventListener('mhu-cube-selection-change', (event) => {
  console.log(event.detail.item ?? 'Selection cleared');
});
```

`mhu-cube-validation` fires after connected configuration updates have been coalesced:

```ts
element.addEventListener('mhu-cube-validation', (event) => {
  event.detail.issues.forEach((issue) => {
    console.warn(issue.code, issue.path, issue.message);
  });
});
```

Both custom events bubble and are composed. Included declarations add event-detail types and map the `mhu-cube` tag to `MhuCube`.

Image and position validation codes, all warnings that leave the dataset available but unplotted unless noted:

| Code                               | Cause                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `item.image.unsafe`                | `image` is not a relative, HTTP, or HTTPS URL; the dataset is shown without it. |
| `item.position.missing`            | No `position` was supplied.                                                     |
| `item.position.invalid`            | `position` is not an object, or uses the retired `{ x, y, z }` index format.    |
| `item.position.time.invalid`       | `time` lacks finite `start` and `end`, or `start` is later than `end`.          |
| `item.position.time.out-of-range`  | `time` falls outside the time axis.                                             |
| `item.position.time.label.invalid` | `time.label` is empty; the dataset is still plotted with formatted values.      |
| `item.position.space.unknown`      | `space` does not exactly match a configured space value.                        |
| `item.position.organ.unknown`      | `organ` does not exactly match a configured organ value.                        |

Axis errors use `axes.invalid`, `axis.invalid`, `axis.label.invalid`, `axis.values.invalid`, `axis.value.invalid`, `axis.values.duplicate`, `axis.time.range.invalid`, `axis.time.ticks.invalid`, and `axis.time.unit.invalid`.

## Theming

The component first uses its public CSS custom properties, then matching Angular Material system tokens, then built-in fallbacks. The equivalent defaults are:

```css
mhu-cube {
  --mhu-cube-surface: var(--mat-sys-surface);
  --mhu-cube-surface-container: var(--mat-sys-surface-container);
  --mhu-cube-surface-container-lowest: var(--mat-sys-surface-container-lowest);
  --mhu-cube-on-surface: var(--mat-sys-on-surface);
  --mhu-cube-on-surface-variant: var(--mat-sys-on-surface-variant);
  --mhu-cube-primary: var(--mat-sys-primary);
  --mhu-cube-on-primary: var(--mat-sys-on-primary);
  --mhu-cube-primary-container: var(--mat-sys-primary-container);
  --mhu-cube-on-primary-container: var(--mat-sys-on-primary-container);
  --mhu-cube-outline: var(--mat-sys-outline);
  --mhu-cube-outline-variant: var(--mat-sys-outline-variant);
  --mhu-cube-focus: var(--mat-sys-primary);
}
```

Each public property feeds a private slot of the same name, such as `--_surface`, that the component's rules read. The slots are defined from the `$colors` map in `src/lib/styles/_host.scss`, so a new public color property is one map entry: `name: sys-token fallback`.

### Styles

The element renders into the light DOM rather than a shadow root, so its markup is part of the page and the site's stylesheets apply to it:

- Prefer the custom properties above and the Angular Material system tokens for color and type; they need no knowledge of the component's markup.
- To adjust anything else, add rules after the component stylesheet and scope them under the element, for example `mhu-cube .mhu-cube__intro-heading { … }`. The extra element selector outranks the component's own single-class rules.
- The `mhu-cube__*` classes follow BEM naming. They are stable but are not a versioned API, so keep overrides few and deliberate.
- Every component rule is scoped to `mhu-cube` or a `mhu-cube__*` class, so the stylesheet never styles the rest of the page. In the other direction, the site's global element rules, such as for `button`, `a`, or `h2`, also reach the component wherever it doesn't set that property itself.

Inside the component's own SCSS, custom properties go through the helpers in `_tokens.scss` rather than raw `var(--…)` reads, and text styles use the `typescale()` mixin from `_typography.scss`:

- `t.slot(name)`, `t.public-slot(name)`, and `t.sys-slot(token)` read a private slot (`--_name`), a public hook (`--mhu-cube-name`), or a Material system token (`--mat-sys-token`), each with an optional fallback. `t.custom-slot(name)` reads any other property, such as the `--cube-left` family the element sets inline or AtlasNG's `--ang-*` properties.
- `@include t.set(name, value)` defines a private slot, and `t.themeable-colors($colors)` defines the themeable color slots from the map in `_host.scss`.
- `@include typescale(role)` sets font-family, font-size, font-weight, line-height, and letter-spacing from a Material type scale role, with its Material 3 fallbacks. `typescale(role, 600)` replaces the weight token with an approved literal weight, and `typescale(role, false)` leaves the weight out. `typescale-slot(role, token)` reads a single token, such as `size`, for rules that only set part of a role.
- `styles/styles.spec.ts` fails if any other partial contains `var(--`, `--mhu-cube-`, or `--mat-sys-`, and `styles/tokens.spec.ts` checks the helpers' output.

The component intentionally has no quantitative color scale. Block height encodes the dataset's time range; block fill communicates interaction and availability states only, so consuming applications should not imply a data value from its intensity.

### Typography

The component consumes Angular Material system typography properties when the host defines them and uses matching Material 3 fallbacks otherwise. Every eyebrow, such as “Explore” above the heading and “Selected dataset” on the details card, uses one eyebrow style, `.mhu-cube__eyebrow`: `typescale(label-medium, 600)`, so `label-medium` with the approved 600 weight, uppercase, in the primary color. The desktop introduction uses `headline-large` for the heading, `body-large` for the dimension key, and `body-medium` for the attribution. Its lead paragraph matches AtlasNG's content paragraph (`ang-content-paragraph`): `body-large` scaled by `--ang-content-paragraph-size-multiplier` and `--ang-content-paragraph-line-height-multiplier`, 17/16 by default, so 17px on a 25.5px line with the Multiscale Human theme. The compact introduction uses `headline-medium` for the heading and `body-large` for its description. Introduction headings use their role-specific weight tokens with an approved 600-weight fallback, while dimension-key headers, eyebrows, and axis titles use the approved 600-weight treatment. Other roles defer to their M3 weight tokens, while the selected-dataset heading and stat terms retain their approved 500-weight treatment. Compact card titles, facts, and metadata labels use the card design's 600 weight. The desktop intro and selected-card column does not create an independent scroll region.

The host application owns font loading; the portal loads Roboto. Fonts are not runtime dependencies of the web component.

### Intro copy

The introduction copy is managed in `MHU_CUBE_INTRO_CONTENT` in `src/lib/content/intro-content.ts`. `heading` appears beside the desktop canvas and stays on one line, so keep it to about 28 characters at the default type size. `compactHeading` replaces it at `64rem` and below and may wrap, and `compactDescription` follows it as a one-sentence lead above the dataset cards. Above `64rem`, a compact, divider-separated dimension key with visual column headings explains space, time, and organ and includes selection guidance. Selecting a block replaces the dimension key and its headings with a closable dataset card in the same left-column position; closing it restores the key and returns focus to the selected block. The Metacube acknowledgment remains anchored to the bottom of the desktop content column in either state. At `64rem` and below, visualization-specific content is removed from the layout and accessibility tree, leaving the eyebrow, compact heading, and compact description above the dataset cards. The desktop and compact descriptions both name the number of datasets and teams in the sample data, so update both when the data changes.

The dimension key and dataset cards use semantic definition lists with subtle row separators. The selected desktop card uses the container surface; compact cards are described under [Dataset cards](#dataset-cards). The sample dataset titles use a consistent organ, space, and time sequence, like the metadata page titles, so datasets sharing a cell stay distinguishable; the component itself continues to display whatever label the host supplies.

The structured copy includes the desktop `heading` and `visualization` copy, a `compactHeading`, and a `compactDescription`. `eyebrow` and `compactDescription` are optional, and when absent they leave no empty element; `eyebrow` currently reads “Explore”.

Tests read the expected text from `src/lib/content/intro-content.ts`, so editing the copy doesn't require test changes. `content/intro-content.spec.ts` checks the copy's rules instead: every string has text and single spacing, the desktop heading has at most 28 characters, and when both descriptions state counts, they match. The browser harness also checks that the desktop heading fits its column.

The copy is internal configuration, not a public custom-element property. It can be exposed as host-provided copy if reuse requires that flexibility.

## Accessibility behavior

- Desktop blocks are native buttons with unique accessible names, descriptions, selected state, and a relationship to the persistent details region. Descriptions state the space, time, and organ position, such as “Space: 100 µm, Time: 7–47 years, Organ: Liver”.
- Only a block's painted faces receive pointer input, so a tall block's bounding box never intercepts clicks meant for a neighbor. Keyboard and reading order go alphabetically by organ, then by space and time.
- Keyboard activation moves focus directly to the selected dataset's metadata action. Pointer activation keeps focus on the block.
- Compact layouts remove the selection step. Each card's organ title is its one keyboard-reachable link; hidden space and time text leads its name, such as “100 µm, 7–47 years, Liver”, so cards that share an organ still have unique link names. The image link repeats it for pointer users and is removed from the tab order and accessibility tree, and its image has empty alternative text. The current dataset's link carries `aria-current="page"`.
- Visualization dimensions and card metadata use semantic definition lists.
- The introduction remains visible after desktop selection. The persistent details region replaces the dimension key with a semantically headed dataset card and announces selection changes politely. Closing the card restores the key and returns focus to the previously selected block.
- Current, unavailable, hover, focus, and selected states do not rely on color alone.
- Reduced-motion and Windows forced-colors preferences are supported.
- Axis text has an equivalent screen-reader summary; decorative SVG geometry is hidden from assistive technology.

These measures improve accessibility but are not a claim of formal WCAG conformance. Test the component with the supported browser and assistive-technology matrix before release.

## Development

Run the portal to see the component with the sample datasets:

```bash
npx nx serve portal
```

Open `http://localhost:4200`. Narrow the window below `64rem` to see the dataset cards, and use the browser's device emulation to try the touch interaction.

The sample datasets live in [`apps/portal/src/app/datasets/sample-datasets.ts`](../../apps/portal/src/app/datasets/sample-datasets.ts), and their square images are in `apps/portal/public/assets/datasets/`. They plot donor age from 0 to 100 years and display the space categories as `100 µm` and `100 mm`. These are sample data rather than hard-coded component defaults, and they use those values consistently in the axes, dataset headings, metadata, and accessible descriptions. The two Liver · 100 µm datasets (age 45 and ages 7–47) demonstrate lanes, and the infant Thymus dataset demonstrates a time label, the inward shift at the axis floor, a card image, and two corresponding authors. A single author is labeled “Corresponding author” and several “Corresponding authors”, and `compactMetadata` is set to both names. `hoverMetadata` is set to space, time, organ, and sex. So the selected dataset card shows everything, the hover card leaves out the authors, and the compact cards show only the authors.

Validate the library:

```bash
npx nx test mhu-cube
npx nx lint mhu-cube
npx nx build mhu-cube
```

jsdom can't check layout, so after changing the element, card, SVG, or style modules, also run the manual browser harness:

```bash
npx nx harness mhu-cube
```

Open the URL it prints. A passing harness changes the document title to `PASS — MHU cube browser tests`. Check keyboard use, zoom, light/dark themes, forced colors, widths on both sides of `64rem`, and the compact cards with both a mouse and a touch screen. Because hit testing relies on SVG `pointer-events`, also confirm clicks and hover cards in Firefox and Safari, and that lane blocks just above `64rem` remain comfortable pointer targets.

## Open questions

1. Where dataset configuration and metadata URLs will come from once the metadata pages exist.
2. Which supported-browser and assistive-technology matrix is required for release.
