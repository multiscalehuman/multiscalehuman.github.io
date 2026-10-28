import type { MhuCubeAxes, MhuCubeItem } from '../types';
import { NUMBER_FORMAT, formatMetadataValue, formatTimeRange, getMetadataEntries } from './format';

/**
 * Combines a concise visible label with available metadata for a unique accessible name.
 * @param item - Dataset whose label and metadata should be described.
 * @returns A descriptive dataset name suitable for controls and links.
 */
export function getAccessibleDatasetName(item: MhuCubeItem): string {
  const metadata = getMetadataEntries(item)
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join(', ');
  return metadata ? `${item.label}; ${metadata}` : item.label;
}

/**
 * Creates the screen-reader equivalent of the decorative axis labels.
 * @param axes - Validated axes.
 * @returns Visually hidden text describing every space category, the time span, and every organ, in that order.
 */
export function createAccessibleAxisSummary(axes: MhuCubeAxes): HTMLParagraphElement {
  const summary = document.createElement('p');
  summary.className = 'mhu-cube__sr-only';
  const unit = axes.time.unit ? ` ${axes.time.unit}` : '';
  summary.textContent = [
    `${axes.space.label}: ${axes.space.values.join(', ')}`,
    `${axes.time.label}: ${NUMBER_FORMAT.format(axes.time.min)} to ${NUMBER_FORMAT.format(axes.time.max)}${unit}`,
    `${axes.organ.label}: ${axes.organ.values.join(', ')}`,
  ].join('. ');
  return summary;
}

/**
 * Summarizes one dataset's metadata, visualization position, and availability.
 * @param item - Dataset represented by a block control.
 * @param axes - Axis definitions used to describe its plotted position.
 * @returns A concise accessible description for the dataset control.
 */
export function getAccessibleItemDescription(item: MhuCubeItem, axes: MhuCubeAxes): string {
  const metadata = getMetadataEntries(item).map(([key, value]) => `${key}: ${formatMetadataValue(value)}`);
  const position = item.position;
  const axisPosition = position
    ? [
        `${axes.space.label}: ${position.space}`,
        `${axes.time.label}: ${formatTimeRange(position.time, axes.time)}`,
        `${axes.organ.label}: ${position.organ}`,
      ]
    : [];
  const status = item.status ?? 'available';
  const statusText =
    status === 'current' ? 'Current page' : status === 'unavailable' ? 'Metadata unavailable' : 'Metadata available';
  const parts = [
    metadata.length > 0 ? metadata.join(', ') : 'No dataset details provided',
    axisPosition.length > 0
      ? `Visualization position: ${axisPosition.join(', ')}`
      : 'Visualization position not provided',
    statusText,
  ];
  return `${parts.join('. ')}.`;
}
