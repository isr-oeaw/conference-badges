import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OverviewPage from './OverviewPage.jsx';
import { api } from '../api.js';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../api.js', () => ({
  api: {
    listProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  },
}));

const user = { email: 'owner@oeaw.ac.at' };

function renderOverview() {
  return render(
    <MemoryRouter>
      <OverviewPage user={user} onLogout={vi.fn()} />
    </MemoryRouter>
  );
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('lists badges', async () => {
    api.listProjects.mockResolvedValue([
      {
        id: 'p1',
        name: 'Conference 2026',
        updated_at: '2026-01-01T12:00:00.000Z',
        shared: false,
        is_owner: true,
      },
    ]);

    renderOverview();

    expect(await screen.findByText('Conference 2026')).toBeInTheDocument();
    expect(screen.getByText(/Signed in as owner@oeaw.ac.at/i)).toBeInTheDocument();
  });

  it('creates badge and navigates to editor', async () => {
    api.listProjects.mockResolvedValue([]);
    api.createProject.mockResolvedValue({ id: 'new-id', name: 'New badge' });
    const eventUser = userEvent.setup();

    renderOverview();
    await eventUser.type(screen.getByPlaceholderText(/conference name/i), 'New badge');
    await eventUser.click(screen.getByRole('button', { name: /create badge/i }));

    await waitFor(() => {
      expect(api.createProject).toHaveBeenCalledWith('New badge');
      expect(navigate).toHaveBeenCalledWith('/badges/new-id');
    });
  });

  it('shares and deletes owned badges', async () => {
    api.listProjects.mockResolvedValue([
      {
        id: 'p1',
        name: 'Shared test',
        updated_at: '2026-01-01T12:00:00.000Z',
        shared: false,
        is_owner: true,
      },
    ]);
    api.updateProject.mockResolvedValue({
      id: 'p1',
      shared: true,
      updated_at: '2026-01-02T12:00:00.000Z',
    });
    api.deleteProject.mockResolvedValue({ ok: true });
    const eventUser = userEvent.setup();

    renderOverview();
    await screen.findByText('Shared test');

    await eventUser.click(screen.getByRole('button', { name: /share with everyone/i }));
    await waitFor(() => {
      expect(api.updateProject).toHaveBeenCalledWith('p1', { shared: true });
    });

    await eventUser.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(api.deleteProject).toHaveBeenCalledWith('p1');
      expect(screen.queryByText('Shared test')).not.toBeInTheDocument();
    });
  });
});
