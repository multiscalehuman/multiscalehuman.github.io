import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { axes, items } from '../../testing/fixtures';
import { flush, mount, selectButton } from '../../testing/element-queries';
import { MHU_CUBE_VALIDATION_EVENT } from './events';
import { MhuCube, defineMhuCube } from './mhu-cube';

describe('MhuCube', () => {
  beforeAll(() => {
    defineMhuCube();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  describe('lifecycle', () => {
    it('skips rendering while disconnected and renders again when reconnected', async () => {
      const cube = document.createElement('mhu-cube');
      const listener = vi.fn();
      cube.addEventListener(MHU_CUBE_VALIDATION_EVENT, listener);
      cube.axes = axes;
      cube.items = items;
      await flush();

      expect(cube).toBeEmptyDOMElement();
      expect(listener).not.toHaveBeenCalled();

      document.body.append(cube);
      await flush();
      expect(screen.getAllByRole('article')).toHaveLength(items.length);
      expect(listener).toHaveBeenCalledTimes(1);

      cube.selectedId = 'two';
      cube.remove();
      await flush();
      expect(within(cube).queryByRole('heading', { name: 'Dataset two' })).not.toBeInTheDocument();

      document.body.append(cube);
      await flush();
      expect(within(cube).getByRole('heading', { name: 'Dataset two' })).toBeInTheDocument();
      expect(within(cube).getAllByRole('region')).toHaveLength(1);
    });

    it('cancels a running details transition when disconnected', async () => {
      const cancel = vi.fn();
      const animate = vi.fn(() => ({ cancel, finished: new Promise(() => undefined) }));
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      const original = HTMLElement.prototype.animate;
      HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate;
      try {
        const user = userEvent.setup();
        const cube = await mount();

        await user.click(selectButton('two'));
        expect(animate).toHaveBeenCalledTimes(1);

        cube.remove();
        expect(cancel).toHaveBeenCalled();
      } finally {
        HTMLElement.prototype.animate = original;
      }
    });

    it('defines the custom element once and tolerates a missing registry', () => {
      const definition = customElements.get('mhu-cube');

      defineMhuCube();
      expect(customElements.get('mhu-cube')).toBe(definition);
      expect(definition).toBe(MhuCube);

      vi.stubGlobal('customElements', undefined);
      expect(() => defineMhuCube()).not.toThrow();
    });
  });
});
