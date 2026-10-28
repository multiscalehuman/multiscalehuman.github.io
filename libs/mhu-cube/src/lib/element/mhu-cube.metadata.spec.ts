import { fireEvent, screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { axes, items } from '../../testing/fixtures';
import { compactCard, details, flush, mount, selectButton, texts } from '../../testing/element-queries';
import { defineMhuCube } from './mhu-cube';

describe('MhuCube', () => {
  beforeAll(() => {
    defineMhuCube();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  describe('hover metadata', () => {
    it('limits the hover card without changing the selected dataset card or descriptions', async () => {
      const cube = await mount();
      const hoverTerms = () => texts(selectButton('two').querySelectorAll('.mhu-cube__metadata-key'));

      cube.hoverMetadata = ['sex', 'Organ'];
      cube.selectedId = 'two';
      await flush();

      expect(cube.hoverMetadata).toEqual(['sex', 'Organ']);
      expect(hoverTerms()).toBe('Sex,Organ');
      expect(texts(within(details()).getAllByRole('term'))).toBe('Organ,Sex,Lead author');
      expect(selectButton('two')).toHaveAccessibleDescription(expect.stringContaining('Lead author: Author two'));

      cube.setAttribute('hover-metadata', 'Sex');
      await flush();
      expect(cube.hoverMetadata).toBeNull();
      expect(hoverTerms()).toBe('Organ,Sex,Lead author');
      expect(cube.validationIssues.map((issue) => issue.code)).toContain('hover-metadata.invalid');

      cube.setAttribute('hover-metadata', JSON.stringify(['Lead author']));
      await flush();
      expect(hoverTerms()).toBe('Lead author');

      cube.hoverMetadata = ['Unknown'];
      await flush();
      expect(selectButton('two').querySelector('.mhu-cube__metadata')).not.toBeInTheDocument();
      expect(selectButton('two').querySelector('.mhu-cube__label')).toHaveTextContent('Dataset two');
    });
  });

  describe('compact cards', () => {
    it('renders a card for every dataset with the image, space, time, organ title, and remaining metadata', async () => {
      await mount();

      expect(screen.getAllByRole('article')).toHaveLength(items.length);
      const titles = screen
        .getAllByRole('heading', { level: 3 })
        .filter((heading) => heading.closest('article.mhu-cube__compact-card'));
      expect(titles.map((title) => title.textContent)).toEqual([
        'small, 20 years, Heart',
        'large, 10–60 years, Liver',
        'large, 30 years, Liver',
        'Dataset without coordinates',
      ]);
      screen.getAllByRole('article').forEach((card) => {
        const media = card.firstElementChild as HTMLElement;
        expect(media).toHaveClass('mhu-cube__compact-media');
        expect(media).toHaveAttribute('href', within(card).getByRole('link').getAttribute('href'));
      });

      const two = compactCard('large, 10–60 years, Liver');
      const titleLink = within(two).getByRole('link');
      const media = two.firstElementChild as HTMLAnchorElement;
      expect(media).toHaveClass('mhu-cube__compact-media');
      expect(media).toHaveAttribute('href', '#two');
      expect(titleLink).toHaveAttribute('href', '#two');
      expect(media.tabIndex).toBe(-1);
      expect(media).toHaveAttribute('aria-hidden', 'true');
      expect(within(two).getByRole('heading', { level: 3 })).toContainElement(titleLink);

      const facts = two.querySelector('.mhu-cube__compact-facts') as HTMLElement;
      expect(texts(within(facts).getAllByRole('term'))).toBe('Space,Time');
      expect(texts(within(facts).getAllByRole('definition'))).toBe('large,10–60 years');
      const remaining = two.querySelector('.mhu-cube__compact-details') as HTMLElement;
      expect(texts(within(remaining).getAllByRole('term'))).toBe('Sex,Lead author');

      const three = compactCard('large, 30 years, Liver');
      const threeDetails = three.querySelector('.mhu-cube__compact-details') as HTMLElement;
      expect(texts(within(threeDetails).getAllByRole('definition'))).toBe('Author three,Co-author three');

      const unplotted = compactCard('Dataset without coordinates');
      expect(unplotted.querySelector('.mhu-cube__compact-facts')).not.toBeInTheDocument();
      const unplottedDetails = unplotted.querySelector('.mhu-cube__compact-details') as HTMLElement;
      expect(texts(within(unplottedDetails).getAllByRole('term'))).toBe('Organ,Lead author');
    });

    it('uses a decorative image and removes it when it fails to load', async () => {
      await mount();
      const image = (name: string) => compactCard(name).querySelector('img');

      expect(image('large, 10–60 years, Liver')).toHaveAttribute('alt', '');
      expect(image('large, 10–60 years, Liver')).toHaveAttribute('src', 'images/dataset-two.png');
      expect(image('large, 30 years, Liver')).not.toBeInTheDocument();

      fireEvent.error(image('small, 20 years, Heart') as HTMLImageElement);

      expect(image('small, 20 years, Heart')).not.toBeInTheDocument();
      expect(image('large, 10–60 years, Liver')).toBeInTheDocument();
    });

    it('limits compact metadata by property and JSON attribute without changing hover cards', async () => {
      const cube = await mount();
      const terms = () =>
        texts(compactCard('large, 10–60 years, Liver').querySelectorAll('.mhu-cube__compact-details dt'));

      cube.compactMetadata = [' lead AUTHOR '];
      await flush();
      expect(cube.compactMetadata).toEqual(['lead AUTHOR']);
      expect(terms()).toBe('Lead author');
      expect(selectButton('two').querySelector('.mhu-cube__card')).toHaveTextContent('Lead author');

      cube.setAttribute('compact-metadata', '{not json');
      await flush();
      expect(cube.compactMetadata).toBeNull();
      expect(terms()).toBe('Sex,Lead author');
      expect(cube.validationIssues.map((issue) => issue.code)).toContain('compact-metadata.invalid');

      cube.setAttribute('compact-metadata', JSON.stringify(['Sex']));
      await flush();
      expect(terms()).toBe('Sex');

      cube.removeAttribute('compact-metadata');
      await flush();
      expect(cube.compactMetadata).toBeNull();
      expect(terms()).toBe('Sex,Lead author');

      cube.compactMetadata = ['Missing'];
      await flush();
      expect(compactCard('large, 10–60 years, Liver').querySelector('.mhu-cube__compact-details')).toBeNull();
    });

    it('reflects current and unavailable datasets on cards, previews, and descriptions', async () => {
      await mount((cube) => {
        cube.axes = axes;
        cube.items = [
          {
            id: 'current',
            label: 'Current dataset',
            href: '#current',
            status: 'current',
            metadata: { Count: 42, Empty: null, Authors: [] },
            position: { time: { start: 20, end: 20 }, space: 'small', organ: 'Heart' },
          },
          {
            id: 'closed',
            label: 'Closed dataset',
            href: '#closed',
            status: 'unavailable',
            position: { time: { start: 40, end: 40 }, space: 'large', organ: 'Heart' },
          },
          { id: 'nowhere', label: 'Nowhere dataset' },
        ];
      });

      const current = compactCard('small, 20 years, Heart');
      expect(within(current).getByRole('link')).toHaveAttribute('aria-current', 'page');
      expect(within(current).getByText('Current page')).toHaveClass('mhu-cube__compact-badge');
      expect(within(current).getByText('42')).toBeInTheDocument();
      expect(selectButton('current')).toHaveAccessibleName('Select Current dataset; Count: 42');
      expect(selectButton('current')).toHaveAccessibleDescription(expect.stringMatching(/Current page\.$/));
      expect(selectButton('current').querySelector('.mhu-cube__status')).toHaveTextContent('Current page');

      const closedHeading = screen
        .getAllByRole('heading', { level: 3 })
        .find((heading) => heading.textContent === 'Heart' && !within(heading).queryByRole('link')) as HTMLElement;
      const closed = closedHeading.closest('article') as HTMLElement;
      expect(closed.firstElementChild?.tagName).toBe('DIV');
      expect(within(closed).getByText('Metadata is not currently available for this dataset.')).toBeInTheDocument();
      expect(selectButton('closed')).toHaveAccessibleName('Select Closed dataset');
      expect(selectButton('closed')).toHaveAccessibleDescription(
        expect.stringMatching(/^No dataset details provided\..*Metadata unavailable\.$/),
      );
      expect(selectButton('closed').querySelector('.mhu-cube__status')).toHaveTextContent('Unavailable');

      expect(screen.getByRole('heading', { name: 'Nowhere dataset', level: 3 })).toBeInTheDocument();
    });
  });

  describe('details card destinations', () => {
    it('labels the current page and explains unavailable metadata', async () => {
      const user = userEvent.setup();
      await mount((cube) => {
        cube.axes = axes;
        cube.items = [
          {
            id: 'current',
            label: 'Current dataset',
            href: '#current',
            status: 'current',
            position: { time: { start: 20, end: 20 }, space: 'small', organ: 'Heart' },
          },
          {
            id: 'closed',
            label: 'Closed dataset',
            status: 'unavailable',
            position: { time: { start: 40, end: 40 }, space: 'large', organ: 'Heart' },
          },
        ];
      });

      await user.click(selectButton('current'));
      expect(within(details()).getByRole('link')).toHaveAccessibleName(
        'View metadata for Current dataset, current page',
      );
      expect(within(details()).queryByRole('term')).not.toBeInTheDocument();

      await user.click(selectButton('closed'));
      expect(within(details()).queryByRole('link')).not.toBeInTheDocument();
      expect(within(details()).getByText('Metadata is not currently available for this dataset.')).toBeInTheDocument();
    });
  });
});
