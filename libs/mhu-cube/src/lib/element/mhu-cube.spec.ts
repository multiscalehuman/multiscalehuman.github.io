import { fireEvent, screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import {
  MHU_CUBE_SELECTION_EVENT,
  MHU_CUBE_VALIDATION_EVENT,
  MhuCube,
  defineMhuCube,
  type MhuCubeAxes,
  type MhuCubeItem,
  type MhuCubeSelectionDetail,
  type MhuCubeValidationDetail,
} from './mhu-cube';
import { MHU_CUBE_INTRO_COPY } from '../content/intro-content';

const axes: MhuCubeAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: ['small', 'large'] },
  // Deliberately unsorted; the component displays organs alphabetically.
  organ: { label: 'Organ', values: ['Liver', 'Heart'] },
};

const items: MhuCubeItem[] = [
  {
    id: 'one',
    label: 'Dataset one',
    href: '#one',
    image: './missing-image.png',
    metadata: { Organ: 'Heart', 'Lead author': 'Author one' },
    position: { time: { start: 20, end: 20 }, space: 'small', organ: 'Heart' },
  },
  {
    id: 'two',
    label: 'Dataset two',
    href: '#two',
    image: 'images/dataset-two.png',
    metadata: { Organ: 'Liver', Sex: 'Female', 'Lead author': 'Author two' },
    position: { time: { start: 10, end: 60 }, space: 'large', organ: 'Liver' },
  },
  {
    id: 'three',
    label: 'Dataset three',
    href: '#three',
    metadata: { Organ: 'Liver', 'Lead author': ['Author three', 'Co-author three'] },
    position: { time: { start: 30, end: 30 }, space: 'large', organ: 'Liver' },
  },
  {
    id: 'unplotted',
    label: 'Dataset without coordinates',
    href: '#unplotted',
    metadata: { Organ: 'Heart', 'Lead author': 'Author four' },
  },
];

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mount(
  configure: (cube: MhuCube) => void = (cube) => {
    cube.axes = axes;
    cube.items = items;
  },
) {
  const cube = document.createElement('mhu-cube');
  document.body.append(cube);
  configure(cube);
  await flush();
  return cube;
}

function issueCodes(detail: MhuCubeValidationDetail) {
  return detail.issues.map((issue) => issue.code);
}

function texts(elements: Iterable<Element>) {
  return [...elements].map((element) => element.textContent).join(',');
}

function selectButton(id: string) {
  return screen
    .getAllByRole('button', { name: /^Select / })
    .find((button) => button.getAttribute('data-item-id') === id) as HTMLButtonElement;
}

function details() {
  const [button] = screen.getAllByRole('button', { name: /^Select / });
  return document.getElementById(button?.getAttribute('aria-controls') ?? '') as HTMLElement;
}

function compactCard(title: string) {
  const link = screen
    .getAllByRole('link')
    .find((candidate) => candidate.classList.contains('mhu-cube__compact-link') && candidate.textContent === title);
  return link?.closest('article') as HTMLElement;
}

