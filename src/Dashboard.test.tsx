import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { blankDocument, newEntry } from './model';
import { saveDocument } from './storage';

describe('readiness dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('starts on home, handles an empty resume and navigates to the editor', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: /clearer path/i })).toBeInTheDocument();
    expect(screen.queryByText('Start with your resume')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check my readiness' }));
    expect(screen.getByText('Start with your resume')).toBeInTheDocument();
    expect(screen.getByLabelText('Readiness score not calculated')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to editor' }));
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('shows prioritized weaknesses on demand and invalidates results after edits', async () => {
    const data = blankDocument();
    data.resume.name = 'Alex';
    saveDocument(localStorage, data);
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByLabelText(/Readiness score \d/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check my readiness' }));
    const list = within(screen.getByRole('region', { name: 'Make every detail count.' })).getAllByRole('list')[0];
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Informative work details');
    await user.click(screen.getByRole('button', { name: 'Open resume editor' }));
    await user.type(screen.getByLabelText('Professional title'), 'Engineer');
    await user.click(screen.getByRole('button', { name: /^Home$/ }));
    expect(screen.getByText('Insights are waiting')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Readiness score \d/)).not.toBeInTheDocument();
  });

  it('shows the all-passed state for a complete resume', async () => {
    const data = blankDocument();
    data.resume = {
      ...data.resume, name: 'Alex', headline: 'Engineer', email: 'alex@example.com', phone: '123',
      summary: 'Engineer building reliable and accessible systems for people.',
      skills: 'React, TypeScript, CSS',
      experience: [{ ...newEntry(), title: 'Engineer', description: 'Built accessible applications used by 200 users.' }],
      education: [{ ...newEntry(), title: 'BS', organization: 'University' }],
    };
    saveDocument(localStorage, data);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Check my readiness' }));
    expect(screen.getByLabelText('Readiness score 100 out of 100')).toBeInTheDocument();
    expect(screen.getByText('All checks passed')).toBeInTheDocument();
  });
});
