import { assert, nextLayout, test, type HarnessContext } from '../runner';

/**
 * Checks hover metadata limits and how the selected dataset card shows list values.
 * @param context - The shared component and its data.
 * @returns A promise that resolves after every check has run.
 */
export async function metadataSuite({ component }: HarnessContext) {
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
      assert(
        values.join('|') === 'Author three, Co-author three',
        'List values should share one comma-separated line.',
      );
    } finally {
      component.selectedId = null;
      await nextLayout();
    }
  });
}
