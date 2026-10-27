import {
  MHU_CUBE_SELECTION_EVENT,
  MHU_CUBE_VALIDATION_EVENT,
  MhuCube,
  defineMhuCube,
  type MhuCubeAxes,
  type MhuCubeItem,
} from '../src/index';
// Copy assertions read the configured copy, so editing it needs no test changes.
import { MHU_CUBE_INTRO_COPY } from '../src/lib/mhu-cube-copy';
// The element renders into the light DOM, so the page includes its styles.
import '../src/lib/mhu-cube.scss';

const axes: MhuCubeAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: ['small', 'large'] },
  // Deliberately unsorted; the component displays organs alphabetically.
  organ: { label: 'Organ', values: ['Liver', 'Heart'] },
};
// "two" spans a range and overlaps the single age in "three", so they share their cell in lanes.
// "one" points at a missing image to exercise the fallback; "two" adds a detail the visualization's cards show;
// "three" lists two authors.
const items: MhuCubeItem[] = [
  {
    id: 'one',
    label: 'Dataset one',
    href: '#one',
    image: './missing-image.png',
    metadata: { Organ: 'Heart', 'Lead author': 'Author one' },
    position: { time: { start: 20, end: 20 }, space: 'small', organ: 'Heart' },
  },
  {
    id: 'two',
    label: 'Dataset two',
    href: '#two',
    image: new URL('./dataset.svg', import.meta.url).href,
    metadata: { Organ: 'Liver', Sex: 'Female', 'Lead author': 'Author two' },
    position: { time: { start: 10, end: 60 }, space: 'large', organ: 'Liver' },
  },
  {
    id: 'three',
    label: 'Dataset three',
    href: '#three',
    metadata: { Organ: 'Liver', 'Lead author': ['Author three', 'Co-author three'] },
    position: { time: { start: 30, end: 30 }, space: 'large', organ: 'Liver' },
  },
  {
    id: 'unplotted',
    label: 'Dataset without coordinates',
    href: '#unplotted',
    metadata: { Organ: 'Heart', 'Lead author': 'Author four' },
  },
];
const positionedCount = items.filter((item) => item.position).length;

const results = document.querySelector<HTMLOListElement>('#results');
const fixture = document.querySelector<HTMLDivElement>('#fixture');
let failures = 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function nextLayout() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function waitFor(predicate: () => boolean, timeout = 1000) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout) {
      throw new Error('Timed out waiting for the component update.');
    }
    await nextLayout();
  }
}

async function test(name: string, callback: () => void | Promise<void>) {
  const result = document.createElement('li');
  try {
    await callback();
    result.className = 'pass';
    result.textContent = `Pass: ${name}`;
  } catch (error) {
    failures += 1;
    result.className = 'fail';
    result.textContent = `Fail: ${name} — ${error instanceof Error ? error.message : String(error)}`;
  }
  results?.append(result);
}

defineMhuCube();
const component = document.createElement('mhu-cube') as MhuCube;
fixture?.append(component);
component.axes = axes;
component.items = items;
await nextLayout();

