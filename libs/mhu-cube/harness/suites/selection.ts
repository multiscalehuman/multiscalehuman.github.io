import { MHU_CUBE_SELECTION_EVENT, MHU_CUBE_VALIDATION_EVENT, type MhuCube, type MhuCubeItem } from '../../src/index';
import { assert, nextLayout, waitFor, test, type HarnessContext } from '../runner';

/**
 * Checks keyboard and pointer selection, the details card, selection events, and batched updates.
 * @param context - The shared component and its data.
 * @returns A promise that resolves after every check has run.
 */
export async function selectionSuite({ component, fixture, axes, items, positionedCount }: HarnessContext) {
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
}
