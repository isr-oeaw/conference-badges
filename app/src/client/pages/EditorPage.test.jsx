import React, { forwardRef, useImperativeHandle } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditorPage from './EditorPage.jsx';
import { api } from '../api.js';

vi.mock('../components/BadgeEditor.jsx', () => ({
  default: forwardRef(function MockBadgeEditor(_props, ref) {
    useImperativeHandle(ref, () => ({
      getDesign: () => ({ objects: [{ text: 'saved' }] }),
    }));
    return <div data-testid="mock-editor">Editor</div>;
  }),
}));

vi.mock('../components/ExportPanel.jsx', () => ({
  default: () => <div data-testid="export-panel">Export</div>,
}));

vi.mock('../api.js', () => ({
  api: {
    getProject: vi.fn(),
    updateProject: vi.fn(),
  },
}));

const project = {
  id: 'badge-1',
  name: 'Test badge',
  design_json: { objects: [{ text: 'initial' }] },
  shared: false,
  is_owner: true,
  owner_email: 'owner@oeaw.ac.at',
};

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={['/badges/badge-1']}>
      <Routes>
        <Route path="/badges/:id" element={<EditorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getProject.mockResolvedValue(project);
    api.updateProject.mockResolvedValue({
      ...project,
      design_json: { objects: [{ text: 'saved' }] },
    });
  });

  it('loads project and saves design from editor ref', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(await screen.findByDisplayValue('Test badge')).toBeInTheDocument();
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save design/i }));

    await waitFor(() => {
      expect(api.updateProject).toHaveBeenCalledWith('badge-1', {
        name: 'Test badge',
        design_json: { objects: [{ text: 'saved' }] },
      });
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });
});