await test('desktop introduction explains the visualization with semantic dimensions', () => {
  const intro = component.querySelectorAll('.mhu-cube__intro');
  assert(intro.length === 1, 'The component should render one shared introduction.');
  assert(Boolean(intro[0].querySelector('.mhu-cube__intro-heading')), 'The introduction heading is missing.');
  const visualization = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-visualization');
  const wideHeading = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-heading-wide');
  const compactHeading = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-heading-compact');
  const compactDescription = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-summary-compact');
  const { visualization: copy } = MHU_CUBE_INTRO_COPY;
  assert(
    visualization && getComputedStyle(visualization).display !== 'none',
    'Visualization guidance should be visible on desktop.',
  );
  assert(
    intro[0].querySelector('.mhu-cube__intro-eyebrow')?.textContent === MHU_CUBE_INTRO_COPY.eyebrow,
    'The introduction eyebrow is missing.',
  );
  assert(
    wideHeading?.textContent === MHU_CUBE_INTRO_COPY.heading && getComputedStyle(wideHeading).display !== 'none',
    'The desktop heading should be visible on desktop.',
  );
  // The desktop heading doesn't wrap, so a heading too long for its column would overflow into the visualization.
  assert(
    wideHeading.getBoundingClientRect().right <=
      (intro[0].querySelector('.mhu-cube__intro-heading')?.getBoundingClientRect().right ?? 0) + 0.5,
    'The desktop heading should fit on one line within the introduction column.',
  );
  assert(
    compactHeading && getComputedStyle(compactHeading).display === 'none',
    'The compact heading should be hidden on desktop.',
  );
  assert(
    compactDescription && getComputedStyle(compactDescription).display === 'none',
    'The compact description should be hidden on desktop.',
  );
  assert(
    visualization.querySelector('.mhu-cube__intro-summary')?.textContent === copy.description,
    'Visualization guidance should combine the comparison and selection instructions.',
  );
  const dimensionKey = visualization.querySelector<HTMLDListElement>('dl.mhu-cube__intro-dimensions');
  const dimensionHeadings = [...visualization.querySelectorAll('.mhu-cube__intro-dimensions-header span')].map(
    (heading) => heading.textContent,
  );
  const terms = [...(dimensionKey?.querySelectorAll('dt') ?? [])].map((term) => term.textContent);
  assert(
    dimensionHeadings.join(',') === copy.dimensionHeadings.join(','),
    'The dimension key should expose its visual column headings.',
  );
  assert(
    terms.join(',') === copy.dimensions.map((dimension) => dimension.term).join(','),
    'Visualization dimensions should use semantic terms.',
  );
  const attribution = visualization.querySelector<HTMLAnchorElement>('.mhu-cube__intro-attribution a');
  // The attribution destination is a requirement rather than editable copy, so it stays literal.
  assert(
    attribution?.getAttribute('href') === 'https://github.com/Chair-for-Clinical-Bioinformatics/metacube',
    'Visualization attribution is missing.',
  );
  assert(
    attribution?.parentElement?.textContent ===
      `${copy.attribution.beforeLink}${copy.attribution.linkText}${copy.attribution.afterLink}`,
    'Visualization attribution should credit the Metacube source.',
  );
});

await test('cube controls have unique names, descriptions, state, and details relationships', () => {
  const buttons = [...component.querySelectorAll<HTMLButtonElement>('.mhu-cube__select')];
  assert(buttons.length === positionedCount, 'Only positioned datasets should create cube controls.');
  assert(
    buttons.map((button) => button.dataset['itemId']).join(',') === 'one,two,three',
    'Controls should follow organ, space, then time order.',
  );
  buttons.forEach((button) => {
    const descriptionId = button.getAttribute('aria-describedby');
    const detailsId = button.getAttribute('aria-controls');
    assert(button.getAttribute('aria-label')?.startsWith('Select Dataset'), 'Control needs a dataset-specific name.');
    assert(
      descriptionId && document.getElementById(descriptionId)?.textContent?.includes('Metadata'),
      'Control needs dataset context.',
    );
    assert(detailsId && document.getElementById(detailsId), 'Control must reference the details panel.');
    assert(button.hasAttribute('aria-pressed'), 'Control must expose selection state.');
  });
});

await test('axes label space, time, and organ with organs in alphabetical order', () => {
  const labels = (selector: string) =>
    [...component.querySelectorAll(selector)].map((label) => label.textContent).join(',');
  assert(labels('.mhu-cube__axis-title--time') === 'Time (years)', 'The time axis title should append its unit.');
  assert(
    labels('.mhu-cube__axis-value--time') === '0,20,40,60,80,100',
    'The time axis should default to five equal steps.',
  );
  assert(labels('.mhu-cube__axis-value--space') === 'small,large', 'Space values should keep their supplied order.');
  assert(labels('.mhu-cube__axis-value--organ') === 'Heart,Liver', 'Organ values should be alphabetical.');
  assert(
    component.querySelector('.mhu-cube__frame-guide')?.getAttribute('d')?.split('M').length === 5,
    'Each interior tick needs a back-wall guide.',
  );
});

/**
 * Fails when any axis label overlaps another label or a frame edge, or spills outside the component.
 * @param root - The component element.
 * @returns Nothing.
 */
