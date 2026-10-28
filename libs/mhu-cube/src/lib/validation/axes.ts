import type { MhuCubeAxes, MhuCubeCategoryAxis, MhuCubeTimeAxis, MhuCubeValidationIssue } from '../types';
import {
  EMPTY_AXES,
  isFiniteNumber,
  isRecord,
  issue,
  usesRetiredIndexFormat,
  type ValidationResult,
} from './primitives';

const DEFAULT_TICK_STEPS = 5;
// A fixed locale keeps organ order identical for every viewer and test machine.
const CATEGORY_COLLATOR = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * Orders organ names alphabetically, ignoring case and accents, with a stable tie-breaker.
 * @param a - First organ name.
 * @param b - Second organ name.
 * @returns A negative, zero, or positive sort result.
 */
export function compareOrganNames(a: string, b: string): number {
  return CATEGORY_COLLATOR.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Determines whether validated axes contain enough information to draw the plot.
 * @param axes - Validated axes.
 * @returns Whether time has a positive span and both categorical axes have values.
 */
export function canPlotAxes(axes: MhuCubeAxes): boolean {
  return axes.time.max > axes.time.min && axes.space.values.length > 0 && axes.organ.values.length > 0;
}

function validateAxisLabel(
  input: Record<string, unknown>,
  fallbackLabel: string,
  path: string,
  issues: MhuCubeValidationIssue[],
): string {
  const label = typeof input['label'] === 'string' ? input['label'].trim() : '';
  if (!label) {
    issues.push(
      issue('axis.label.invalid', `${fallbackLabel} axis is using a fallback label.`, `${path}.label`, 'warning'),
    );
  }
  return label || fallbackLabel;
}

function validateCategoryAxis(
  input: unknown,
  key: 'space' | 'organ',
  fallbackLabel: string,
  issues: MhuCubeValidationIssue[],
): MhuCubeCategoryAxis {
  const path = `axes.${key}`;
  if (!isRecord(input)) {
    issues.push(issue('axis.invalid', `${fallbackLabel} axis must provide a label and values.`, path, 'error'));
    return { label: fallbackLabel, values: [] };
  }

  const label = validateAxisLabel(input, fallbackLabel, path, issues);
  const rawValues = input['values'];
  if (!Array.isArray(rawValues) || rawValues.length === 0) {
    issues.push(issue('axis.values.invalid', `${label} must provide at least one value.`, `${path}.values`, 'error'));
    return { label, values: [] };
  }
  if (!rawValues.every((value) => typeof value === 'string' && value.trim().length > 0)) {
    issues.push(
      issue('axis.value.invalid', `${label} contains an empty or non-text value.`, `${path}.values`, 'error'),
    );
    return { label, values: [] };
  }

  const values = rawValues.map((value) => (value as string).trim());
  const hasDuplicate = values.some(
    (value, index) => values.findIndex((other) => CATEGORY_COLLATOR.compare(value, other) === 0) !== index,
  );
  if (hasDuplicate) {
    issues.push(
      issue(
        'axis.values.duplicate',
        `${label} contains duplicate values and cannot be plotted safely.`,
        `${path}.values`,
        'error',
      ),
    );
    return { label, values: [] };
  }
  return { label, values: key === 'organ' ? values.sort(compareOrganNames) : values };
}

function validateTimeAxis(input: unknown, issues: MhuCubeValidationIssue[]): MhuCubeTimeAxis {
  const path = 'axes.time';
  if (!isRecord(input)) {
    issues.push(issue('axis.invalid', 'Time axis must provide a label, min, and max.', path, 'error'));
    return { ...EMPTY_AXES.time, ticks: [] };
  }

  const label = validateAxisLabel(input, 'Time', path, issues);
  let unit: string | undefined;
  if (input['unit'] !== undefined) {
    if (typeof input['unit'] === 'string' && input['unit'].trim()) {
      unit = input['unit'].trim();
    } else {
      issues.push(
        issue('axis.time.unit.invalid', 'Time unit must be nonempty text and was omitted.', `${path}.unit`, 'warning'),
      );
    }
  }
  const unitProperty = unit ? { unit } : {};

  const { min, max } = input;
  if (!isFiniteNumber(min) || !isFiniteNumber(max) || min >= max) {
    issues.push(
      issue(
        'axis.time.range.invalid',
        `${label} needs finite min and max values with min less than max.`,
        path,
        'error',
      ),
    );
    return { label, ...unitProperty, min: 0, max: 0, ticks: [] };
  }

  let ticks = Array.from(
    { length: DEFAULT_TICK_STEPS + 1 },
    (_, step) => min + ((max - min) * step) / DEFAULT_TICK_STEPS,
  );
  if (input['ticks'] !== undefined) {
    const rawTicks = input['ticks'];
    if (
      Array.isArray(rawTicks) &&
      rawTicks.length > 0 &&
      rawTicks.every((tick) => isFiniteNumber(tick) && tick >= min && tick <= max)
    ) {
      ticks = [...new Set(rawTicks as number[])].sort((a, b) => a - b);
    } else {
      issues.push(
        issue(
          'axis.time.ticks.invalid',
          `${label} ticks must be numbers between min and max; default ticks are used.`,
          `${path}.ticks`,
          'warning',
        ),
      );
    }
  }
  return { label, ...unitProperty, min, max, ticks };
}

/**
 * Validates and normalizes the time, space, and organ axes. Organs are always sorted alphabetically.
 * @param input - Unknown value received through a property or JSON attribute.
 * @returns Safe axes and actionable validation issues.
 */
export function validateAxes(input: unknown): ValidationResult<MhuCubeAxes> {
  if (!isRecord(input)) {
    return {
      value: EMPTY_AXES,
      issues: [
        issue('axes.invalid', 'Axes must be an object with time, space, and organ definitions.', 'axes', 'error'),
      ],
    };
  }
  if (usesRetiredIndexFormat(input)) {
    return {
      value: EMPTY_AXES,
      issues: [
        issue(
          'axes.invalid',
          'Axes use the retired x, y, and z format; provide time, space, and organ definitions.',
          'axes',
          'error',
        ),
      ],
    };
  }

  const issues: MhuCubeValidationIssue[] = [];
  const axes: MhuCubeAxes = {
    time: validateTimeAxis(input['time'], issues),
    space: validateCategoryAxis(input['space'], 'space', 'Space', issues),
    organ: validateCategoryAxis(input['organ'], 'organ', 'Organ', issues),
  };
  return { value: axes, issues };
}
