import type { MhuCubeAxes, MhuCubeItem, MhuCubeTimeAxis } from '../lib/types';

/** A 0–100 year time axis with ticks every 20 years. */
export const timeAxis: MhuCubeTimeAxis = {
  label: 'Time',
  unit: 'years',
  min: 0,
  max: 100,
  ticks: [0, 20, 40, 60, 80, 100],
};

/** Plottable axes with two space values and four alphabetized organs. */
export const axes: MhuCubeAxes = {
  time: timeAxis,
  space: { label: 'Space', values: ['100 µm', '100 mm'] },
  organ: { label: 'Organ', values: ['Heart', 'Kidney', 'Liver', 'Thymus'] },
};

/**
 * Creates an available, positioned dataset for layout tests.
 * @param id - Dataset ID, also used as its label and fragment link.
 * @param start - Start of the time range in years.
 * @param end - End of the time range in years.
 * @param space - Space value.
 * @param organ - Organ value.
 * @returns A validated-shape dataset.
 */
export function dataset(id: string, start: number, end: number, space: string, organ: string): MhuCubeItem {
  return { id, label: id, href: `#${id}`, status: 'available', position: { time: { start, end }, space, organ } };
}