function assertAxisLabelsClear(root: ParentNode) {
  const labels = [...root.querySelectorAll<HTMLElement>('.mhu-cube__axis-title, .mhu-cube__axis-value')].map(
    (label) => ({ text: label.textContent, rect: label.getBoundingClientRect() }),
  );
  const frame = root.querySelector<SVGSVGElement>('.mhu-cube__frame');
  const numbers =
    frame
      ?.querySelector('.mhu-cube__frame-line')
      ?.getAttribute('d')
      ?.match(/-?[\d.]+/g)
      ?.map(Number) ?? [];
  assert(frame && numbers.length === 48, 'The frame should draw twelve edges.');
  const bounds = frame.getBoundingClientRect();
  const toScreen = (x: number, y: number) => ({
    x: bounds.left + (x / 100) * bounds.width,
    y: bounds.top + (y / 100) * bounds.height,
  });
  const edges = Array.from({ length: 12 }, (_, index) => [
    toScreen(numbers[index * 4], numbers[index * 4 + 1]),
    toScreen(numbers[index * 4 + 2], numbers[index * 4 + 3]),
  ]);
  const crossesEdge = (rect: DOMRect) =>
    edges.some(([start, end]) =>
      Array.from({ length: 101 }, (_, step) => step / 100).some((t) => {
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;
      }),
    );
  const host = component.getBoundingClientRect();
  const plot = root.querySelector('.mhu-cube__plot')?.getBoundingClientRect();
  assert(plot, 'The plot is missing.');
  labels.forEach(({ text, rect }, index) => {
    assert(!crossesEdge(rect), `Axis label “${text}” overlaps the frame.`);
    assert(
      rect.left >= host.left && rect.right <= host.right && rect.bottom <= host.bottom,
      `Axis label “${text}” spills outside the component.`,
    );
    assert(rect.left >= plot.left, `Axis label “${text}” reaches past the plot toward the introduction.`);
    labels.slice(index + 1).forEach((other) => {
      const overlaps =
        rect.left < other.rect.right &&
        other.rect.left < rect.right &&
        rect.top < other.rect.bottom &&
        other.rect.top < rect.bottom;
      assert(!overlaps, `Axis labels “${text}” and “${other.text}” overlap.`);
    });
  });
}

await test('axis labels never overlap each other or the frame and stay inside the component', () => {
  assertAxisLabelsClear(component);
});

await test('the plot faces the organs with their labels in one row below the front edge', () => {
  const organLabels = [...component.querySelectorAll<HTMLElement>('.mhu-cube__axis-value--organ')].map((label) =>
    label.getBoundingClientRect(),
  );
  assert(
    organLabels.length === 2 && Math.abs(organLabels[0].top - organLabels[1].top) < 1,
    'Organ labels should share one level row below the front edge.',
  );
  assert(organLabels[0].left < organLabels[1].left, 'Organs should run left to right in alphabetical order.');
});

await test('the component renders into the light DOM so page stylesheets reach its parts', () => {
  assert(component.shadowRoot === null, 'The component should not attach a shadow root.');
  const heading = component.querySelector<HTMLElement>('.mhu-cube__intro-heading');
  assert(heading, 'The introduction heading is missing.');
  const override = document.createElement('style');
  override.textContent = '.mhu-cube__intro-heading { color: rgb(1, 2, 3); }';
  document.head.append(override);
  try {
    assert(
      getComputedStyle(heading).color === 'rgb(1, 2, 3)',
      "A later page rule should restyle the component's parts.",
    );
  } finally {
    override.remove();
  }
});

await test('block descriptions state the space, time, and organ position', () => {
  const button = component.querySelector<HTMLButtonElement>('[data-item-id="two"]');
  const descriptionId = button?.getAttribute('aria-describedby');
  const description = descriptionId ? document.getElementById(descriptionId)?.textContent : undefined;
  assert(
    description?.includes('Visualization position: Space: large, Time: 10–60 years, Organ: Liver'),
    'Descriptions should name each axis with its value.',
  );
});

await test('time ranges draw taller blocks and overlapping ranges split their cell into lanes', () => {
  const block = (id: string) =>
    component.querySelector<SVGSVGElement>(`[data-item-id="${id}"] .mhu-cube__cube`)?.getBoundingClientRect();
  const single = block('one');
  const range = block('two');
  const overlapping = block('three');
  assert(single && range && overlapping, 'Fixture blocks are missing.');
  assert(range.height > overlapping.height, 'A longer time range should draw a taller block.');
  assert(overlapping.width < single.width, 'Overlapping datasets should narrow into lanes.');
});

