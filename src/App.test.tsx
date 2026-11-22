import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { downloadPdf } from './pdf';
import { STORAGE_KEY } from './storage';
import { extractPdfText } from './importResume';

vi.mock('./pdf', () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./importResume', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./importResume')>();
  return { ...actual, extractPdfText: vi.fn() };
});

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

  it('reviews selected imports without overwriting unchecked fields or the job description', async () => {
    vi.mocked(extractPdfText).mockResolvedValueOnce({
      text: 'Jordan Smith\nDesigner\njordan@example.com\nSKILLS\nFigma, Research',
      emptyPages: [2],
    });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Full name'), 'Existing Name');
    await user.type(screen.getByLabelText('Job description (optional)'), 'Design role');
    await user.upload(screen.getByLabelText('Choose PDF resume'), new File(['pdf'], 'resume.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText(/No selectable text was found on page 2/)).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Existing Name');
    expect(screen.getByText(/replaces existing full name/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Full name/ }));
    await user.click(screen.getByRole('button', { name: 'Apply selected fields' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Existing Name');
    expect(screen.getByLabelText('Professional title')).toHaveValue('Designer');
    expect(screen.getByLabelText('Email address')).toHaveValue('jordan@example.com');
    expect(screen.getByLabelText('Your skills')).toHaveValue('Figma, Research');
    expect(screen.getByLabelText('Job description (optional)')).toHaveValue('Design role');
  });

  it('shows extraction errors without altering the resume', async () => {
    vi.mocked(extractPdfText).mockRejectedValueOnce(new Error('No selectable text was found. Scanned or image-only PDFs are not supported.'));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Full name'), 'Existing Name');
    await user.upload(screen.getByLabelText('Choose PDF resume'), new File(['image'], 'scan.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Scanned or image-only PDFs are not supported');
    expect(screen.getByLabelText('Full name')).toHaveValue('Existing Name');
  });
});
