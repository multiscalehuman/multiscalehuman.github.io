import { getMetadataEntries } from '../text/format';
import type { MhuCubeItem } from '../types';
import { createCloseIcon } from './icons';
import { createDestination, createMetadataList } from './metadata-list';

/**
 * Creates the persistent live region for desktop dataset details.
 * @param detailsId - Stable ID used by dataset controls to reference the panel.
 * @returns An empty live region populated after a dataset is selected.
 */
export function createDetails(detailsId: string) {
  const details = document.createElement('div');
  details.className = 'mhu-cube__details';
  details.id = detailsId;
  details.setAttribute('aria-live', 'polite');
  details.setAttribute('aria-atomic', 'true');
  return details;
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
) {
  details.replaceChildren();
  if (!item) {
    return details;
  }

  const card = document.createElement('article');
  card.className = 'mhu-cube__details-card';
  card.setAttribute('aria-labelledby', headingId);
  const header = document.createElement('div');
  header.className = 'mhu-cube__details-header';
  const title = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'mhu-cube__eyebrow mhu-cube__details-eyebrow';
  eyebrow.textContent = 'Selected dataset';
  const heading = document.createElement('h3');
  heading.className = 'mhu-cube__details-heading';
  heading.id = headingId;
  heading.textContent = item.label;
  const close = document.createElement('button');
  close.className = 'mhu-cube__details-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close dataset details');
  close.append(createCloseIcon());
  close.addEventListener('click', closeDetails);
  title.append(eyebrow, heading);
  header.append(title, close);
  card.append(header);

  const metadata = createMetadataList(getMetadataEntries(item));
  if (metadata) {
    card.append(metadata);
  }
  card.append(createDestination(item, 'mhu-cube__details-action'));
  details.append(card);
  return details;
}
