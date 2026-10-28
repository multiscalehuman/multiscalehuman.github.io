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
import { isSafeMetadataHref, validateMetadata } from './metadata';
import { isFiniteNumber, isRecord, issue, usesRetiredIndexFormat, type ValidationResult } from './primitives';

const ITEM_STATUSES = new Set<MhuCubeItemStatus>(['available', 'current', 'unavailable']);

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
): string | undefined {
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
 * Keeps a dataset's metadata destination when it uses a safe URL form.
 * @param input - Unknown `href` value from the dataset.
 * @param path - Location of the dataset in the input, such as `items[0]`.
 * @param itemId - ID of the dataset.
 * @param issues - Issue list, appended to in place.
 * @returns The trimmed destination, or undefined when it is absent or was removed as unsafe.
 */
function validateHref(
  input: unknown,
  path: string,
  itemId: string,
  issues: MhuCubeValidationIssue[],
): string | undefined {
  let href: string | undefined;
  if (input !== undefined) {
    if (typeof input === 'string' && isSafeMetadataHref(input)) {
      href = input.trim();
    } else {
      issues.push(
        issue(
          'item.href.unsafe',
          'Metadata destination was removed because it is invalid or uses an unsafe protocol.',
          `${path}.href`,
          'error',
          itemId,
        ),
      );
    }
  }
  return href;
}

/**
 * Reads a dataset's supplied status, replacing unknown values with `available`.
 * @param input - Unknown `status` value from the dataset.
 * @param path - Location of the dataset in the input, such as `items[0]`.
 * @param itemId - ID of the dataset.
 * @param issues - Issue list, appended to in place.
 * @returns The supplied status, or `available` when it is absent or unknown.
 */
function validateStatus(
  input: unknown,
  path: string,
  itemId: string,
  issues: MhuCubeValidationIssue[],
): MhuCubeItemStatus {
  let status: MhuCubeItemStatus = 'available';
  if (input !== undefined) {
    if (typeof input === 'string' && ITEM_STATUSES.has(input as MhuCubeItemStatus)) {
      status = input as MhuCubeItemStatus;
    } else {
      issues.push(
        issue(
          'item.status.invalid',
          'Unknown status was replaced with “available”.',
          `${path}.status`,
          'warning',
          itemId,
        ),
      );
    }
  }
  return status;
}

/**
 * Keeps a dataset's image when it uses a safe URL form.
 * @param input - Unknown `image` value from the dataset.
 * @param path - Location of the dataset in the input, such as `items[0]`.
 * @param itemId - ID of the dataset.
 * @param issues - Issue list, appended to in place.
 * @returns The trimmed image URL, or undefined when it is absent or was removed as unsafe.
 */
function validateImage(
  input: unknown,
  path: string,
  itemId: string,
  issues: MhuCubeValidationIssue[],
): string | undefined {
  let image: string | undefined;
  if (input !== undefined) {
    if (typeof input === 'string' && isSafeMetadataHref(input)) {
      image = input.trim();
    } else {
      issues.push(
        issue(
          'item.image.unsafe',
          'Image was removed because its URL is invalid or uses an unsafe protocol.',
          `${path}.image`,
          'warning',
          itemId,
        ),
      );
    }
  }
  return image;
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

    const href = validateHref(candidate['href'], path, id, issues);
    let status = validateStatus(candidate['status'], path, id, issues);

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

    const image = validateImage(candidate['image'], path, id, issues);

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