await test('blocks cast floor shadows and reveal their exact time span when selected', async () => {
  const marker = () => {
    const element = component.querySelector<SVGGElement>('[data-item-id="two"] .mhu-cube__time-marker');
    assert(element, 'Dataset two needs a time marker.');
    return element;
  };
  assert(
    [...component.querySelectorAll('.mhu-cube__select')].every((button) =>
      button.querySelector('.mhu-cube__shadow .mhu-cube__shadow-floor'),
    ),
    'Every block needs a floor footprint.',
  );
  assert(
    component.querySelector('[data-item-id="one"] .mhu-cube__shadow-drop'),
    'A raised block needs drop lines to its footprint.',
  );
  assert(getComputedStyle(marker()).opacity === '0', 'Age markers should stay hidden until a block is active.');

  component.selectedId = 'two';
  await waitFor(() => getComputedStyle(marker()).opacity === '1');
  const bracket = component
    .querySelector<SVGPathElement>('[data-item-id="two"] .mhu-cube__time-bracket')
    ?.getBoundingClientRect();
  const tickCenter = (text: string) => {
    const label = [...component.querySelectorAll<HTMLElement>('.mhu-cube__axis-value--time')].find(
      (tick) => tick.textContent === text,
    );
    const rect = label?.getBoundingClientRect();
    return rect ? rect.top + rect.height / 2 : NaN;
  };
  const axisHeight = tickCenter('0') - tickCenter('100');
  assert(bracket && axisHeight > 0, 'The time bracket and axis ticks are missing.');
  // The fixture's "two" spans 10–60 years, half of the 0–100 axis.
  assert(
    Math.abs(bracket.height / axisHeight - 0.5) < 0.05,
    "The bracket should span the dataset's exact time range on the axis.",
  );
  component.selectedId = null;
  await nextLayout();
});

await test('pointer input follows painted faces rather than block bounding boxes', async () => {
  // The bounding box of a short front-row block reaches over the tall back-row block behind it. Where only the
  // back block is painted, the pointer must reach it rather than the empty corner of the block in front.
  const overlapComponent = document.createElement('mhu-cube') as MhuCube;
  fixture?.append(overlapComponent);
  overlapComponent.axes = axes;
  overlapComponent.items = [
    {
      id: 'back',
      label: 'Back',
      href: '#back',
      position: { time: { start: 10, end: 90 }, space: 'small', organ: 'Heart' },
    },
    {
      id: 'front',
      label: 'Front',
      href: '#front',
      position: { time: { start: 50, end: 50 }, space: 'large', organ: 'Heart' },
    },
  ];
  await nextLayout();
  try {
    const front = overlapComponent.querySelector<HTMLButtonElement>('[data-item-id="front"]');
    const faces = (id: string) => [
      ...overlapComponent.querySelectorAll<SVGPolygonElement>(`[data-item-id="${id}"] .mhu-cube__cube polygon`),
    ];
    const paints = (id: string, x: number, y: number) =>
      faces(id).some((face) => {
        const matrix = face.getScreenCTM()?.inverse();
        const point = face.ownerSVGElement?.createSVGPoint();
        if (!matrix || !point) {
          return false;
        }
        point.x = x;
        point.y = y;
        return face.isPointInFill(point.matrixTransform(matrix));
      });
    assert(front && faces('front').length === 3 && faces('back').length === 3, 'Fixture blocks are missing.');
    front.scrollIntoView({ block: 'center' });
    await nextLayout();
    const box = front.getBoundingClientRect();
    let probe: { x: number; y: number } | undefined;
    for (let y = Math.ceil(box.top) + 0.5; y < box.bottom && !probe; y += 1) {
      for (let x = Math.ceil(box.left) + 0.5; x < box.right && !probe; x += 1) {
        if (!paints('front', x, y) && paints('back', x, y)) {
          probe = { x, y };
        }
      }
    }
    assert(probe, "Fixture should paint the back block inside the front block's bounding box.");
    const target = document.elementFromPoint(probe.x, probe.y)?.closest<HTMLButtonElement>('button');
    assert(
      target?.dataset['itemId'] === 'back',
      'The visible back block should receive the pointer, not the block in front.',
    );
  } finally {
    overlapComponent.remove();
  }
});

await test('keyboard activation focuses the action and keeps the live region mounted', async () => {
  const details = component.querySelector<HTMLElement>('.mhu-cube__details');
  const button = component.querySelector<HTMLButtonElement>('.mhu-cube__select');
  assert(details && button, 'Fixture is missing interaction elements.');
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
  await waitFor(() => Boolean(component.querySelector('.mhu-cube__details-action')));
  const action = component.querySelector<HTMLAnchorElement>('.mhu-cube__details-action');
  assert(component.querySelector('.mhu-cube__details') === details, 'Live region was replaced.');
  assert(document.activeElement === action, 'Keyboard selection did not move focus to the metadata action.');
  assert(
    action?.getAttribute('aria-label') === 'View metadata for Dataset one; Organ: Heart, Lead author: Author one',
    'Action name does not identify its dataset and metadata.',
  );
});

