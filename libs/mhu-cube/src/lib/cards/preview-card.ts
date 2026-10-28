import { formatMetadataValue, getMetadataEntries } from '../text/format';
import type { MhuCubeItem } from '../types';
import { getNamedMetadataEntries } from './metadata-list';

/**
 * Creates the transient preview shown beside a desktop cube.
 * @param item - Dataset represented by the cube.
 * @param hoverMetadata - Metadata names to show, or null for every entry.
 * @returns A presentation-only card containing safely escaped text nodes.
 */
export function createPreviewCard(item: MhuCubeItem, hoverMetadata: string[] | null = null) {
  const card = document.createElement('span');
  card.className = 'mhu-cube__card';
  card.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'mhu-cube__label';
  label.textContent = item.label;
  card.append(label);

  const entries = hoverMetadata ? getNamedMetadataEntries(item, hoverMetadata) : getMetadataEntries(item);
  if (entries.length > 0) {
    const metadata = document.createElement('span');
    metadata.className = 'mhu-cube__metadata';
    entries.forEach(([key, value]) => {
      const term = document.createElement('span');
      const description = document.createElement('span');
      term.className = 'mhu-cube__metadata-key';
      description.className = 'mhu-cube__metadata-value';
      term.textContent = key;
      description.textContent = formatMetadataValue(value);
      metadata.append(term, description);
    });
    card.append(metadata);
  }

  if (item.status === 'current' || item.status === 'unavailable') {
    const status = document.createElement('span');
    status.className = 'mhu-cube__status';
    status.textContent = item.status === 'current' ? 'Current page' : 'Unavailable';
    card.append(status);
  }
  return card;
}
