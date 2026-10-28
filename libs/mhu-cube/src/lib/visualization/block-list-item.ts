import { createCompactCard } from '../cards/compact-card';
import { createPreviewCard } from '../cards/preview-card';
import type { PlotLayout } from '../geometry/types';
import { getAccessibleItemDescription } from '../text/accessible-text';
import type { MhuCubeAxes, MhuCubeItem } from '../types';
import { createBlockShadow, createProjectedCube } from './blocks';

/**
 * Adds the element's shared accessible state and selection behavior to a dataset control.
 * @param button - Native button associated with a dataset.
 * @param item - Validated dataset controlled by the button.
 * @param descriptionId - ID of the button's accessible dataset description.
 */
export type ConfigureSelectionButton = (button: HTMLButtonElement, item: MhuCubeItem, descriptionId: string) => void;

/** What a dataset's list item needs from the element besides the dataset itself. */
export interface BlockListItemOptions {
  /** Plot layout for the dataset, or undefined when it cannot be positioned on the cube. */
  block: PlotLayout | undefined;
  /** Stable ID for the block control's accessible description. */
  descriptionId: string;
  /** Whether the dataset is selected. */
  selected: boolean;
  /** Validated axes used for descriptions and compact cards. */
  axes: MhuCubeAxes;
  /** Metadata names shown on the compact card, or null for every entry the card does not already show. */
  compactMetadata: string[] | null;
  /** Metadata names shown on the hover card, or null for every entry. */
  hoverMetadata: string[] | null;
  /** Adds the element's selection state and behavior to the block control. */
  configureSelectionButton: ConfigureSelectionButton;
}

/**
 * Creates one dataset's list item: a positioned block control with its shadow, cube, and hover card, plus the
 * compact card that replaces it in compact layouts. Datasets without a plot position get only the compact card.
 * @param item - Validated dataset to render.
 * @param options - Layout, selection state, and element settings for the dataset.
 * @returns The list item for the plot's dataset list.
 */
export function createBlockListItem(item: MhuCubeItem, options: BlockListItemOptions): HTMLLIElement {
  const { block, descriptionId, selected, axes, compactMetadata, hoverMetadata, configureSelectionButton } = options;
  const status = item.status ?? 'available';
  const listItem = document.createElement('li');
  listItem.className = `mhu-cube__item mhu-cube__item--${status}`;
  if (selected) {
    listItem.classList.add('mhu-cube__item--selected');
  }
  if (!block) {
    listItem.classList.add('mhu-cube__item--unpositioned');
    listItem.append(createCompactCard(item, axes, compactMetadata));
    return listItem;
  }

  const { bounds } = block.geometry;
  listItem.classList.add(`mhu-cube__item--card-${block.cardSide}`);
  listItem.style.setProperty('--cube-left', `${bounds.left}%`);
  listItem.style.setProperty('--cube-top', `${bounds.top}%`);
  listItem.style.setProperty('--cube-width', `${bounds.width}%`);
  listItem.style.setProperty('--cube-height', `${bounds.height}%`);
  listItem.style.setProperty('--cube-layer', String(block.layer));
  listItem.style.setProperty('--card-top', `${block.cardTop}%`);
  const button = document.createElement('button');
  button.className = 'mhu-cube__select';
  const description = document.createElement('span');
  description.className = 'mhu-cube__sr-only';
  description.id = descriptionId;
  description.textContent = getAccessibleItemDescription(item, axes);
  configureSelectionButton(button, item, description.id);
  button.append(createBlockShadow(block), createProjectedCube(block.geometry), createPreviewCard(item, hoverMetadata));
  listItem.append(description, button, createCompactCard(item, axes, compactMetadata));
  return listItem;
}
