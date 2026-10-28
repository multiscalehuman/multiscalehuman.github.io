import { screen, within } from '@testing-library/dom';
import { MHU_CUBE_INTRO_CONTENT } from '../content/intro-content';
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

  describe('structure', () => {
    it('explains the visualization with the configured introduction copy', async () => {
      await mount();
      const { visualization: copy } = MHU_CUBE_INTRO_CONTENT;

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        `${MHU_CUBE_INTRO_CONTENT.heading}${MHU_CUBE_INTRO_CONTENT.compactHeading}`,
      );
      const intro = screen.getByRole('banner');
      expect(within(intro).getByText(MHU_CUBE_INTRO_CONTENT.eyebrow ?? '')).toBeInTheDocument();
      expect(within(intro).getByText(MHU_CUBE_INTRO_CONTENT.compactDescription ?? '')).toBeInTheDocument();
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
});
