import { h } from '../dom/create-element';
import { formatMetadataValue, getMetadataEntries } from '../text/format';
import type { MhuCubeItem } from '../types';
import { getNamedMetadataEntries } from './metadata-list';

/**
 * Creates the transient preview shown beside a desktop cube.
 * @param item - Dataset represented by the cube.
 * @param hoverMetadata - Metadata names to show, or null for every entry.
 * @returns A presentation-only card containing safely escaped text nodes.
 */
export function createPreviewCard(item: MhuCubeItem, hoverMetadata: string[] | null = null): HTMLSpanElement {
  const entries = hoverMetadata ? getNamedMetadataEntries(item, hoverMetadata) : getMetadataEntries(item);
  const status = item.status === 'current' ? 'Current page' : item.status === 'unavailable' ? 'Unavailable' : undefined;
  return h('span', { className: 'mhu-cube__card', attrs: { 'aria-hidden': 'true' } }, [
    h('span', { className: 'mhu-cube__label', text: item.label }),
    entries.length > 0 &&
      h(
        'span',
        { className: 'mhu-cube__metadata' },
        entries.flatMap(([key, value]) => [
          h('span', { className: 'mhu-cube__metadata-key', text: key }),
          h('span', { className: 'mhu-cube__metadata-value', text: formatMetadataValue(value) }),
        ]),
      ),
    status && h('span', { className: 'mhu-cube__status', text: status }),
  ]);
}
