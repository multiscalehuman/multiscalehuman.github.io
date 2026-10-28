import { codes, validAxes } from '../../testing/validation-fixtures';
import type { MhuCubePosition } from '../types';
import { validateAxes } from './axes';
import { validateItems } from './items';

const axes = validateAxes(validAxes).value;

function position(overrides: Partial<MhuCubePosition> = {}): MhuCubePosition {
  return { time: { start: 20, end: 40 }, space: 'small', organ: 'Liver', ...overrides };
}

describe('items validation', () => {
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
