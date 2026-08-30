import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import { api } from '../api.js';

vi.mock('../api.js', () => ({
  api: {
    requestLink: vi.fn(),
  },
}));

function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits email and shows success message', async () => {
    api.requestLink.mockResolvedValue({ message: 'Login link sent. Check your email.' });
    const user = userEvent.setup();

    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'user@oeaw.ac.at');
    await user.click(screen.getByRole('button', { name: /send login link/i }));

    await waitFor(() => {
      expect(api.requestLink).toHaveBeenCalledWith('user@oeaw.ac.at');
      expect(screen.getByText(/Login link sent/i)).toBeInTheDocument();
    });
  });

  it('shows API error message', async () => {
    api.requestLink.mockRejectedValue(new Error('Only @oeaw.ac.at email addresses are allowed'));
    const user = userEvent.setup();

    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'bad@gmail.com');
    await user.click(screen.getByRole('button', { name: /send login link/i }));

    await waitFor(() => {
      expect(screen.getByText(/Only @oeaw.ac.at/i)).toBeInTheDocument();
    });
  });

  it('shows invalid token error from query string', () => {
    renderLogin(['/login?error=invalid_token']);
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});
