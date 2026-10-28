import type {
  MhuCubeAxes,
  MhuCubeCategoryAxis,
  MhuCubeItem,
  MhuCubeItemStatus,
  MhuCubePosition,
  MhuCubeTimeAxis,
  MhuCubeTimeRange,
  MhuCubeValidationIssue,
} from '../types';

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

const ITEM_STATUSES = new Set<MhuCubeItemStatus>(['available', 'current', 'unavailable']);
const DEFAULT_TICK_STEPS = 5;
// A fixed locale keeps organ order identical for every viewer and test machine.
const CATEGORY_COLLATOR = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function usesRetiredIndexFormat(input: Record<string, unknown>) {
  return !('time' in input || 'space' in input || 'organ' in input) && ('x' in input || 'y' in input || 'z' in input);
}

function issue(
  code: string,
  message: string,
  path: string,
  severity: MhuCubeValidationIssue['severity'],
  itemId?: string,
): MhuCubeValidationIssue {
  return { code, message, path, severity, ...(itemId ? { itemId } : {}) };
}

/**
 * Orders organ names alphabetically, ignoring case and accents, with a stable tie-breaker.
 * @param a - First organ name.
 * @param b - Second organ name.
 * @returns A negative, zero, or positive sort result.
 */
export function compareOrganNames(a: string, b: string) {
  return CATEGORY_COLLATOR.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Determines whether validated axes contain enough information to draw the plot.
 * @param axes - Validated axes.
 * @returns Whether time has a positive span and both categorical axes have values.
 */
export function canPlotAxes(axes: MhuCubeAxes) {
  return axes.time.max > axes.time.min && axes.space.values.length > 0 && axes.organ.values.length > 0;
}

function validateMetadataNames(
  input: unknown,
  path: string,
  code: string,
  message: string,
): ValidationResult<string[] | null> {
  if (input === undefined || input === null) {
    return { value: null, issues: [] };
  }
  if (Array.isArray(input) && input.every((key) => typeof key === 'string')) {
    return { value: [...new Set(input.map((key) => key.trim()).filter(Boolean))], issues: [] };
  }
  return { value: null, issues: [issue(code, message, path, 'warning')] };
}

/**
 * Normalizes the metadata names shown on compact cards.
 * @param input - Unknown value received through the `compactMetadata` property or `compact-metadata` JSON attribute.
 * @returns Trimmed, unique names in order, or null to show every remaining entry; invalid input warns and uses null.
 */
export function validateCompactMetadata(input: unknown): ValidationResult<string[] | null> {
  return validateMetadataNames(
    input,
    'compactMetadata',
    'compact-metadata.invalid',
    'Compact metadata must be a list of metadata names; every remaining entry is shown.',
  );
}

/**
 * Normalizes the metadata names shown on the desktop hover card.
 * @param input - Unknown value received through the `hoverMetadata` property or `hover-metadata` JSON attribute.
 * @returns Trimmed, unique names in order, or null to show every entry; invalid input warns and uses null.
 */
export function validateHoverMetadata(input: unknown): ValidationResult<string[] | null> {
  return validateMetadataNames(
    input,
    'hoverMetadata',
    'hover-metadata.invalid',
    'Hover metadata must be a list of metadata names; every entry is shown.',
  );
}

/**
 * Determines whether a metadata destination or image uses an allowed web URL form.
 * @param value - Candidate URL supplied by component data.
 * @returns Whether the URL is relative, same-page, HTTP, or HTTPS.
 */
export function isSafeMetadataHref(value: string) {
  const href = value.trim();
  if (!href) {
    return false;
  }
  try {
    const parsed = new URL(href, 'https://mhu-cube.invalid/');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateAxisLabel(
  input: Record<string, unknown>,
  fallbackLabel: string,
  path: string,
  issues: MhuCubeValidationIssue[],
) {
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

function validateMetadata(input: unknown, path: string, itemId: string, issues: MhuCubeValidationIssue[]) {
  if (input === undefined) {
    return undefined;
  }
  if (!isRecord(input)) {
    issues.push(issue('item.metadata.invalid', 'Metadata must be an object.', path, 'warning', itemId));
    return undefined;
  }

  const metadata: NonNullable<MhuCubeItem['metadata']> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!key.trim()) {
      issues.push(
        issue('item.metadata.key.invalid', 'Metadata field with an empty name was omitted.', path, 'warning', itemId),
      );
      return;
    }
    if (
      typeof value === 'string' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      value === null ||
      value === undefined
    ) {
      metadata[key] = value;
    } else if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
      metadata[key] = value.map((entry) => entry.trim()).filter(Boolean);
    } else {
      issues.push(
        issue(
          'item.metadata.value.invalid',
          `Metadata field “${key}” was omitted because its value is unsupported.`,
          `${path}.${key}`,
          'warning',
          itemId,
        ),
      );
    }
  });
  return metadata;
}

