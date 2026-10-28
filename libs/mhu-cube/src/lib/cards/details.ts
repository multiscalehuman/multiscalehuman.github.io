import { h } from '../dom/create-element';
import { getMetadataEntries } from '../text/format';
import type { MhuCubeItem } from '../types';
import { createCloseIcon } from './icons';
import { createDestination, createMetadataList } from './metadata-list';

/**
 * Creates the persistent live region for desktop dataset details.
 * @param detailsId - Stable ID used by dataset controls to reference the panel.
 * @returns An empty live region populated after a dataset is selected.
 */
export function createDetails(detailsId: string): HTMLDivElement {
  return h('div', {
    className: 'mhu-cube__details',
    attrs: { id: detailsId, 'aria-live': 'polite', 'aria-atomic': 'true' },
  });
}

/**
 * Updates the mounted desktop details region after selection changes.
 * @param details - Stable details landmark whose content should be replaced.
 * @param item - Selected dataset, or null before a selection is made.
 * @param headingId - Stable ID used to label the details landmark.
 * @param closeDetails - Clears the current desktop selection.
 * @returns The updated details landmark.
 */
export function updateDetails(
  details: HTMLElement,
  item: MhuCubeItem | null,
  headingId: string,
  closeDetails: () => void,
): HTMLElement {
  details.replaceChildren();
  if (!item) {
    return details;
  }

  details.append(
    h('article', { className: 'mhu-cube__details-card', attrs: { 'aria-labelledby': headingId } }, [
      h('div', { className: 'mhu-cube__details-header' }, [
        h('div', {}, [
          h('p', { className: 'mhu-cube__eyebrow mhu-cube__details-eyebrow', text: 'Selected dataset' }),
          h('h3', { className: 'mhu-cube__details-heading', attrs: { id: headingId }, text: item.label }),
        ]),
        h(
          'button',
          {
            className: 'mhu-cube__details-close',
            attrs: { type: 'button', 'aria-label': 'Close dataset details' },
            on: { click: closeDetails },
          },
          [createCloseIcon()],
        ),
      ]),
      createMetadataList(getMetadataEntries(item)),
      createDestination(item, 'mhu-cube__details-action'),
    ]),
  );
  return details;
}