await test('desktop selection swaps the dimension key for a closable dataset card', async () => {
  const section = component.querySelector<HTMLElement>('.mhu-cube');
  const intro = component.querySelector<HTMLElement>('.mhu-cube__intro');
  const details = component.querySelector<HTMLElement>('.mhu-cube__details');
  const dimensionKey = component.querySelector<HTMLElement>('.mhu-cube__intro-dimensions');
  const dimensionHeader = component.querySelector<HTMLElement>('.mhu-cube__intro-dimensions-header');
  const button = component.querySelectorAll<HTMLButtonElement>('.mhu-cube__select')[1];
  assert(
    section && intro && details && dimensionKey && dimensionHeader && button,
    'Fixture is missing desktop layout elements.',
  );
  assert(
    getComputedStyle(section).gridTemplateAreas.includes('content stage'),
    'Desktop content should precede the visualization.',
  );
  button.click();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    assert(details.getAnimations().length > 0, 'Detail card should animate after selection.');
  }
  await waitFor(() => details.querySelector('.mhu-cube__details-heading')?.textContent === 'Dataset two');
  assert(intro.isConnected, 'Selecting a dataset should not replace the introduction.');
  assert(
    details.parentElement?.classList.contains('mhu-cube__intro-visualization'),
    'Details should occupy the dimension key region.',
  );
  assert(
    getComputedStyle(dimensionHeader).display === 'none',
    'The dimension headings should be hidden while details are open.',
  );
  assert(
    getComputedStyle(dimensionKey).display === 'none',
    'The dimension key should be hidden while details are open.',
  );
  assert(
    details.querySelector('h3.mhu-cube__details-heading'),
    'The selected dataset title should be a level-three heading.',
  );
  assert(
    Boolean(details.querySelector('.mhu-cube__details-card')),
    'Selection should render a dataset card in the introduction.',
  );
  const metadata = details.querySelector('dl.mhu-cube__details-metadata');
  const metadataTerms = [...(metadata?.querySelectorAll('dt') ?? [])].map((term) => term.textContent);
  assert(
    metadata && metadataTerms.join(',') === 'Organ,Sex,Lead author',
    'Selected metadata needs semantic labels for every detail.',
  );
  const hoverCard = button.querySelector('.mhu-cube__card');
  assert(hoverCard?.textContent?.includes('SexFemale'), 'The hover preview card should show every detail.');
  let clearedItem: MhuCubeItem | null | undefined;
  component.addEventListener(
    MHU_CUBE_SELECTION_EVENT,
    (event) => {
      clearedItem = event.detail.item;
    },
    { once: true },
  );
  const close = details.querySelector<HTMLButtonElement>('.mhu-cube__details-close');
  assert(
    close?.getAttribute('aria-label') === 'Close dataset details',
    'The details card needs an accessible close button.',
  );
  const closeIcon = close.querySelector('svg.mhu-cube__details-close-icon');
  assert(
    closeIcon?.getAttribute('fill') === 'currentColor' && closeIcon.getAttribute('aria-hidden') === 'true',
    'The close icon should inherit the on-surface color and remain decorative.',
  );
  close.click();
  assert(
    component.selectedId === null && clearedItem === null,
    'Closing details should clear and report the selection.',
  );
  assert(details.childElementCount === 0, 'Closing details should clear the persistent details region.');
  assert(
    getComputedStyle(dimensionHeader).display === 'grid',
    'Closing details should restore the dimension headings.',
  );
  assert(getComputedStyle(dimensionKey).display === 'block', 'Closing details should restore the dimension key.');
  assert(document.activeElement === button, 'Closing details should return focus to the previously selected cube.');
  assert(
    [...component.querySelectorAll('.mhu-cube__select')].every(
      (control) => control.getAttribute('aria-pressed') === 'false',
    ),
    'Closing details should clear every pressed state.',
  );
});

await test('pointer selection retains the cube control focus', () => {
  const button = component.querySelectorAll<HTMLButtonElement>('.mhu-cube__select')[1];
  button.focus();
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  assert(document.activeElement === button, 'Pointer selection moved focus unexpectedly.');
});

await test('selection events bubble out of the component with the selected item', () => {
  let selectedId: string | undefined;
  component.addEventListener(
    MHU_CUBE_SELECTION_EVENT,
    (event) => {
      selectedId = (event as CustomEvent<{ item: MhuCubeItem | null }>).detail.item?.id;
    },
    { once: true },
  );
  component.querySelector<HTMLButtonElement>('.mhu-cube__select')?.click();
  assert(selectedId === 'one', 'Selection event detail was not exposed.');
});

await test('unpositioned datasets remain selectable without a fabricated cube', () => {
  const button = component.querySelector<HTMLButtonElement>('.mhu-cube__unpositioned-button');
  assert(
    button?.textContent === 'Dataset without coordinates',
    'Unpositioned dataset is missing from the desktop fallback.',
  );
  assert(
    component.validationIssues.some((issue) => issue.code === 'item.position.missing'),
    'Missing position was not reported.',
  );
});

