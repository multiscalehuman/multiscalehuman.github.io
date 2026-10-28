import { h } from '../dom/create-element';
import { formatTimeRange, getMetadataEntries, type MetadataEntry } from '../text/format';
import type { MhuCubeAxes, MhuCubeItem } from '../types';
import { canPlotAxes } from '../validation/axes';
import { createMetadataList, createUnavailableMessage, getNamedMetadataEntries } from './metadata-list';

/**
 * Drops metadata that repeats a dimension the card already shows, matched by axis label.
 * @param item - Dataset whose metadata should be displayed.
 * @param axes - Validated axes whose labels identify repeated entries.
 * @returns The remaining metadata entries in their provided order.
 */
function getRemainingMetadataEntries(item: MhuCubeItem, axes: MhuCubeAxes): MetadataEntry[] {
  const dimensionLabels = new Set(
    [axes.time.label, axes.space.label, axes.organ.label].map((label) => label.trim().toLowerCase()),
  );
  return getMetadataEntries(item).filter(([key]) => !dimensionLabels.has(key.trim().toLowerCase()));
}

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
): MetadataEntry[] {
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
export function createCompactCard(
  item: MhuCubeItem,
  axes: MhuCubeAxes,
  compactMetadata: string[] | null = null,
): HTMLElement {
  const status = item.status ?? 'available';
  const href = status === 'unavailable' ? undefined : item.href;
  const position = canPlotAxes(axes) ? item.position : undefined;

  // The image repeats the title link for pointer users, so it stays out of the tab order and accessibility tree.
  const media = href
    ? h('a', { className: 'mhu-cube__compact-media', attrs: { href, tabindex: -1, 'aria-hidden': 'true' } })
    : h('div', { className: 'mhu-cube__compact-media' });
  if (item.image) {
    const image = h('img', { className: 'mhu-cube__compact-image', attrs: { src: item.image, alt: '' } });
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), { once: true });
    media.append(image);
  }

  const title = position?.organ ?? item.label;
  const time = position ? formatTimeRange(position.time, axes.time) : '';
  const body = h('div', { className: 'mhu-cube__compact-body' }, [
    position &&
      h(
        'dl',
        { className: 'mhu-cube__compact-facts' },
        [
          [axes.space.label, position.space],
          [axes.time.label, time],
        ].map(([label, value]) =>
          h('div', { className: 'mhu-cube__compact-fact' }, [
            h('dt', { className: 'mhu-cube__sr-only', text: label }),
            h('dd', { text: value }),
          ]),
        ),
      ),
    h('h3', { className: 'mhu-cube__compact-heading' }, [
      href
        ? h(
            'a',
            { className: 'mhu-cube__compact-link', attrs: { href, 'aria-current': status === 'current' && 'page' } },
            [
              // Several datasets share an organ, so hidden space and time text leads each link's name, in the card's
              // visual order.
              position && h('span', { className: 'mhu-cube__sr-only', text: `${position.space}, ${time}, ` }),
              title,
            ],
          )
        : title,
    ]),
    status === 'current' && h('p', { className: 'mhu-cube__compact-badge', text: 'Current page' }),
    createMetadataList(
      getCompactMetadataEntries(item, axes, Boolean(position), compactMetadata),
      'mhu-cube__compact-details',
      true,
    ),
    !href && createUnavailableMessage(),
  ]);

  return h('article', { className: 'mhu-cube__compact-card' }, [media, body]);
}
