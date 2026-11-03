// Copy assertions read the configured content, so editing it needs no test changes.
import { MHU_CUBE_INTRO_CONTENT } from '../../src/lib/content/intro-content';
import { assertAxisLabelsClear } from '../geometry';
import { assert, nextLayout, test, type HarnessContext } from '../runner';

/**
 * Checks the introduction, control semantics, axis labels, sizing, and light DOM rendering.
 * @param context - The shared component and its data.
 * @returns A promise that resolves after every check has run.
 */
export async function structureSuite({ component, fixture, positionedCount }: HarnessContext) {
  await test('desktop introduction explains the visualization with semantic dimensions', () => {
    const intro = component.querySelectorAll('.mhu-cube__intro');
    assert(intro.length === 1, 'The component should render one shared introduction.');
    assert(Boolean(intro[0].querySelector('.mhu-cube__intro-heading')), 'The introduction heading is missing.');
    const visualization = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-visualization');
    const wideHeading = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-heading-wide');
    const compactHeading = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-heading-compact');
    const compactDescription = intro[0].querySelector<HTMLElement>('.mhu-cube__intro-summary-compact');
    const { visualization: copy } = MHU_CUBE_INTRO_CONTENT;
    assert(
      visualization && getComputedStyle(visualization).display !== 'none',
      'Visualization guidance should be visible on desktop.',
    );
    assert(
      intro[0].querySelector('.mhu-cube__intro-eyebrow')?.textContent === MHU_CUBE_INTRO_CONTENT.eyebrow,
      'The introduction eyebrow is missing.',
    );
    assert(
      wideHeading?.textContent === MHU_CUBE_INTRO_CONTENT.heading && getComputedStyle(wideHeading).display !== 'none',
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
    const attribution = visualization.querySelector<HTMLElement>('.mhu-cube__intro-attribution');
    const links = [...(attribution?.querySelectorAll('a') ?? [])];
    // The Metacube destination is a requirement rather than editable copy, so it stays literal.
    assert(
      links.some(
        (link) => link.getAttribute('href') === 'https://github.com/Chair-for-Clinical-Bioinformatics/metacube',
      ),
      'Visualization attribution is missing.',
    );
    assert(
      attribution?.textContent ===
        copy.attribution.map((part) => (typeof part === 'string' ? part : part.text)).join(''),
      'Visualization attribution should credit the Metacube source.',
    );
    assert(
      links.map((link) => link.getAttribute('href')).join(',') ===
        copy.attribution.flatMap((part) => (typeof part === 'string' ? [] : [part.href])).join(','),
      'Visualization attribution links should match the copy.',
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

  await test('axis labels never overlap each other or the frame and stay inside the component', () => {
    assertAxisLabelsClear(component);
  });

  await test('the introduction and the plot reach the host edges, so they line up with the page content', async () => {
    if (!fixture) {
      throw new Error('Fixture container is missing.');
    }
    const intro = component.querySelector('.mhu-cube__content')?.getBoundingClientRect();
    assert(
      intro && Math.abs(intro.left - component.getBoundingClientRect().left) < 0.5,
      "The introduction should start at the host's left edge.",
    );
    // A wide, short component leaves the plot spare width, which belongs between the introduction and the plot.
    fixture.style.width = '72rem';
    await nextLayout();
    try {
      const stage = component.querySelector('.mhu-cube__stage')?.getBoundingClientRect();
      const plot = component.querySelector('.mhu-cube__plot')?.getBoundingClientRect();
      assert(
        stage && plot && plot.width < stage.width - 1,
        'A short component should leave spare width beside the plot.',
      );
      assert(
        Math.abs(plot.right - component.getBoundingClientRect().right) < 0.5,
        "The plot should end at the host's right edge.",
      );
    } finally {
      fixture.style.width = '';
      await nextLayout();
    }
  });

  await test('the graph fills the public height hook and the compact cards ignore it', async () => {
    if (!fixture) {
      throw new Error('Fixture container is missing.');
    }
    const graph = component.querySelector<HTMLElement>('.mhu-cube');
    const list = component.querySelector<HTMLElement>('.mhu-cube__list');
    assert(graph && list, 'The component layout is missing.');
    const hookHeight = 40 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    component.style.setProperty('--mhu-cube-graph-height', '40rem');
    await nextLayout();
    try {
      assert(
        Math.abs(graph.getBoundingClientRect().height - hookHeight) < 1 &&
          Math.abs(component.getBoundingClientRect().height - hookHeight) < 1,
        'The graph and its host should be as tall as the hook.',
      );
      fixture.style.width = '64rem';
      await nextLayout();
      const host = component.getBoundingClientRect();
      assert(
        Math.abs(host.height - graph.getBoundingClientRect().height) < 1 &&
          host.bottom >= list.getBoundingClientRect().bottom - 0.5,
        'At 64rem the cards should set the height and stay inside the host.',
      );
    } finally {
      component.style.removeProperty('--mhu-cube-graph-height');
      fixture.style.width = '';
      await nextLayout();
    }
  });

  await test('large plots step the axis labels up one type size and keep them clear', async () => {
    if (!fixture) {
      throw new Error('Fixture container is missing.');
    }
    const value = component.querySelector<HTMLElement>('.mhu-cube__axis-value');
    const size = () => (value ? parseFloat(getComputedStyle(value).fontSize) : NaN);
    const baseSize = size();
    component.style.setProperty('--mhu-cube-graph-height', '60rem');
    fixture.style.width = '95rem';
    await nextLayout();
    try {
      assert(size() > baseSize, 'Axis values should step up a type size on a large plot.');
      assertAxisLabelsClear(component);
    } finally {
      component.style.removeProperty('--mhu-cube-graph-height');
      fixture.style.width = '';
      await nextLayout();
    }
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
}