await test('synchronous Angular-style property updates render and report once', async () => {
  const batchedComponent = document.createElement('mhu-cube') as MhuCube;
  let validationEventCount = 0;
  let reportedIssueCodes: string[] = [];
  batchedComponent.addEventListener(MHU_CUBE_VALIDATION_EVENT, (event) => {
    validationEventCount += 1;
    reportedIssueCodes = event.detail.issues.map((issue) => issue.code);
  });
  fixture?.append(batchedComponent);
  batchedComponent.items = items;
  batchedComponent.axes = axes;
  await nextLayout();
  assert(validationEventCount === 1, 'Synchronous property updates should emit one final validation result.');
  assert(
    !reportedIssueCodes.some((code) => code.endsWith('.unknown') || code === 'item.position.time.out-of-range'),
    'Validation reported a transient axes-order issue.',
  );
  assert(
    batchedComponent.querySelectorAll('.mhu-cube__select').length === positionedCount,
    'Final property values were not rendered.',
  );
  batchedComponent.remove();
});

await test('hover metadata limits the hover card without changing the selected dataset card', async () => {
  const hoverTerms = () =>
    [
      ...([...component.querySelectorAll<HTMLButtonElement>('.mhu-cube__select')]
        .find((button) => button.dataset['itemId'] === 'two')
        ?.querySelectorAll('.mhu-cube__metadata-key') ?? []),
    ]
      .map((term) => term.textContent)
      .join(',');
  try {
    component.hoverMetadata = ['sex', 'Organ'];
    component.selectedId = 'two';
    await nextLayout();
    assert(
      hoverTerms() === 'Sex,Organ',
      'The hover card should show only the named metadata, in order, matched ignoring case.',
    );
    const detailTerms = [...component.querySelectorAll('.mhu-cube__details-metadata dt')]
      .map((term) => term.textContent)
      .join(',');
    assert(detailTerms === 'Organ,Sex,Lead author', 'The selected dataset card keeps every detail.');
    assert(
      document
        .getElementById(
          [...component.querySelectorAll<HTMLButtonElement>('.mhu-cube__select')]
            .find((button) => button.dataset['itemId'] === 'two')
            ?.getAttribute('aria-describedby') ?? '',
        )
        ?.textContent?.includes('Lead author: Author two'),
      'Block descriptions keep every detail for assistive technology.',
    );
    component.setAttribute('hover-metadata', 'Sex');
    await nextLayout();
    assert(
      component.hoverMetadata === null && hoverTerms() === 'Organ,Sex,Lead author',
      'Invalid values fall back to every detail.',
    );
    assert(
      component.validationIssues.some((issue) => issue.code === 'hover-metadata.invalid'),
      'Invalid values should be reported.',
    );
  } finally {
    component.removeAttribute('hover-metadata');
    component.selectedId = null;
    await nextLayout();
  }
});

await test('the selected dataset card joins list values with commas', async () => {
  component.selectedId = 'three';
  await nextLayout();
  try {
    const row = [...component.querySelectorAll('.mhu-cube__details-metadata-row')].find(
      (candidate) => candidate.querySelector('dt')?.textContent === 'Lead author',
    );
    const values = [...(row?.querySelectorAll('dd') ?? [])].map((value) => value.textContent);
    assert(values.join('|') === 'Author three, Co-author three', 'List values should share one comma-separated line.');
  } finally {
    component.selectedId = null;
    await nextLayout();
  }
});

await test('compact mode exposes direct cards and removes the selection step', async () => {
  if (!fixture) {
    throw new Error('Fixture container is missing.');
  }
  fixture.style.width = '50rem';
  await nextLayout();
  const select = component.querySelector<HTMLElement>('.mhu-cube__select');
  const details = component.querySelector<HTMLElement>('.mhu-cube__details');
  const cards = [...component.querySelectorAll<HTMLElement>('.mhu-cube__compact-card')];
  const visualization = component.querySelector<HTMLElement>('.mhu-cube__intro-visualization');
  const heading = component.querySelector<HTMLElement>('.mhu-cube__intro-heading');
  const visibleParagraphs = [
    ...component.querySelectorAll<HTMLElement>('.mhu-cube__intro p:not(.mhu-cube__intro-eyebrow)'),
  ].filter((paragraph) => paragraph.offsetParent !== null);
  assert(select && getComputedStyle(select).display === 'none', 'Cube selection remains exposed in compact mode.');
  assert(details && getComputedStyle(details).display === 'none', 'Desktop details remain exposed in compact mode.');
  assert(
    visualization && getComputedStyle(visualization).display === 'none',
    'Visualization guidance remains exposed in compact mode.',
  );
  assert(
    heading?.innerText.trim() === MHU_CUBE_INTRO_COPY.compactHeading,
    'Compact layouts should show only the compact heading.',
  );
  assert(
    visibleParagraphs.length === 1 &&
      visibleParagraphs[0].matches('.mhu-cube__intro-summary-compact') &&
      visibleParagraphs[0].textContent === MHU_CUBE_INTRO_COPY.compactDescription,
    'Compact layouts should show only the compact description below the heading.',
  );
  assert(
    cards.length === items.length && cards.every((card) => getComputedStyle(card).display === 'flex'),
    'Every dataset needs a compact card.',
  );
});

