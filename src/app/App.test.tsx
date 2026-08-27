import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('renders the synthetic CivicFlow demo shell', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /civicflow synthetic demo/i }),
    ).toBeInTheDocument();
  });
});
