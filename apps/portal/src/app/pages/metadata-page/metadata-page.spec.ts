import { provideContentBlocks, withDefinitions } from '@atlasng/content-blocks';
import { DESIGN_SYSTEM_DEFINITIONS } from '@atlasng/content-blocks/definitions/design-system';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PORTAL_DEFINITIONS } from '../../content-blocks/definitions';
import { DatasetMetadata } from './dataset-metadata';
import { MetadataPage } from './metadata-page';

const METADATA: DatasetMetadata = {
  organ: 'Lung',
  space: '1 mm',
  time: '~20–30 years',
  description: 'Test description.',
  sections: [
    {
      title: 'First Section',
      anchor: 'first',
      content: [
        {
          component: 'ContentParagraph',
          content: [
            'See the ',
            { component: 'TextLink', config: { href: 'https://example.com/gallery' }, content: 'Gallery' },
            ' in ',
            { component: 'Cite', content: 'Nature' },
            '.',
          ],
        },
        { component: 'Embed', config: { id: 'gallery' } },
      ],
    },
    {
      title: 'Contacts',
      anchor: 'contacts',
      content: [
        {
          component: 'List',
          content: [
            {
              component: 'ListItem',
              content: [
                'Jane Doe, ',
                { component: 'TextLink', config: { href: 'mailto:jane@example.com' }, content: 'jane@example.com' },
              ],
            },
          ],
        },
      ],
    },
  ],
  lastUpdated: '2026-09-22',
};

const INPUTS = { metadata: METADATA };

const PROVIDERS = [
  provideContentBlocks({}, withDefinitions(DESIGN_SYSTEM_DEFINITIONS), withDefinitions(PORTAL_DEFINITIONS)),
];

describe('MetadataPage', () => {
  function setup(): ReturnType<typeof render<MetadataPage>> {
    return render(MetadataPage, { inputs: INPUTS, providers: PROVIDERS });
  }

  it('renders the title and description from the input', async () => {
    await setup();

    expect(screen.getByRole('heading', { level: 1, name: 'Lung, 1 mm, ~20–30 years' })).toBeInTheDocument();
    expect(screen.getByText('Test description.')).toBeInTheDocument();
  });

  it('sets the browser title to the dataset title', async () => {
    await setup();

    expect(document.title).toBe('Lung, 1 mm, ~20–30 years | Multiscale Human Data Portal');
  });

  it('ends the breadcrumbs with the organ and scale', async () => {
    await setup();

    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumbs).getAllByRole('listitem').at(-1)).toHaveTextContent('Lung, 1 mm Scale');
  });

  it('renders a heading and table of contents entry for each section', async () => {
    await setup();

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent.trim())).toEqual(['First Section', 'Contacts']);
    for (const heading of headings) {
      expect(within(toc).getByText(heading.textContent.trim())).toBeInTheDocument();
    }
  });

  it('highlights the table of contents entry that was clicked', async () => {
    await setup();

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    const entry = within(toc).getByRole('link', { name: 'Contacts' });
    await userEvent.click(entry);

    expect(entry).toHaveAttribute('aria-current');
    expect(within(toc).getByRole('link', { name: 'First Section' })).not.toHaveAttribute('aria-current');
  });

  it('renders paragraphs with links and citations from content blocks', async () => {
    await setup();

    const link = await screen.findByRole('link', { name: 'Gallery' });
    expect(link).toHaveAttribute('href', 'https://example.com/gallery');
    expect(screen.getByText('Nature').tagName).toBe('CITE');
    expect(link.closest('p')).toHaveTextContent('See the Gallery in Nature.');
  });

  it('renders lists from content blocks', async () => {
    await setup();

    const link = await screen.findByRole('link', { name: 'jane@example.com' });
    expect(link).toHaveAttribute('href', 'mailto:jane@example.com');
    const list = screen.getByText('Jane Doe,', { exact: false }).closest('ul');
    expect(within(list as HTMLElement).getByRole('listitem')).toHaveTextContent('Jane Doe, jane@example.com');
  });

  it('renders embeds from content blocks', async () => {
    await setup();

    expect(await screen.findByRole('img', { name: 'gallery' })).toBeInTheDocument();
  });

  it('renders the last updated date', async () => {
    await setup();

    expect(screen.getByText('Last updated on September 22, 2026')).toBeInTheDocument();
  });
});