await test('compact cards show the image, space and time, the organ title, and the remaining metadata', async () => {
  const cards = [...component.querySelectorAll<HTMLElement>('.mhu-cube__compact-card')];
  const card = (id: string) =>
    cards.find(
      (candidate) =>
        candidate.querySelector<HTMLAnchorElement>('.mhu-cube__compact-link')?.getAttribute('href') === `#${id}`,
    );
  const terms = (element: Element | undefined, selector: string) =>
    [...(element?.querySelectorAll(selector) ?? [])].map((term) => term.textContent).join(',');
  cards.forEach((candidate) => {
    const media = candidate.querySelector<HTMLAnchorElement>('a.mhu-cube__compact-media');
    const link = candidate.querySelector<HTMLAnchorElement>('h3 > a.mhu-cube__compact-link');
    assert(candidate.firstElementChild === media, 'The image should lead the card.');
    assert(
      link && media?.getAttribute('href') === link.getAttribute('href'),
      'The image and title should open the same metadata page.',
    );
    assert(
      media.tabIndex === -1 && media.getAttribute('aria-hidden') === 'true',
      'The image link repeats the title link and should stay out of the tab order.',
    );
  });
  const linkNames = cards.map((candidate) => candidate.querySelector('.mhu-cube__compact-link')?.textContent);
  assert(
    new Set(linkNames).size === items.length,
    'Title links need unique accessible names, even when organs repeat.',
  );
  assert(
    card('two')?.querySelector('.mhu-cube__compact-link')?.textContent === 'large, 10–60 years, Liver',
    'Titles show the organ, with space and time leading the link name.',
  );
  assert(
    terms(card('two'), '.mhu-cube__compact-facts dt') === 'Space,Time' &&
      terms(card('two'), '.mhu-cube__compact-facts dd') === 'large,10–60 years',
    'Facts should list space, then time.',
  );
  assert(
    terms(card('two'), '.mhu-cube__compact-details dt') === 'Sex,Lead author',
    'Metadata already shown as facts or the title should not repeat.',
  );
  assert(
    terms(card('three'), '.mhu-cube__compact-details dd') === 'Author three,Co-author three',
    'List values should show one entry per line.',
  );
  assert(
    card('unplotted')?.querySelector('.mhu-cube__compact-link')?.textContent === 'Dataset without coordinates' &&
      !card('unplotted')?.querySelector('.mhu-cube__compact-facts'),
    'Unplotted datasets fall back to their label and full metadata.',
  );

  const image = card('two')?.querySelector<HTMLImageElement>('.mhu-cube__compact-image');
  assert(image?.getAttribute('alt') === '', 'The image is decorative inside a hidden link.');
  await waitFor(() => image.complete && !card('one')?.querySelector('.mhu-cube__compact-image'), 3000);
  assert(image.naturalWidth > 0, 'The dataset image should load.');
  const media = card('two')?.querySelector<HTMLElement>('.mhu-cube__compact-media');
  assert(media && getComputedStyle(media).aspectRatio === '1 / 1', 'The image container should be square.');
});

await test('touch screens open the dataset from anywhere on the card; mice use the image and title', async () => {
  const card = component.querySelector<HTMLElement>('.mhu-cube__compact-card');
  const link = card?.querySelector<HTMLAnchorElement>('.mhu-cube__compact-link');
  const media = card?.querySelector<HTMLAnchorElement>('.mhu-cube__compact-media');
  const details = card?.querySelector<HTMLElement>('.mhu-cube__compact-details');
  assert(card && link && media && details, 'The first card is incomplete.');
  card.scrollIntoView({ block: 'center' });
  await nextLayout();
  const at = (element: Element, x = 0.5) => {
    const bounds = element.getBoundingClientRect();
    return document
      .elementFromPoint(bounds.left + Math.max(2, bounds.width * x), bounds.top + bounds.height / 2)
      ?.closest('a');
  };
  assert(at(link, 0.1) === link, 'The title should open the metadata page.');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    assert(at(media) === media, 'With a mouse, the image should open the metadata page.');
    assert(!at(details, 0.02), 'With a mouse, the rest of the card should not be a link.');
  } else {
    assert(
      at(media) === link && at(details, 0.02) === link,
      'On touch screens, the whole card should open the metadata page.',
    );
  }
});

