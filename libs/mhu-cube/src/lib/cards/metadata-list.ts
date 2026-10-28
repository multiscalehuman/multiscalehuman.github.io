import { getAccessibleDatasetName } from '../text/accessible-text';
import { formatMetadataValue, getMetadataEntries, type MetadataEntry } from '../text/format';
import type { MhuCubeItem } from '../types';

/**
 * Builds the semantic metadata definition list shared by dataset cards.
 * @param entries - Metadata entries to display, in order.
 * @param className - Class for the list; each row gets the same class with a `-row` suffix.
 * @param listsOnSeparateLines - Whether list values get one description per entry instead of one comma-separated line.
 * @returns A grouped definition list, or null when there is nothing to display.
 */
export function createMetadataList(
  entries: MetadataEntry[],
  className = 'mhu-cube__details-metadata',
  listsOnSeparateLines = false,
): HTMLDListElement | null {
  if (entries.length === 0) {
    return null;
  }

  const metadata = document.createElement('dl');
  metadata.className = className;
  entries.forEach(([key, value]) => {
    const row = document.createElement('div');
    row.className = `${className}-row`;
    const term = document.createElement('dt');
    term.textContent = key;
    row.append(term);
    (Array.isArray(value) && listsOnSeparateLines ? value : [formatMetadataValue(value)]).forEach((entry) => {
      const description = document.createElement('dd');
      description.textContent = entry;
      row.append(description);
    });
    metadata.append(row);
  });
  return metadata;
}

/**
 * Explains that a dataset has no metadata destination.
 * @returns A noninteractive availability message.
 */
export function createUnavailableMessage(): HTMLParagraphElement {
  const unavailable = document.createElement('p');
  unavailable.className = 'mhu-cube__details-unavailable';
  unavailable.textContent = 'Metadata is not currently available for this dataset.';
  return unavailable;
}

/**
 * Builds the dataset destination or its unavailable-state message.
 * @param item - Dataset whose destination should be exposed.
 * @param actionClassName - CSS class applied when an actionable link is available.
 * @returns A direct link or a noninteractive availability message.
 */
export function createDestination(
  item: MhuCubeItem,
  actionClassName: string,
): HTMLAnchorElement | HTMLParagraphElement {
  const status = item.status ?? 'available';
  if (status === 'unavailable' || !item.href) {
    return createUnavailableMessage();
  }

  const action = document.createElement('a');
  action.className = actionClassName;
  action.href = item.href;
  action.setAttribute(
    'aria-label',
    `View metadata for ${getAccessibleDatasetName(item)}${status === 'current' ? ', current page' : ''}`,
  );
  action.textContent = 'View metadata';
  return action;
}

/**
 * Picks metadata entries by name, in the order named.
 * @param item - Dataset whose metadata should be displayed.
 * @param names - Metadata names, matched ignoring case and surrounding spaces.
 * @returns The matching entries.
 */
export function getNamedMetadataEntries(item: MhuCubeItem, names: string[]): MetadataEntry[] {
  const entries = getMetadataEntries(item);
  return names.flatMap((name) => entries.filter(([key]) => key.trim().toLowerCase() === name.toLowerCase()));
}
