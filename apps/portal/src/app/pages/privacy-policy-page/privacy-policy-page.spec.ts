import { render, screen } from '@testing-library/angular';
import { PrivacyPolicyPage } from './privacy-policy-page';

describe('PrivacyPolicyPage', () => {
  it('renders the page title', async () => {
    await render(PrivacyPolicyPage);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  });
});
