import type { ValidationResult } from '../lib/validation/primitives';

/** Valid axes input with organs deliberately out of alphabetical order. */
export const validAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: ['small', 'large'] },
  organ: { label: 'Organ', values: ['Liver', 'heart', 'Kidney'] },
};

/**
 * Lists a validation result's issue codes, in order.
 * @param result - Any validation result.
 * @returns The codes of its issues.
 */
export const codes = (result: ValidationResult<unknown>) =>
  result.issues.map((validationIssue) => validationIssue.code);