describe('MhuCube', () => {
  beforeAll(() => {
    defineMhuCube();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  describe('structure', () => {
    it('explains the visualization with the configured introduction copy', async () => {
      await mount();
      const { visualization: copy } = MHU_CUBE_INTRO_COPY;

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        `${MHU_CUBE_INTRO_COPY.heading}${MHU_CUBE_INTRO_COPY.compactHeading}`,
      );
      const intro = screen.getByRole('banner');
      expect(within(intro).getByText(MHU_CUBE_INTRO_COPY.eyebrow ?? '')).toBeInTheDocument();
      expect(within(intro).getByText(MHU_CUBE_INTRO_COPY.compactDescription ?? '')).toBeInTheDocument();
      expect(within(intro).getByText(copy.description)).toBeInTheDocument();

      const dimensionKey = within(intro)
        .getByText(copy.dimensions[0]?.term ?? '')
        .closest('dl') as HTMLElement;
      expect(texts(within(dimensionKey).getAllByRole('term'))).toBe(
        copy.dimensions.map((dimension) => dimension.term).join(','),
      );
      copy.dimensionHeadings.forEach((heading) => expect(within(intro).getByText(heading)).toBeInTheDocument());

      const attribution = screen.getByRole('link', { name: copy.attribution.linkText });
      expect(attribution).toHaveAttribute('href', 'https://github.com/Chair-for-Clinical-Bioinformatics/metacube');
      expect(attribution.parentElement).toHaveTextContent(
        `${copy.attribution.beforeLink}${copy.attribution.linkText}${copy.attribution.afterLink}`,
      );
    });

    it('renders into the light DOM inside a labelled region', async () => {
      const cube = await mount();

      expect(cube.shadowRoot).toBeNull();
      expect(screen.getByRole('region', { name: 'Metadata datasets' })).toBe(cube.firstElementChild);

      cube.setAttribute('label', 'Atlas datasets');
      await flush();
      expect(screen.getByRole('region', { name: 'Atlas datasets' })).toBeInTheDocument();
    });

    it('gives cube controls unique names, descriptions, state, and a details relationship', async () => {
      await mount();
      const buttons = screen.getAllByRole('button', { name: /^Select / });

      expect(buttons.map((button) => button.getAttribute('data-item-id'))).toEqual([
        'one',
        'two',
        'three',
        'unplotted',
      ]);
      expect(document.querySelectorAll('.mhu-cube__select')).toHaveLength(3);
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName(expect.stringMatching(/^Select Dataset/));
        expect(button).toHaveAccessibleDescription(expect.stringContaining('Metadata'));
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button).toHaveAttribute('type', 'button');
      });
      expect(new Set(buttons.map((button) => button.getAttribute('aria-describedby'))).size).toBe(4);
      expect(details()).toHaveAttribute('aria-live', 'polite');
    });

    it('labels space, time, and organ axes with organs in alphabetical order', async () => {
      await mount();
      const labels = (className: string) => texts(document.querySelectorAll(className));

      expect(labels('.mhu-cube__axis-title--time')).toBe('Time (years)');
      expect(labels('.mhu-cube__axis-title--space')).toBe('Space');
      expect(labels('.mhu-cube__axis-title--organ')).toBe('Organ');
      expect(labels('.mhu-cube__axis-value--time')).toBe('0,20,40,60,80,100');
      expect(labels('.mhu-cube__axis-value--space')).toBe('small,large');
      expect(labels('.mhu-cube__axis-value--organ')).toBe('Heart,Liver');
      expect(document.querySelector('.mhu-cube__frame-guide')?.getAttribute('d')?.split('M')).toHaveLength(5);
      expect(screen.getByText('Space: small, large. Time: 0 to 100 years. Organ: Heart, Liver')).toBeInTheDocument();
    });

    it('omits the unit from axis text when the time axis has none and draws supplied ticks', async () => {
      await mount((cube) => {
        cube.axes = { ...axes, time: { label: 'Age', min: 0, max: 10, ticks: [0, 5, 10] } };
        cube.items = [
          {
            id: 'labelled',
            label: 'Labelled range',
            href: '#labelled',
            position: { time: { start: 2, end: 4, label: 'Two to four' }, space: 'small', organ: 'Heart' },
          },
          {
            id: 'plain',
            label: 'Plain range',
            href: '#plain',
            position: { time: { start: 2.5, end: 7.25 }, space: 'large', organ: 'Liver' },
          },
        ];
      });

      expect(texts(document.querySelectorAll('.mhu-cube__axis-title--time'))).toBe('Age');
      expect(texts(document.querySelectorAll('.mhu-cube__axis-value--time'))).toBe('0,5,10');
      expect(document.querySelector('.mhu-cube__frame-guide')?.getAttribute('d')?.split('M')).toHaveLength(2);
      expect(screen.getByText('Space: small, large. Age: 0 to 10. Organ: Heart, Liver')).toBeInTheDocument();
      expect(selectButton('labelled')).toHaveAccessibleDescription(expect.stringContaining('Age: Two to four'));
      expect(selectButton('plain')).toHaveAccessibleDescription(expect.stringContaining('Age: 2.5–7.25,'));
      expect(compactCard('large, 2.5–7.25, Liver')).toBeInTheDocument();
    });

    it('describes each block with its metadata, space, time, organ, and availability', async () => {
      await mount();

      expect(selectButton('two')).toHaveAccessibleDescription(
        'Organ: Liver, Sex: Female, Lead author: Author two. Visualization position: Space: large, ' +
          'Time: 10–60 years, Organ: Liver. Metadata available.',
      );
      expect(selectButton('unplotted')).toHaveAccessibleDescription(
        expect.stringContaining('Visualization position not provided'),
      );
    });

    it('casts floor shadows, drops raised blocks to the floor, and adds a time marker', async () => {
      await mount((cube) => {
        cube.axes = axes;
        cube.items = [
          ...items,
          {
            id: 'grounded',
            label: 'Grounded',
            href: '#grounded',
            position: { time: { start: 0, end: 50 }, space: 'small', organ: 'Liver' },
          },
        ];
      });
      const part = (id: string, className: string) => selectButton(id).querySelector(className);

      ['one', 'two', 'three', 'grounded'].forEach((id) => {
        expect(part(id, '.mhu-cube__shadow .mhu-cube__shadow-floor')).toBeInTheDocument();
        expect(part(id, '.mhu-cube__time-marker .mhu-cube__time-bracket')).toBeInTheDocument();
        expect(part(id, '.mhu-cube__cube')?.querySelectorAll('polygon')).toHaveLength(3);
      });
      expect(part('one', '.mhu-cube__shadow-drop')).toBeInTheDocument();
      expect(part('grounded', '.mhu-cube__shadow-drop')).not.toBeInTheDocument();
    });

    it('shows a message when there are no datasets to plot', async () => {
      const cube = await mount((element) => {
        element.axes = axes;
      });

      expect(screen.getByText('No datasets are available.')).toBeInTheDocument();
      expect(cube.items).toEqual([]);
      expect(cube.axes.organ.values).toEqual(['Heart', 'Liver']);
    });
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
