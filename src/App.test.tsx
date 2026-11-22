import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { downloadPdf } from './pdf';
import { STORAGE_KEY } from './storage';

vi.mock('./pdf', () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }));

describe('resume editor', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('edits repeatable sections, previews changes, scores on request and reloads saved content', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.type(screen.getByLabelText('Full name'), 'Alex Morgan');
    await user.click(screen.getByRole('button', { name: 'Add experience' }));
    await user.type(screen.getByLabelText('Job title'), 'Developer');
    await user.type(screen.getByLabelText('Company'), 'Example Co');
    await user.type(screen.getByLabelText('Job description (optional)'), 'Developer React');
    expect(within(screen.getByLabelText('Resume preview')).getByText('Alex Morgan')).toBeInTheDocument();
    expect(screen.queryByText('GENERAL READINESS')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check my resume' }));
    expect(screen.getByText('GENERAL READINESS')).toBeInTheDocument();
    expect(screen.getByText('Found:').closest('p')).toHaveTextContent('developer');
    await user.clear(screen.getByLabelText('Full name'));
    expect(screen.queryByText('GENERAL READINESS')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Full name'), 'Alex Morgan');
    view.unmount();
    render(<App />);
    expect(screen.getByLabelText('Full name')).toHaveValue('Alex Morgan');
    expect(screen.getByLabelText('Job description (optional)')).toHaveValue('Developer React');
    expect(screen.getByLabelText('Job title')).toHaveValue('Developer');
    await user.click(screen.getByRole('button', { name: 'Remove experience 1' }));
    expect(screen.queryByLabelText('Job title')).not.toBeInTheDocument();
  });

  it('protects unreadable saved data until the user explicitly replaces it', async () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('not been overwritten');
    await user.type(screen.getByLabelText('Full name'), 'Alex');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
    await user.click(screen.getByRole('button', { name: 'Replace saved data' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).data.resume.name).toBe('Alex');
  });

  it('reports storage and PDF export failures', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.mocked(downloadPdf).mockRejectedValueOnce(new Error('export failed'));
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByText('Not saved')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Download PDF' })[0]);
    expect(await screen.findByText(/Could not create the PDF/)).toBeInTheDocument();
  });
});
