import { render, screen, within } from '@testing-library/angular';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders the portal title as the only h1', async () => {
    await render(Hero);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'CIFAR MacMillan Multiscale Human Data Portal' }),
    ).toBeInTheDocument();
  });

  it('renders the tagline', async () => {
    await render(Hero);

    expect(screen.getByText('Explore data across space, time, and organs.')).toBeInTheDocument();
  });

  it('renders the breadcrumbs to cifar.ca with Data Portal as plain text', async () => {
    await render(Hero);
    const nav = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));

    expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('href', 'https://cifar.ca/');
    expect(nav.getByRole('link', { name: 'Research Programs' })).toHaveAttribute(
      'href',
      'https://cifar.ca/research-programs/',
    );
    expect(nav.getByRole('link', { name: 'CIFAR MacMillan Multiscale Human' })).toHaveAttribute(
      'href',
      'https://cifar.ca/research-programs/cifar-macmillan-multiscale-human/',
    );
    expect(nav.getByText('Data Portal')).toBeInTheDocument();
    expect(nav.queryByRole('link', { name: 'Data Portal' })).not.toBeInTheDocument();
  });

  it('renders the CIFAR logo', async () => {
    await render(Hero);

    expect(screen.getByRole('img', { name: 'CIFAR' })).toHaveAttribute('src', 'assets/logos/cifar.svg');
  });

  it('renders the illustration as a decorative image', async () => {
    await render(Hero);
    const illustration = screen.getByRole('presentation');

    expect(illustration).toHaveAttribute('alt', '');
    expect(illustration.getAttribute('src')).toMatch(/hero-2880\.webp$/);
    expect(illustration).toHaveAttribute(
      'sizes',
      expect.stringContaining('(min-width: 960px) max(100vw, 102.7rem), max(100vw, 128.4rem)'),
    );
    expect(illustration.getAttribute('srcset')).toContain('assets/images/hero-640.webp 640w');
    expect(illustration.getAttribute('srcset')).toContain('assets/images/hero-2880.webp 2880w');
  });
});
