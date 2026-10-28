import { codes, validAxes } from '../../testing/validation-fixtures';
import { canPlotAxes, validateAxes } from './axes';

describe('axes validation', () => {
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
});
