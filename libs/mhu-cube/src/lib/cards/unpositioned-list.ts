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
  const region = document.createElement('section');
  region.className = 'mhu-cube__unpositioned';
  const heading = document.createElement('h3');
  heading.className = 'mhu-cube__unpositioned-heading';
  heading.textContent = 'Not plotted';
  const guidance = document.createElement('p');
  guidance.className = 'mhu-cube__unpositioned-guidance';
  guidance.textContent = 'These datasets do not include usable visualization coordinates.';
  const list = document.createElement('ul');
  list.className = 'mhu-cube__unpositioned-list';
  items.forEach((item) => {
    const index = itemIndexes.get(item.id) ?? 0;
    const listItem = document.createElement('li');
    listItem.className = 'mhu-cube__unpositioned-item';
    if (item.id === selectedId) {
      listItem.classList.add('mhu-cube__item--selected');
    }
    const description = document.createElement('span');
    description.className = 'mhu-cube__sr-only';
    description.id = `${instanceId}-unpositioned-${index}-description`;
    description.textContent = getAccessibleItemDescription(item, axes);
    const button = document.createElement('button');
    button.className = 'mhu-cube__unpositioned-button';
    button.textContent = item.label;
    configureSelectionButton(button, item, description.id);
    listItem.append(description, button);
    list.append(listItem);
  });
  region.append(heading, guidance, list);
  return region;
}
