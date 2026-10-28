import { formatTimeRange, getMetadataEntries } from '../text/format';
import type { MhuCubeAxes, MhuCubeItem } from '../types';
import { canPlotAxes } from '../validation/axes';
import { getRemainingMetadataEntries } from './details';
import { createMetadataList, createUnavailableMessage, getNamedMetadataEntries } from './metadata-list';

/**
 * Chooses the metadata a compact card shows below its title.
 * @param item - Dataset represented by the card.
 * @param axes - Validated axes whose labels identify entries the card already shows.
 * @param hasPosition - Whether the card shows space, time, and organ itself.
 * @param compactMetadata - Names to show in order, matched ignoring case, or null for every remaining entry.
 * @returns The entries to display.
 */
export function getCompactMetadataEntries(
  item: MhuCubeItem,
  axes: MhuCubeAxes,
  hasPosition: boolean,
  compactMetadata: string[] | null,
) {
  if (!compactMetadata) {
    return hasPosition ? getRemainingMetadataEntries(item, axes) : getMetadataEntries(item);
  }
  return getNamedMetadataEntries(item, compactMetadata);
}

/**
 * Creates a self-contained dataset card for layouts without the cube canvas: a square image, space and time,
 * the organ as the title, and the chosen metadata. The image and title both open the metadata page; with a
 * touch screen, the title link stretches over the whole card.
 * @param item - Dataset represented by the card.
 * @param axes - Validated axes used for dimension labels and the time unit.
 * @param compactMetadata - Metadata names to show, or null for every entry the card does not already show.
 * @returns A card whose links share the dataset's metadata destination.
 */
export function createCompactCard(item: MhuCubeItem, axes: MhuCubeAxes, compactMetadata: string[] | null = null) {
  const card = document.createElement('article');
  card.className = 'mhu-cube__compact-card';
  const status = item.status ?? 'available';
  const href = status === 'unavailable' ? undefined : item.href;
  const position = canPlotAxes(axes) ? item.position : undefined;

  // The image repeats the title link for pointer users, so it stays out of the tab order and accessibility tree.
  const media = document.createElement(href ? 'a' : 'div');
  media.className = 'mhu-cube__compact-media';
  if (media instanceof HTMLAnchorElement && href) {
    media.href = href;
    media.tabIndex = -1;
    media.setAttribute('aria-hidden', 'true');
  }
  if (item.image) {
    const image = document.createElement('img');
    image.className = 'mhu-cube__compact-image';
    image.src = item.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), { once: true });
    media.append(image);
  }

  const body = document.createElement('div');
  body.className = 'mhu-cube__compact-body';
  if (position) {
    const facts = document.createElement('dl');
    facts.className = 'mhu-cube__compact-facts';
    [
      [axes.space.label, position.space],
      [axes.time.label, formatTimeRange(position.time, axes.time)],
    ].forEach(([label, value]) => {
      const fact = document.createElement('div');
      fact.className = 'mhu-cube__compact-fact';
      const term = document.createElement('dt');
      term.className = 'mhu-cube__sr-only';
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      fact.append(term, description);
      facts.append(fact);
    });
    body.append(facts);
  }

  const heading = document.createElement('h3');
  heading.className = 'mhu-cube__compact-heading';
  const title = position?.organ ?? item.label;
  if (href) {
    const link = document.createElement('a');
    link.className = 'mhu-cube__compact-link';
    link.href = href;
    link.textContent = title;
    if (status === 'current') {
      link.setAttribute('aria-current', 'page');
    }
    // Several datasets share an organ, so hidden space and time text leads each link's name, in the card's visual order.
    if (position) {
      const context = document.createElement('span');
      context.className = 'mhu-cube__sr-only';
      context.textContent = `${position.space}, ${formatTimeRange(position.time, axes.time)}, `;
      link.prepend(context);
    }
    heading.append(link);
  } else {
    heading.textContent = title;
  }
  body.append(heading);

  if (status === 'current') {
    const badge = document.createElement('p');
    badge.className = 'mhu-cube__compact-badge';
    badge.textContent = 'Current page';
    body.append(badge);
  }
  const details = createMetadataList(
    getCompactMetadataEntries(item, axes, Boolean(position), compactMetadata),
    'mhu-cube__compact-details',
    true,
  );
  if (details) {
    body.append(details);
  }
  if (!href) {
    body.append(createUnavailableMessage());
  }

  card.append(media, body);
  return card;
}
