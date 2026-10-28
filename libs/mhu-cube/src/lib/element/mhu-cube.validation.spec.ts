import { screen } from '@testing-library/dom';
import { axes, items } from '../../testing/fixtures';
import { flush, issueCodes, mount, selectButton } from '../../testing/element-queries';
import type { MhuCubeItem, MhuCubeValidationDetail } from '../types';
import { MHU_CUBE_VALIDATION_EVENT } from './events';
import { defineMhuCube } from './mhu-cube';

describe('MhuCube', () => {
  beforeAll(() => {
    defineMhuCube();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  describe('configuration and validation', () => {
    it('renders and reports once after synchronous property updates', async () => {
      const cube = document.createElement('mhu-cube');
      const reports: MhuCubeValidationDetail[] = [];
      cube.addEventListener(MHU_CUBE_VALIDATION_EVENT, (event) => reports.push(event.detail));
      document.body.append(cube);

      cube.items = items;
      cube.axes = axes;
      cube.hoverMetadata = null;
      cube.compactMetadata = null;
      await flush();

      expect(reports).toHaveLength(1);
      expect(
        reports[0]?.issues.some(
          (issue) => issue.code.endsWith('.unknown') || issue.code === 'item.position.time.out-of-range',
        ),
      ).toBe(false);
      expect(cube.querySelectorAll('.mhu-cube__select')).toHaveLength(3);
    });

    it('does not report validation for selection-only and label-only changes', async () => {
      const cube = await mount();
      const listener = vi.fn();
      cube.addEventListener(MHU_CUBE_VALIDATION_EVENT, listener);

      cube.selectedId = 'two';
      cube.setAttribute('label', 'Datasets');
      await flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('reports malformed JSON attributes instead of retaining stale data', async () => {
      const cube = document.createElement('mhu-cube');
      cube.setAttribute('axes', JSON.stringify(axes));
      cube.setAttribute('items', '{invalid');
      const listener = vi.fn((event: CustomEvent<MhuCubeValidationDetail>) => event.detail.issues[0]?.code);
      document.body.addEventListener(MHU_CUBE_VALIDATION_EVENT, listener, { once: true });
      document.body.append(cube);
      await flush();

      expect(cube.items).toHaveLength(0);
      expect(cube.validationIssues.map((issue) => issue.code)).toContain('items.json.invalid');
      expect(listener).toHaveReturnedWith('items.json.invalid');

      cube.setAttribute('axes', '{invalid');
      await flush();
      expect(cube.validationIssues.map((issue) => issue.code)).toContain('axes.json.invalid');
      expect(screen.getByText('Visualization unavailable because the axis data is incomplete.')).toBeInTheDocument();
    });

    it('reads JSON attributes and clears data when they are removed', async () => {
      const cube = document.createElement('mhu-cube');
      cube.setAttribute('axes', JSON.stringify(axes));
      cube.setAttribute('items', JSON.stringify(items));
      document.body.append(cube);
      await flush();

      expect(cube.items.map((item) => item.id)).toEqual(['one', 'two', 'three', 'unplotted']);
      expect(screen.getAllByRole('article')).toHaveLength(items.length);

      cube.removeAttribute('items');
      await flush();
      expect(cube.items).toEqual([]);
      expect(screen.getByText('No datasets are available.')).toBeInTheDocument();

      cube.removeAttribute('axes');
      await flush();
      expect(cube.axes.space.values).toEqual([]);
      expect(screen.getByText('Visualization unavailable because the axis data is incomplete.')).toBeInTheDocument();
      expect(screen.queryByText('No datasets are available.')).not.toBeInTheDocument();
    });

    it('replaces incomplete axes with a fallback and keeps datasets available outside the plot', async () => {
      const cube = document.createElement('mhu-cube');
      cube.setAttribute('axes', JSON.stringify({ ...axes, space: { label: 'Space', values: [] } }));
      cube.setAttribute('items', JSON.stringify([items[0]]));
      document.body.append(cube);
      await flush();

      expect(screen.getByText('Visualization unavailable because the axis data is incomplete.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Select Dataset one/ })).toHaveClass('mhu-cube__unpositioned-button');
      expect(screen.getByRole('link', { name: 'Dataset one' })).toHaveAttribute('href', '#one');
    });

    it('drops unsafe destinations and images and treats the dataset as unavailable', async () => {
      const cube = await mount((element) => {
        element.axes = axes;
        element.items = [
          {
            id: 'unsafe',
            label: 'Unsafe dataset',
            href: 'javascript:alert(1)',
            image: 'data:image/png;base64,AAAA',
            position: { time: { start: 20, end: 20 }, space: 'small', organ: 'Heart' },
          },
        ];
      });

      expect(cube.validationIssues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining(['item.href.unsafe', 'item.image.unsafe']),
      );
      expect(screen.queryByRole('link', { name: /Heart/ })).not.toBeInTheDocument();
      expect(document.querySelector('img')).not.toBeInTheDocument();
      expect(selectButton('unsafe')).toHaveAccessibleDescription(expect.stringContaining('Metadata unavailable'));
    });

    it('reports invalid items in the validation event', async () => {
      const listener = vi.fn((event: CustomEvent<MhuCubeValidationDetail>) => issueCodes(event.detail));
      document.body.addEventListener(MHU_CUBE_VALIDATION_EVENT, listener);
      await mount((cube) => {
        cube.axes = axes;
        cube.items = 'not a list' as unknown as MhuCubeItem[];
      });

      expect(listener).toHaveReturnedWith(['items.invalid']);
      document.body.removeEventListener(MHU_CUBE_VALIDATION_EVENT, listener);
    });
  });
});
