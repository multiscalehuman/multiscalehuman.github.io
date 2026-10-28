import type { MhuCubeItem, MhuCubeValidationIssue } from '../types';
import { isRecord, issue, type ValidationResult } from './primitives';

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

/**
 * Normalizes a dataset's metadata, omitting unnamed fields and unsupported values with warnings.
 * @param input - Unknown metadata value from the dataset.
 * @param path - Location of the metadata in the input, used in issues.
 * @param itemId - ID of the dataset the metadata belongs to.
 * @param issues - Issue list, appended to in place.
 * @returns The supported metadata, or undefined when the dataset has none or it is not an object.
 */
export function validateMetadata(input: unknown, path: string, itemId: string, issues: MhuCubeValidationIssue[]) {
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
