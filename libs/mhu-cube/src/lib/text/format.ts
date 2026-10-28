import type { MhuCubeItem, MhuCubeMetadataValue, MhuCubeTimeAxis, MhuCubeTimeRange } from '../types';

/** Formats axis ticks, time ranges, and axis spans with at most two decimal places. */
export const NUMBER_FORMAT = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

/** A displayable metadata entry: its name and a value that is neither absent nor an empty list. */
export type MetadataEntry = [string, Exclude<MhuCubeMetadataValue, null | undefined>];

/**
 * Lists a dataset's displayable metadata, skipping absent values and empty lists.
 * @param item - Dataset whose metadata should be displayed.
 * @returns Label-value entries in their provided order.
 */
export function getMetadataEntries(item: MhuCubeItem) {
  return Object.entries(item.metadata ?? {}).filter(
    (entry): entry is MetadataEntry =>
      entry[1] !== null && entry[1] !== undefined && !(Array.isArray(entry[1]) && entry[1].length === 0),
  );
}

/**
 * Formats a metadata value as one line of text, joining list entries with commas.
 * @param value - Displayable metadata value.
 * @returns Text such as "Male" or "Peter W. Zandstra, Fabio M.V. Rossi".
 */
export function formatMetadataValue(value: Exclude<MhuCubeMetadataValue, null | undefined>) {
  return Array.isArray(value) ? value.join(', ') : String(value);
}

/**
 * Formats a dataset's time range for labels and assistive technology.
 * @param range - Validated time range.
 * @param axis - Time axis supplying the unit.
 * @returns The range's own label, or its formatted values such as "45 years" or "7–47 years".
 */
export function formatTimeRange(range: MhuCubeTimeRange, axis: MhuCubeTimeAxis) {
  if (range.label) {
    return range.label;
  }
  const values =
    range.start === range.end
      ? NUMBER_FORMAT.format(range.start)
      : `${NUMBER_FORMAT.format(range.start)}–${NUMBER_FORMAT.format(range.end)}`;
  return axis.unit ? `${values} ${axis.unit}` : values;
}