function validateTimeRange(
  input: unknown,
  axis: MhuCubeTimeAxis,
  path: string,
  itemId: string,
  issues: MhuCubeValidationIssue[],
): MhuCubeTimeRange | undefined {
  if (
    !isRecord(input) ||
    !isFiniteNumber(input['start']) ||
    !isFiniteNumber(input['end']) ||
    input['start'] > input['end']
  ) {
    issues.push(
      issue(
        'item.position.time.invalid',
        'Time must provide finite start and end values with start no later than end; the dataset will not be plotted.',
        path,
        'warning',
        itemId,
      ),
    );
    return undefined;
  }

  let label: string | undefined;
  if (input['label'] !== undefined) {
    if (typeof input['label'] === 'string' && input['label'].trim()) {
      label = input['label'].trim();
    } else {
      issues.push(
        issue(
          'item.position.time.label.invalid',
          'Time label must be nonempty text; formatted values are shown instead.',
          `${path}.label`,
          'warning',
          itemId,
        ),
      );
    }
  }

  if (!(axis.max > axis.min) || input['start'] < axis.min || input['end'] > axis.max) {
    issues.push(
      issue(
        'item.position.time.out-of-range',
        'Time falls outside the configured time axis; the dataset will not be plotted.',
        path,
        'warning',
        itemId,
      ),
    );
    return undefined;
  }
  return { start: input['start'], end: input['end'], ...(label ? { label } : {}) };
}

function validateCategoryReference(
  input: unknown,
  axis: MhuCubeCategoryAxis,
  key: 'space' | 'organ',
  path: string,
  itemId: string,
  issues: MhuCubeValidationIssue[],
) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (axis.values.includes(value)) {
    return value;
  }
  const message = value
    ? `${axis.label} “${value}” does not match a configured value; the dataset will not be plotted.`
    : `Position is missing a ${axis.label.toLowerCase()} value; the dataset will not be plotted.`;
  issues.push(issue(`item.position.${key}.unknown`, message, path, 'warning', itemId));
  return undefined;
}

function validatePosition(
  input: unknown,
  axes: MhuCubeAxes,
  path: string,
  itemId: string,
  issues: MhuCubeValidationIssue[],
): MhuCubePosition | undefined {
  if (input === undefined || input === null) {
    issues.push(
      issue(
        'item.position.missing',
        'Dataset is available but will not be plotted because it has no position.',
        path,
        'warning',
        itemId,
      ),
    );
    return undefined;
  }
  if (!isRecord(input)) {
    issues.push(
      issue('item.position.invalid', 'Position must provide time, space, and organ.', path, 'warning', itemId),
    );
    return undefined;
  }
  if (usesRetiredIndexFormat(input)) {
    issues.push(
      issue(
        'item.position.invalid',
        'Position uses the retired x, y, and z index format; provide time, space, and organ instead.',
        path,
        'warning',
        itemId,
      ),
    );
    return undefined;
  }

  const time = validateTimeRange(input['time'], axes.time, `${path}.time`, itemId, issues);
  const space = validateCategoryReference(input['space'], axes.space, 'space', `${path}.space`, itemId, issues);
  const organ = validateCategoryReference(input['organ'], axes.organ, 'organ', `${path}.organ`, itemId, issues);
  return time && space && organ ? { time, space, organ } : undefined;
}

