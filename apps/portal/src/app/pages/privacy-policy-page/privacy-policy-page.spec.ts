import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import { PRIVACY_POLICY_SECTIONS, PrivacyPolicyPage } from './privacy-policy-page';

describe('PrivacyPolicyPage', () => {
  beforeEach(async () => {
    await render(PrivacyPolicyPage, { providers: [provideRouter([])] });
  });

  it('renders the page title', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('links the breadcrumb trail back to the homepage', () => {
    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(within(breadcrumbs).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it.each(PRIVACY_POLICY_SECTIONS)('renders the $tagline section heading', ({ tagline, level, anchor }) => {
    expect(screen.getByRole('heading', { level, name: tagline })).toHaveAttribute('id', anchor);
  });

  it('sets no title attributes, which browsers show as hover tooltips', () => {
    for (const { tagline } of PRIVACY_POLICY_SECTIONS) {
      expect(screen.queryByTitle(tagline)).not.toBeInTheDocument();
    }
  });

  it.each(PRIVACY_POLICY_SECTIONS)('links $tagline from the table of contents', ({ tagline, anchor }) => {
    const toc = screen.getByRole('navigation', { name: 'On this page' });

    expect(within(toc).getByRole('link', { name: tagline })).toHaveAttribute(
      'href',
      expect.stringMatching(`#${anchor}$`),
    );
  });

  it('links to the IU privacy statement', () => {
    for (const link of screen.getAllByRole('link', { name: 'IU Privacy statement' })) {
      expect(link).toHaveAttribute('href', 'https://privacy.iu.edu/privacy/global.html');
    }
  });

  it('links the contact email addresses', () => {
    expect(screen.getByRole('link', { name: 'cnscntr@iu.edu' })).toHaveAttribute('href', 'mailto:cnscntr@iu.edu');
    expect(screen.getByRole('link', { name: 'privacy@iu.edu' })).toHaveAttribute('href', 'mailto:privacy@iu.edu');
  });
});
