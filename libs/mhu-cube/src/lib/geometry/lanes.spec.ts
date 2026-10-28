import { axes, dataset } from '../../testing/geometry-fixtures';
import { sortItemsForDisplay } from './lanes';

describe('lanes', () => {
  it('sortItemsForDisplay follows organ, space, then time, with unplotted datasets last', () => {
    const sorted = sortItemsForDisplay(
      [
        { id: 'unplotted', label: 'Unplotted' },
        dataset('thymus', 0, 1, '100 µm', 'Thymus'),
        dataset('heart-mm', 63, 63, '100 mm', 'Heart'),
        dataset('heart-um-late', 50, 50, '100 µm', 'Heart'),
        dataset('heart-um-early', 40, 70, '100 µm', 'Heart'),
      ],
      axes,
    );

    expect(sorted.map((item) => item.id)).toEqual([
      'heart-um-early',
      'heart-um-late',
      'heart-mm',
      'thymus',
      'unplotted',
    ]);
  });
});
