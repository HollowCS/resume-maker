import { describe, expect, it } from 'vitest';
import { extractPdfText, parseResumeText, reconstructLines } from './importResume';

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

  it('orders out-of-sequence fragments visually and joins punctuation without invented spaces', () => {
    const item = (str: string, x: number, y: number, width: number) => ({ str, transform: [10, 0, 0, 10, x, y], width });
    expect(reconstructLines([
      item('EXPERIENCE', 10, 70, 60), item('example', 25, 80, 35),
      item('.', 60, 80, 2), item('Alex', 10, 90, 20),
      item('@', 20, 80, 5), item('com', 62, 80, 15),
      item('sam', 10, 80, 10),
    ])).toBe('Alex\nsam@example.com\nEXPERIENCE');
  });

  it('separates dated and undated roles, qualifications, and additional information', () => {
    const resume = parseResumeText(`ALEX MORGAN
5551234567 | alex@example.com | https://example.com/alex
EXPERIENCE
Software Engineer, Example Corp | Jan 2024 - Present
Built reliable applications, improving delivery
with better automation.
Consultant - Data Analyst, Example Corp | June 2022 - Dec 2023
Maintained accurate records.
Junior Engineer, Sample Org
Built useful tools.
EDUCATION
Master of Computing
Sample University
Completed a major project.
Bachelor of Computing
Example College
Completed coursework.
ADDITIONAL INFORMATION
Languages: Python
Tools used: React, TypeScript
Certifications: Relevant credential`);
    expect(resume.email).toBe('alex@example.com');
    expect(resume.phone).toBe('5551234567');
    expect(resume.website).toBe('https://example.com/alex');
    expect(resume.experience).toHaveLength(3);
    expect(resume.experience[0]).toMatchObject({ title: 'Software Engineer', organization: 'Example Corp', startDate: 'Jan 2024', endDate: 'Present', description: 'Built reliable applications, improving delivery\nwith better automation.' });
    expect(resume.experience[2]).toMatchObject({ title: 'Junior Engineer', organization: 'Sample Org', description: 'Built useful tools.' });
    expect(resume.education).toHaveLength(2);
    expect(resume.education[1]).toMatchObject({ title: 'Bachelor of Computing', organization: 'Example College', description: 'Completed coursework.' });
    expect(resume.skills).toContain('Tools used: React, TypeScript');
    expect(resume.additionalInfo).toContain('Certifications: Relevant credential');
    expect(resume.education[1].description).not.toContain('Certifications');
  });

  it('rejects non-PDF files and oversized files before reading', async () => {
    await expect(extractPdfText(new File(['hello'], 'resume.txt'))).rejects.toThrow('Choose a PDF');
    const largeFile = new File([], 'resume.pdf');
    Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 + 1 });
    await expect(extractPdfText(largeFile)).rejects.toThrow('larger than 15 MB');
  });
});
