import { describe, expect, it } from 'vitest';
import { extractPdfText, parseResumeText } from './importResume';

describe('PDF resume parsing', () => {
  it('extracts contact details and preserves section text in editable fields', () => {
    const resume = parseResumeText(`Alex Morgan
Software Engineer
alex@example.com | +1 (555) 234-5678 | Brooklyn, NY | linkedin.com/in/alex
PROFILE
Software engineer with a focus on accessibility.
EXPERIENCE
Senior Engineer
Example Company
Built reliable apps.
EDUCATION
BS Computer Science
Example University
SKILLS: React, TypeScript
PROJECTS
Open-source tool`);
    expect(resume.name).toBe('Alex Morgan');
    expect(resume.headline).toBe('Software Engineer');
    expect(resume.email).toBe('alex@example.com');
    expect(resume.phone).toBe('+1 (555) 234-5678');
    expect(resume.website).toBe('linkedin.com/in/alex');
    expect(resume.location).toBe('Brooklyn, NY');
    expect(resume.summary).toBe('Software engineer with a focus on accessibility.');
    expect(resume.experience[0].title).toBe('Senior Engineer');
    expect(resume.experience[0].organization).toBe('Example Company');
    expect(resume.experience[0].description).toBe('Built reliable apps.');
    expect(resume.education[0].title).toBe('BS Computer Science');
    expect(resume.education[0].organization).toBe('Example University');
    expect(resume.skills).toBe('React, TypeScript');
    expect(resume.projects[0].description).toBe('Open-source tool');
  });

  it('does not mistake unrecognized headings for supported sections', () => {
    const resume = parseResumeText('Alex Morgan\nSoftware Engineer\nCERTIFICATIONS\nAWS certificate');
    expect(resume.experience).toEqual([]);
    expect(resume.skills).toBe('');
  });

  it('rejects non-PDF files and oversized files before reading', async () => {
    await expect(extractPdfText(new File(['hello'], 'resume.txt'))).rejects.toThrow('Choose a PDF');
    const largeFile = new File([], 'resume.pdf');
    Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 + 1 });
    await expect(extractPdfText(largeFile)).rejects.toThrow('larger than 15 MB');
  });
});
