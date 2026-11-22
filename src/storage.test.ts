import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blankDocument, newEntry } from './model';
import { loadDocument, saveDocument, STORAGE_KEY } from './storage';

describe('local persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips the resume and optional job description', () => {
    const data = blankDocument();
    data.resume.name = 'Alex';
    data.resume.experience.push({ ...newEntry(), title: 'Engineer' });
    data.jobDescription = 'React engineer';
    saveDocument(localStorage, data);
    expect(loadDocument(localStorage)).toEqual({ data, error: null });
  });

  it('loads previously saved resumes without additional information', () => {
    const data = blankDocument();
    const { additionalInfo: _additionalInfo, ...legacyResume } = data.resume;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: { ...data, resume: legacyResume } }));
    expect(loadDocument(localStorage)).toEqual({ data, error: null });
  });

  it('rejects invalid additional information without overwriting saved data', () => {
    const data = blankDocument();
    const original = JSON.stringify({ version: 1, data: { ...data, resume: { ...data.resume, additionalInfo: 42 } } });
    localStorage.setItem(STORAGE_KEY, original);
    expect(loadDocument(localStorage).error).toContain('not been overwritten');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it('does not overwrite malformed or unsupported saved data', () => {
    const original = '{"version":99,"data":{}}';
    localStorage.setItem(STORAGE_KEY, original);
    const result = loadDocument(localStorage);
    expect(result.error).toContain('not been overwritten');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it('surfaces read and write failures', () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error('denied'); }),
      setItem: vi.fn(() => { throw new Error('quota'); }),
    } as unknown as Storage;
    expect(loadDocument(storage).error).toContain('could not be read');
    expect(() => saveDocument(storage, blankDocument())).toThrow('quota');
  });
});
