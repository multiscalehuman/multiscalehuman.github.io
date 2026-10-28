import { screen } from '@testing-library/dom';
import type { MhuCube } from '../lib/element/mhu-cube';
import type { MhuCubeValidationDetail } from '../lib/types';
import { axes, items } from './fixtures';

/**
 * Waits for queued microtasks, including the element's coalesced render, to finish.
 * @returns A promise that resolves on the next macrotask.
 */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Connects a new `<mhu-cube>` to the document, configures it, and waits for it to render.
 * @param configure - Sets the element's data; defaults to the shared axes and items.
 * @returns The rendered element.
 */
export async function mount(
  configure: (cube: MhuCube) => void = (cube) => {
    cube.axes = axes;
    cube.items = items;
  },
) {
  const cube = document.createElement('mhu-cube');
  document.body.append(cube);
  configure(cube);
  await flush();
  return cube;
}

/**
 * Lists the codes of a validation event's issues, in order.
 * @param detail - Validation event detail.
 * @returns The issue codes.
 */
export function issueCodes(detail: MhuCubeValidationDetail) {
  return detail.issues.map((issue) => issue.code);
}

/**
 * Joins the text of several elements for compact assertions.
 * @param elements - Elements to read.
 * @returns Their text content, comma-separated.
 */
export function texts(elements: Iterable<Element>) {
  return [...elements].map((element) => element.textContent).join(',');
}

/**
 * Finds a dataset's selection button.
 * @param id - Dataset ID.
 * @returns The block or unpositioned-list button for the dataset.
 */
export function selectButton(id: string) {
  return screen
    .getAllByRole('button', { name: /^Select / })
    .find((button) => button.getAttribute('data-item-id') === id) as HTMLButtonElement;
}

/**
 * Finds the desktop details region through the relationship the selection buttons expose.
 * @returns The details region.
 */
export function details() {
  const [button] = screen.getAllByRole('button', { name: /^Select / });
  return document.getElementById(button?.getAttribute('aria-controls') ?? '') as HTMLElement;
}

/**
 * Finds a compact card by its title link text.
 * @param title - Full text of the card's title link, including its hidden context.
 * @returns The card.
 */
export function compactCard(title: string) {
  const link = screen
    .getAllByRole('link')
    .find((candidate) => candidate.classList.contains('mhu-cube__compact-link') && candidate.textContent === title);
  return link?.closest('article') as HTMLElement;
}
