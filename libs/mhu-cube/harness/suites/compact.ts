// Copy assertions read the configured content, so editing it needs no test changes.
import { MHU_CUBE_INTRO_CONTENT } from '../../src/lib/content/intro-content';
import { assert, nextLayout, waitFor, test, type HarnessContext } from '../runner';

/**
 * Checks the compact layout: cards, their links and images, compact metadata, and column counts.
 * @param context - The shared component and its data.
 * @returns A promise that resolves after every check has run.
 */
export async function compactSuite({ component, fixture, items }: HarnessContext) {
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
      heading?.innerText.trim() === MHU_CUBE_INTRO_CONTENT.compactHeading,
      'Compact layouts should show only the compact heading.',
    );
    assert(
      visibleParagraphs.length === 1 &&
        visibleParagraphs[0].matches('.mhu-cube__intro-summary-compact') &&
        visibleParagraphs[0].textContent === MHU_CUBE_INTRO_CONTENT.compactDescription,
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
}
