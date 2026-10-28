import type { MhuCubeAxes, MhuCubeValidationIssue } from '../types';

/** Fallback axes for missing or invalid input: default labels, no values, and an empty time span, so nothing plots. */
export const EMPTY_AXES: MhuCubeAxes = {
  time: { label: 'Time', min: 0, max: 0, ticks: [] },
  space: { label: 'Space', values: [] },
  organ: { label: 'Organ', values: [] },
};

/** A normalized value and the issues found while producing it. */
export interface ValidationResult<T> {
  value: T;
  issues: MhuCubeValidationIssue[];
}

/**
 * Determines whether a value is a plain object that can be read by key.
 * @param value - Unknown input.
 * @returns Whether the value is a non-null, non-array object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Determines whether a value is a finite number.
 * @param value - Unknown input.
 * @returns Whether the value is a number other than NaN or an infinity.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Detects the retired x, y, and z format so validation can explain it instead of reporting missing fields.
 * @param input - Axes or position object.
 * @returns Whether the object has x, y, or z keys and none of time, space, or organ.
 */
export function usesRetiredIndexFormat(input: Record<string, unknown>): boolean {
  return !('time' in input || 'space' in input || 'organ' in input) && ('x' in input || 'y' in input || 'z' in input);
}

/**
 * Creates a validation issue, adding the dataset ID only when there is one.
 * @param code - Stable machine-readable issue code.
 * @param message - Human-readable explanation.
 * @param path - Location of the problem in the input, such as `items[0].href`.
 * @param severity - Whether the problem is an error or a warning.
 * @param itemId - ID of the dataset the issue belongs to, if any.
 * @returns The issue.
 */
export function issue(
  code: string,
  message: string,
  path: string,
  severity: MhuCubeValidationIssue['severity'],
  itemId?: string,
): MhuCubeValidationIssue {
  return { code, message, path, severity, ...(itemId ? { itemId } : {}) };
}
