import type { MhuCubePosition } from '../types';
import {
  canPlotAxes,
  isSafeMetadataHref,
  validateAxes,
  validateCompactMetadata,
  validateHoverMetadata,
  validateItems,
  type ValidationResult,
} from './items';

const validAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: ['small', 'large'] },
  organ: { label: 'Organ', values: ['Liver', 'heart', 'Kidney'] },
};
const axes = validateAxes(validAxes).value;
const codes = (result: ValidationResult<unknown>) => result.issues.map((validationIssue) => validationIssue.code);

function position(overrides: Partial<MhuCubePosition> = {}): MhuCubePosition {
  return { time: { start: 20, end: 40 }, space: 'small', organ: 'Liver', ...overrides };
}

describe('validation', () => {
  it('validateAxes sorts organs alphabetically and keeps the supplied space order', () => {
    const result = validateAxes(validAxes);

    expect(result.value.organ.values).toEqual(['heart', 'Kidney', 'Liver']);
    expect(result.value.space.values).toEqual(['small', 'large']);
    expect(result.issues).toEqual([]);
  });

  it('validateAxes defaults time ticks to five equal steps', () => {
    const result = validateAxes(validAxes);

    expect(result.value.time).toEqual({
      label: 'Time',
      unit: 'years',
      min: 0,
      max: 100,
      ticks: [0, 20, 40, 60, 80, 100],
    });
    expect(canPlotAxes(result.value)).toBe(true);
  });

  it('validateAxes keeps valid custom ticks and replaces invalid ones', () => {
    const custom = validateAxes({ ...validAxes, time: { ...validAxes.time, ticks: [50, 0, 100, 50] } });
    expect(custom.value.time.ticks).toEqual([0, 50, 100]);

    const invalid = validateAxes({ ...validAxes, time: { ...validAxes.time, ticks: [0, 150] } });
    expect(invalid.value.time.ticks).toEqual([0, 20, 40, 60, 80, 100]);
    expect(codes(invalid)).toEqual(['axis.time.ticks.invalid']);
  });

  it('validateAxes rejects a time axis without a positive span', () => {
    const result = validateAxes({ ...validAxes, time: { label: 'Time', min: 10, max: 10 } });

    expect(canPlotAxes(result.value)).toBe(false);
    expect(codes(result)).toEqual(['axis.time.range.invalid']);
  });

  it('validateAxes omits an empty time unit with a warning', () => {
    const result = validateAxes({ ...validAxes, time: { ...validAxes.time, unit: ' ' } });

    expect(result.value.time.unit).toBe(undefined);
    expect(codes(result)).toEqual(['axis.time.unit.invalid']);
  });

  it('validateAxes treats organ names that differ only by case as duplicates', () => {
    const result = validateAxes({ ...validAxes, organ: { label: 'Organ', values: ['Liver', 'liver'] } });

    expect(result.value.organ.values).toEqual([]);
    expect(codes(result)).toEqual(['axis.values.duplicate']);
    expect(canPlotAxes(result.value)).toBe(false);
  });

  it('validateAxes explains the retired x, y, and z format', () => {
    const result = validateAxes({
      x: { label: 'X', values: ['a'] },
      y: { label: 'Y', values: ['b'] },
      z: { label: 'Z', values: ['c'] },
    });

    expect(codes(result)).toEqual(['axes.invalid']);
    expect(result.issues[0].message).toMatch(/retired x, y, and z/);
  });

  it('validateItems preserves incomplete datasets without inventing positions', () => {
    const result = validateItems(
      [
        {
          id: 'dataset-one',
          label: 'Dataset one',
          href: '#dataset-one',
          metadata: { Organ: 'Liver', Missing: null },
        },
      ],
      axes,
    );

    expect(result.value.length).toBe(1);
    expect(result.value[0].position).toBe(undefined);
    expect(result.value[0].metadata?.['Missing']).toBe(null);
    expect(codes(result)).toEqual(['item.position.missing']);
  });

  it('validateItems keeps a valid named position and its time label', () => {
    const result = validateItems(
      [
        {
          id: 'infant',
          label: 'Infant',
          href: '#infant',
          position: position({ time: { start: 4 / 12, end: 5 / 12, label: ' 4–5 months ' } }),
        },
      ],
      axes,
    );

    expect(result.value[0].position).toEqual({
      time: { start: 4 / 12, end: 5 / 12, label: '4–5 months' },
      space: 'small',
      organ: 'Liver',
    });
    expect(result.issues).toEqual([]);
  });

  it('validateItems excludes unusable identities and duplicate IDs', () => {
    const result = validateItems(
      [
        { id: '', label: 'Missing identity' },
        { id: 'shared', label: 'First', href: '#first', position: position() },
        { id: 'shared', label: 'Second', href: '#second', position: position() },
      ],
      axes,
    );

    expect(result.value.map((item) => item.label)).toEqual(['First']);
    expect(codes(result)).toContain('item.id.invalid');
    expect(codes(result)).toContain('item.id.duplicate');
  });

  it('validateItems preserves identifiable datasets with fallback labels and statuses', () => {
    const result = validateItems(
      [
        {
          id: 'fallback',
          label: '',
          href: '#fallback',
          status: 'unexpected',
          position: position(),
        },
      ],
      axes,
    );

    expect(result.value[0].label).toBe('fallback');
    expect(result.value[0].status).toBe('available');
    expect(codes(result)).toContain('item.label.invalid');
    expect(codes(result)).toContain('item.status.invalid');
  });

  it('validateItems plots datasets that share a position', () => {
    const result = validateItems(
      [
        { id: 'first', label: 'First', href: '#first', position: position() },
        { id: 'second', label: 'Second', href: '#second', position: position() },
      ],
      axes,
    );

    expect(result.value.every((item) => item.position)).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('validateItems keeps unknown categories and out-of-range times available but unplotted', () => {
    const result = validateItems(
      [
        { id: 'space', label: 'Space', href: '#space', position: position({ space: 'huge' }) },
        { id: 'organ', label: 'Organ', href: '#organ', position: position({ organ: 'liver' }) },
        { id: 'late', label: 'Late', href: '#late', position: position({ time: { start: 90, end: 120 } }) },
        { id: 'reversed', label: 'Reversed', href: '#reversed', position: position({ time: { start: 50, end: 10 } }) },
      ],
      axes,
    );

    expect(result.value.every((item) => item.position === undefined)).toBe(true);
    expect(codes(result)).toEqual([
      'item.position.space.unknown',
      'item.position.organ.unknown',
      'item.position.time.out-of-range',
      'item.position.time.invalid',
    ]);
  });

  it('validateItems drops an empty time label but still plots the dataset', () => {
    const result = validateItems(
      [
        {
          id: 'blank',
          label: 'Blank',
          href: '#blank',
          position: position({ time: { start: 10, end: 10, label: '' } }),
        },
      ],
      axes,
    );

    expect(result.value[0].position?.time).toEqual({ start: 10, end: 10 });
    expect(codes(result)).toEqual(['item.position.time.label.invalid']);
  });

  it('validateItems explains the retired index position format', () => {
    const result = validateItems(
      [{ id: 'legacy', label: 'Legacy', href: '#legacy', position: { x: 0, y: 0, z: 0 } }],
      axes,
    );

    expect(result.value[0].position).toBe(undefined);
    expect(codes(result)).toEqual(['item.position.invalid']);
    expect(result.issues[0].message).toMatch(/retired x, y, and z/);
  });

  it('validateItems removes unsafe destinations and unsupported metadata values', () => {
    const result = validateItems(
      [
        {
          id: 'unsafe',
          label: 'Unsafe',
          href: 'javascript:alert(1)',
          metadata: { Valid: 4, Invalid: { nested: true }, '': 'unnamed' },
          position: position(),
        },
      ],
      axes,
    );

    expect(result.value[0].href).toBe(undefined);
    expect(result.value[0].status).toBe('unavailable');
    expect(result.value[0].metadata).toEqual({ Valid: 4 });
    expect(codes(result)).toContain('item.href.unsafe');
    expect(codes(result)).toContain('item.metadata.key.invalid');
    expect(codes(result)).toContain('item.metadata.value.invalid');
  });

  it('isSafeMetadataHref allows web destinations and rejects executable schemes', () => {
    expect(isSafeMetadataHref('#local-metadata')).toBe(true);
    expect(isSafeMetadataHref('../metadata/dataset')).toBe(true);
    expect(isSafeMetadataHref('https://example.org/metadata')).toBe(true);
    expect(isSafeMetadataHref('javascript:alert(1)')).toBe(false);
    expect(isSafeMetadataHref('data:text/html,test')).toBe(false);
    expect(isSafeMetadataHref('http://'), 'Unparseable URLs are unsafe.').toBe(false);
  });

  it('validateAxes rejects malformed axes and empty or non-text categories', () => {
    const malformed = validateAxes(null);
    expect(codes(malformed)).toEqual(['axes.invalid']);
    expect(canPlotAxes(malformed.value)).toBe(false);

    const result = validateAxes({
      time: 'always',
      space: { label: 'Space', values: [] },
      organ: { label: 'Organ', values: ['Liver', 3] },
    });
    expect(codes(result)).toEqual(['axis.invalid', 'axis.values.invalid', 'axis.value.invalid']);
    expect(result.value.space.values).toEqual([]);
    expect(result.value.organ.values).toEqual([]);
    expect(canPlotAxes(result.value)).toBe(false);

    expect(codes(validateAxes({ ...validAxes, space: undefined }))).toEqual(['axis.invalid']);
  });

  it('validateItems rejects a non-list and excludes non-object datasets, metadata, and positions', () => {
    expect(codes(validateItems({}, axes))).toEqual(['items.invalid']);

    const result = validateItems(
      [
        'dataset',
        { id: 'current', label: 'Current', href: '#current', status: 'current', metadata: 'Liver', position: 'Liver' },
      ],
      axes,
    );
    expect(codes(result)).toEqual(['item.invalid', 'item.metadata.invalid', 'item.position.invalid']);
    expect(result.value).toEqual([{ id: 'current', label: 'Current', href: '#current', status: 'current' }]);
  });

  it('validateCompactMetadata keeps trimmed unique names and falls back to every entry', () => {
    expect(validateCompactMetadata(undefined)).toEqual({ value: null, issues: [] });
    expect(validateCompactMetadata([' Corresponding authors ', 'Sex', 'Sex', ''])).toEqual({
      value: ['Corresponding authors', 'Sex'],
      issues: [],
    });
    const invalid = validateCompactMetadata(['Sex', 4]);
    expect(invalid.value).toBe(null);
    expect(codes(invalid)).toEqual(['compact-metadata.invalid']);
    expect(invalid.issues[0].severity).toBe('warning');
  });

  it('validateHoverMetadata keeps trimmed unique names and falls back to every entry', () => {
    expect(validateHoverMetadata(null)).toEqual({ value: null, issues: [] });
    expect(validateHoverMetadata([' Time ', 'Sex'])).toEqual({ value: ['Time', 'Sex'], issues: [] });
    const invalid = validateHoverMetadata('Sex');
    expect(invalid.value).toBe(null);
    expect(codes(invalid)).toEqual(['hover-metadata.invalid']);
  });

  it('validateItems keeps safe images and trims list metadata such as several authors', () => {
    const result = validateItems(
      [
        {
          id: 'a',
          label: 'A',
          href: '#a',
          image: ' images/a.png ',
          metadata: { Authors: [' Peter W. Zandstra ', '', 'Fabio M.V. Rossi'] },
        },
        { id: 'b', label: 'B', href: '#b', image: 'javascript:alert(1)', metadata: { Mixed: ['Name', 4] } },
      ],
      axes,
    );
    expect(result.value[0].image).toBe('images/a.png');
    expect(result.value[0].metadata).toEqual({ Authors: ['Peter W. Zandstra', 'Fabio M.V. Rossi'] });
    expect(result.value[1].image).toBe(undefined);
    expect(result.value[1].metadata).toEqual({});
    expect(codes(result).filter((code) => code !== 'item.position.missing')).toEqual([
      'item.image.unsafe',
      'item.metadata.value.invalid',
    ]);
    expect(result.issues.find((issue) => issue.code === 'item.image.unsafe')?.severity).toBe('warning');
  });
});
