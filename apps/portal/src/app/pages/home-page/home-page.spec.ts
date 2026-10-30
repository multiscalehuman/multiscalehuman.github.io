import { defineMhuCube } from '@mhu/mhu-cube';
import { render, screen } from '@testing-library/angular';
import { SAMPLE_DATASETS } from '../../datasets/sample-datasets';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeAll(() => defineMhuCube());

  it('renders the portal title', async () => {
    await render(HomePage);

    expect(
      screen.getByRole('heading', { level: 1, name: 'CIFAR MacMillan Multiscale Human Data Portal' }),
    ).toBeInTheDocument();
  });

  it('renders the Space Time Organ Graph with the sample datasets', async () => {
    await render(HomePage);

    expect(await screen.findByRole('region', { name: 'Organ imaging datasets' })).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: /^Select / })).toHaveLength(SAMPLE_DATASETS.length);
  });

  it('renders the 3D Human Body Visualization section', async () => {
    await render(HomePage);

    expect(screen.getByRole('heading', { level: 2, name: '3D Human Body Visualization' })).toBeInTheDocument();
  });
});
