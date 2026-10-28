import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { items } from '../../testing/fixtures';
import { details, flush, mount, selectButton, texts } from '../../testing/element-queries';
import type { MhuCubeItem, MhuCubeSelectionDetail } from '../types';
import { MHU_CUBE_SELECTION_EVENT } from './events';
import { defineMhuCube } from './mhu-cube';

describe('MhuCube', () => {
  beforeAll(() => {
    defineMhuCube();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  describe('selection', () => {
    it('moves focus to the metadata action on keyboard activation and keeps the live region mounted', async () => {
      const user = userEvent.setup();
      await mount();
      const region = details();

      selectButton('one').focus();
      await user.keyboard('{Enter}');

      const action = within(region).getByRole('link', { name: /^View metadata for/ });
      expect(details()).toBe(region);
      expect(action).toHaveFocus();
      expect(action).toHaveAccessibleName('View metadata for Dataset one; Organ: Heart, Lead author: Author one');
      expect(action).toHaveAttribute('href', '#one');

      selectButton('one').focus();
      await user.keyboard('{Enter}');
      expect(within(details()).getByRole('link', { name: /^View metadata for/ })).toHaveFocus();
    });

    it('swaps the dimension key for a closable dataset card', async () => {
      const user = userEvent.setup();
      const cube = await mount();
      const region = details();
      const intro = screen.getByRole('banner');
      const button = selectButton('two');

      await user.click(button);

      expect(intro).toBeInTheDocument();
      expect(region.parentElement).toHaveClass('mhu-cube__intro-visualization');
      expect(cube.firstElementChild).toHaveClass('mhu-cube--has-selection');
      expect(within(region).getByRole('article', { name: 'Dataset two' })).toBeInTheDocument();
      expect(within(region).getByRole('heading', { level: 3 })).toHaveTextContent('Dataset two');
      expect(within(region).getByText('Selected dataset')).toBeInTheDocument();
      expect(texts(within(region).getAllByRole('term'))).toBe('Organ,Sex,Lead author');
      expect(button.querySelector('.mhu-cube__card')).toHaveTextContent('SexFemale');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button.closest('li')).toHaveClass('mhu-cube__item--selected');
      expect(button).toHaveFocus();

      const selections: (MhuCubeItem | null)[] = [];
      cube.addEventListener(MHU_CUBE_SELECTION_EVENT, (event) => selections.push(event.detail.item));
      const close = within(region).getByRole('button', { name: 'Close dataset details' });
      const icon = close.querySelector('svg.mhu-cube__details-close-icon');
      expect(icon).toHaveAttribute('fill', 'currentColor');
      expect(icon).toHaveAttribute('aria-hidden', 'true');

      await user.click(close);

      expect(cube.selectedId).toBeNull();
      expect(selections).toEqual([null]);
      expect(region).toBeEmptyDOMElement();
      expect(cube.firstElementChild).not.toHaveClass('mhu-cube--has-selection');
      expect(button).toHaveFocus();
      screen.getAllByRole('button', { name: /^Select / }).forEach((control) => {
        expect(control).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('keeps focus on the cube control after pointer selection', async () => {
      const user = userEvent.setup();
      await mount();
      const button = selectButton('two');

      await user.click(button);
      await user.click(button);

      expect(button).toHaveFocus();
    });

    it('emits bubbling selection events with the selected item', async () => {
      const user = userEvent.setup();
      await mount();
      const listener = vi.fn((event: CustomEvent<MhuCubeSelectionDetail>) => event.detail.item?.id);
      document.body.addEventListener(MHU_CUBE_SELECTION_EVENT, listener);

      await user.click(selectButton('one'));

      expect(listener).toHaveReturnedWith('one');
      document.body.removeEventListener(MHU_CUBE_SELECTION_EVENT, listener);
    });

    it('keeps unpositioned datasets selectable without a cube', async () => {
      const user = userEvent.setup();
      const cube = await mount();

      expect(screen.getByRole('heading', { name: 'Not plotted' })).toBeInTheDocument();
      expect(screen.getByText('These datasets do not include usable visualization coordinates.')).toBeInTheDocument();
      const button = screen.getByRole('button', { name: /^Select Dataset without coordinates/ });
      expect(button).toHaveTextContent('Dataset without coordinates');
      expect(cube.validationIssues.map((issue) => issue.code)).toContain('item.position.missing');

      await user.click(button);
      expect(cube.selectedId).toBe('unplotted');
      expect(within(details()).getByRole('heading', { name: 'Dataset without coordinates' })).toBeInTheDocument();

      cube.hoverMetadata = null;
      await flush();
      const rerendered = screen.getByRole('button', { name: /^Select Dataset without coordinates/ });
      expect(rerendered).toHaveAttribute('aria-pressed', 'true');
      expect(rerendered.closest('li')).toHaveClass('mhu-cube__item--selected');
    });

    it('restores a programmatic selection across re-renders and ignores unknown IDs', async () => {
      const cube = await mount();

      cube.selectedId = 'two';
      await flush();
      expect(cube.selectedId).toBe('two');
      expect(within(details()).getByRole('heading', { name: 'Dataset two' })).toBeInTheDocument();

      cube.compactMetadata = ['Sex'];
      await flush();
      expect(selectButton('two')).toHaveAttribute('aria-pressed', 'true');
      expect(selectButton('two').closest('li')).toHaveClass('mhu-cube__item--selected');

      cube.selectedId = 'missing';
      await flush();
      expect(cube.selectedId).toBeNull();
      expect(details()).toBeEmptyDOMElement();

      cube.selectedId = 'two';
      cube.items = items.filter((item) => item.id !== 'two');
      await flush();
      expect(cube.selectedId).toBeNull();
    });

    it('joins list values with commas on the selected dataset card', async () => {
      const cube = await mount();

      cube.selectedId = 'three';
      await flush();

      const leadAuthor = within(details())
        .getAllByRole('term')
        .find((term) => term.textContent === 'Lead author')?.parentElement as HTMLElement;
      expect(
        within(leadAuthor)
          .getAllByRole('definition')
          .map((value) => value.textContent),
      ).toEqual(['Author three, Co-author three']);
    });
  });
});