await test("compact metadata limits the details on compact cards without changing the visualization's cards", async () => {
  const terms = () => {
    const card = [...component.querySelectorAll('.mhu-cube__compact-card')].find(
      (candidate) => candidate.querySelector('.mhu-cube__compact-link')?.getAttribute('href') === '#two',
    );
    return [...(card?.querySelectorAll('.mhu-cube__compact-details dt') ?? [])]
      .map((term) => term.textContent)
      .join(',');
  };
  try {
    component.compactMetadata = [' lead AUTHOR '];
    await nextLayout();
    assert(terms() === 'Lead author', 'Compact cards should show only the named metadata, matched ignoring case.');
    assert(
      component.querySelector('.mhu-cube__card')?.textContent?.includes('Lead author'),
      'Hover cards keep every detail.',
    );
    component.setAttribute('compact-metadata', '{not json');
    await nextLayout();
    assert(
      component.compactMetadata === null && terms() === 'Sex,Lead author',
      'Invalid values fall back to every remaining detail.',
    );
    assert(
      component.validationIssues.some((issue) => issue.code === 'compact-metadata.invalid'),
      'Invalid values should be reported.',
    );
    component.setAttribute('compact-metadata', JSON.stringify(['Sex']));
    await nextLayout();
    assert(terms() === 'Sex', 'The JSON attribute should set the names.');
  } finally {
    component.removeAttribute('compact-metadata');
    await nextLayout();
  }
  assert(
    component.compactMetadata === null && terms() === 'Sex,Lead author',
    'Removing the attribute should restore the default.',
  );
});

await test('compact cards fit as many designed-width columns as the component allows', async () => {
  if (!fixture) {
    throw new Error('Fixture container is missing.');
  }
  const list = component.querySelector<HTMLElement>('.mhu-cube__list');
  const columns = () => (list ? getComputedStyle(list).gridTemplateColumns.split(' ').length : 0);
  fixture.style.width = '64rem';
  await nextLayout();
  assert(columns() === 3, 'A 64rem component should fit three cards per row.');
  fixture.style.width = '30rem';
  await nextLayout();
  assert(columns() === 1, 'A 30rem component should use one column.');
});

await test('malformed JSON attributes expose validation issues instead of retaining stale data', async () => {
  const invalidComponent = document.createElement('mhu-cube') as MhuCube;
  invalidComponent.setAttribute('axes', JSON.stringify(axes));
  invalidComponent.setAttribute('items', '{invalid');
  let reportedIssueCode: string | undefined;
  fixture?.addEventListener(
    MHU_CUBE_VALIDATION_EVENT,
    (event) => {
      reportedIssueCode = event.detail.issues[0]?.code;
    },
    { once: true },
  );
  fixture?.append(invalidComponent);
  await nextLayout();
  assert(invalidComponent.items.length === 0, 'Malformed item data should not render stale datasets.');
  assert(
    invalidComponent.validationIssues.some((issue) => issue.code === 'items.json.invalid'),
    'Malformed JSON should be reported.',
  );
  assert(reportedIssueCode === 'items.json.invalid', 'Validation event must cross the component boundary.');
  invalidComponent.remove();
});

await test('incomplete axes replace the empty frame with a useful fallback', async () => {
  const invalidAxesComponent = document.createElement('mhu-cube') as MhuCube;
  invalidAxesComponent.setAttribute('axes', JSON.stringify({ ...axes, space: { label: 'Space', values: [] } }));
  invalidAxesComponent.setAttribute('items', JSON.stringify([items[0]]));
  fixture?.append(invalidAxesComponent);
  await nextLayout();
  assert(
    invalidAxesComponent.querySelector('.mhu-cube__plot-unavailable'),
    'Incomplete axes need a visible fallback message.',
  );
  assert(
    invalidAxesComponent.querySelector('.mhu-cube__unpositioned-button'),
    'Dataset should remain available outside the plot.',
  );
  invalidAxesComponent.remove();
});

document.title = failures === 0 ? 'PASS — MHU cube browser tests' : `FAIL (${failures}) — MHU cube browser tests`;
