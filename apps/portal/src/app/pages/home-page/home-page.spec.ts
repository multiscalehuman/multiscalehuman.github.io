import { render, screen } from '@testing-library/angular';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('renders the portal title', async () => {
    await render(HomePage);

    expect(
      screen.getByRole('heading', { level: 1, name: 'CIFAR MacMillan Multiscale Human Data Portal' }),
    ).toBeInTheDocument();
  });
});
