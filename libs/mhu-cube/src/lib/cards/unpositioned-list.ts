import { h } from '../dom/create-element';
import { getAccessibleItemDescription } from '../text/accessible-text';
import type { MhuCubeAxes, MhuCubeItem } from '../types';
import type { ConfigureSelectionButton } from '../visualization/block-list-item';

/** What the unpositioned list needs from the element besides its datasets. */
export interface UnpositionedListOptions {
  /** Prefix for generated description IDs, unique per element instance. */
  instanceId: string;
  /** Stable source indexes used to generate unique description IDs. */
  itemIndexes: Map<string, number>;
  /** ID of the selected dataset, or null. */
  selectedId: string | null;
  /** Validated axes used for dataset descriptions. */
  axes: MhuCubeAxes;
  /** Adds the element's selection state and behavior to each dataset button. */
  configureSelectionButton: ConfigureSelectionButton;
}

/**
 * Creates the desktop fallback for datasets without usable plot coordinates.
 * @param items - Validated datasets that cannot be positioned on the cube.
 * @param options - Description IDs, selection state, and element settings for the datasets.
 * @returns A selectable fallback region for unpositioned datasets.
 */
export function createUnpositionedList(items: MhuCubeItem[], options: UnpositionedListOptions): HTMLElement {
  const { instanceId, itemIndexes, selectedId, axes, configureSelectionButton } = options;
  return h('section', { className: 'mhu-cube__unpositioned' }, [
    h('h3', { className: 'mhu-cube__unpositioned-heading', text: 'Not plotted' }),
    h('p', {
      className: 'mhu-cube__unpositioned-guidance',
      text: 'These datasets do not include usable visualization coordinates.',
    }),
    h(
      'ul',
      { className: 'mhu-cube__unpositioned-list' },
      items.map((item) => {
        const descriptionId = `${instanceId}-unpositioned-${itemIndexes.get(item.id) ?? 0}-description`;
        const button = h('button', { className: 'mhu-cube__unpositioned-button', text: item.label });
        configureSelectionButton(button, item, descriptionId);
        return h(
          'li',
          { className: ['mhu-cube__unpositioned-item', item.id === selectedId && 'mhu-cube__item--selected'] },
          [
            h('span', {
              className: 'mhu-cube__sr-only',
              attrs: { id: descriptionId },
              text: getAccessibleItemDescription(item, axes),
            }),
            button,
          ],
        );
      }),
    ),
  ]);
}