/**
 * Validates dataset identity, display metadata, destination, status, and position.
 * @param input - Unknown value received through a property or JSON attribute.
 * @param axes - Already validated axes that positions must reference.
 * @returns Safe datasets and actionable validation issues.
 */
export function validateItems(input: unknown, axes: MhuCubeAxes): ValidationResult<MhuCubeItem[]> {
  const issues: MhuCubeValidationIssue[] = [];
  if (!Array.isArray(input)) {
    return {
      value: [],
      issues: [issue('items.invalid', 'Items must be an array.', 'items', 'error')],
    };
  }

  const ids = new Set<string>();
  const items: MhuCubeItem[] = [];
  input.forEach((candidate, index) => {
    const path = `items[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(issue('item.invalid', 'Dataset must be an object and was excluded.', path, 'error'));
      return;
    }

    const id = typeof candidate['id'] === 'string' ? candidate['id'].trim() : '';
    if (!id) {
      issues.push(
        issue('item.id.invalid', 'Dataset requires a nonempty text ID and was excluded.', `${path}.id`, 'error'),
      );
      return;
    }
    if (ids.has(id)) {
      issues.push(issue('item.id.duplicate', `Duplicate dataset ID “${id}” was excluded.`, `${path}.id`, 'error', id));
      return;
    }
    ids.add(id);

    const suppliedLabel = typeof candidate['label'] === 'string' ? candidate['label'].trim() : '';
    const label = suppliedLabel || id;
    if (!suppliedLabel) {
      issues.push(
        issue(
          'item.label.invalid',
          'Dataset label is missing; its ID is shown instead.',
          `${path}.label`,
          'warning',
          id,
        ),
      );
    }

    let href: string | undefined;
    if (candidate['href'] !== undefined) {
      if (typeof candidate['href'] === 'string' && isSafeMetadataHref(candidate['href'])) {
        href = candidate['href'].trim();
      } else {
        issues.push(
          issue(
            'item.href.unsafe',
            'Metadata destination was removed because it is invalid or uses an unsafe protocol.',
            `${path}.href`,
            'error',
            id,
          ),
        );
      }
    }

    let status: MhuCubeItemStatus = 'available';
    if (candidate['status'] !== undefined) {
      if (typeof candidate['status'] === 'string' && ITEM_STATUSES.has(candidate['status'] as MhuCubeItemStatus)) {
        status = candidate['status'] as MhuCubeItemStatus;
      } else {
        issues.push(
          issue(
            'item.status.invalid',
            'Unknown status was replaced with “available”.',
            `${path}.status`,
            'warning',
            id,
          ),
        );
      }
    }

    if (!href && status === 'available') {
      status = 'unavailable';
      issues.push(
        issue(
          'item.href.missing',
          'Dataset has no metadata destination and is treated as unavailable.',
          `${path}.href`,
          'warning',
          id,
        ),
      );
    }

    let image: string | undefined;
    if (candidate['image'] !== undefined) {
      if (typeof candidate['image'] === 'string' && isSafeMetadataHref(candidate['image'])) {
        image = candidate['image'].trim();
      } else {
        issues.push(
          issue(
            'item.image.unsafe',
            'Image was removed because its URL is invalid or uses an unsafe protocol.',
            `${path}.image`,
            'warning',
            id,
          ),
        );
      }
    }

    const metadata = validateMetadata(candidate['metadata'], `${path}.metadata`, id, issues);
    const position = validatePosition(candidate['position'], axes, `${path}.position`, id, issues);
    items.push({
      id,
      label,
      ...(href ? { href } : {}),
      ...(image ? { image } : {}),
      ...(metadata ? { metadata } : {}),
      ...(position ? { position } : {}),
      status,
    });
  });

  return { value: items, issues };
}
