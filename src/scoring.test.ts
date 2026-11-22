import { describe, expect, it } from 'vitest';
import { blankResume, newEntry } from './model';
import { keywords, scoreReadiness, scoreResume } from './scoring';

describe('resume estimates', () => {
  it('returns a readiness score without inventing a job match', () => {
    const result = scoreResume(blankResume(), '');
    expect(result.readiness).toBe(0);
    expect(result.match).toBeNull();
    expect(result.matchMessage).toContain('job description');
    expect(result.checks.reduce((sum, check) => sum + check.points, 0)).toBe(100);
  });

  it('scores complete sections and compares distinct job keywords', () => {
    const resume = {
      ...blankResume(), name: 'Alex', headline: 'Engineer', email: 'alex@example.com', phone: '123',
      summary: 'A software engineer who builds reliable products for customers.',
      skills: 'React, TypeScript, CSS',
      experience: [{ ...newEntry(), title: 'Engineer', organization: 'Acme', description: 'Built React apps that improved access for 200 users.' }],
      education: [{ ...newEntry(), title: 'BS', organization: 'University' }],
    };
    const result = scoreResume(resume, 'React TypeScript Python Python');
    expect(result.readiness).toBe(100);
    expect(result.match).toEqual({ score: 67, matched: ['react', 'typescript'], missing: ['python'] });
  });

  it('handles descriptions without useful keywords and supports common technical terms', () => {
    expect(scoreResume(blankResume(), 'the and 2024').match).toBeNull();
    expect(keywords('C++ C# Node.js React react')).toEqual(['c++', 'c#', 'node.js', 'react']);
  });

  it('assesses informative details and measurable impact without counting dates as impact', () => {
    const resume = {
      ...blankResume(),
      experience: [{ ...newEntry(), title: 'Engineer', description: 'Built an application in 2024 and collaborated with the team.' }],
    };
    const result = scoreReadiness(resume);
    expect(result.checks.find((check) => check.label === 'Informative work details')?.passed).toBe(true);
    const impact = result.checks.find((check) => check.label === 'Measurable impact');
    expect(impact?.passed).toBe(false);
    expect(impact?.advice).toContain('Do not invent');
    resume.experience[0].description = 'Improved the application for 200 users.';
    expect(scoreReadiness(resume).checks.find((check) => check.label === 'Measurable impact')?.passed).toBe(true);
  });

  it('accepts a project and relevant training without requiring work experience or a degree', () => {
    const resume = {
      ...blankResume(), additionalInfo: 'Certifications: Accessibility',
      projects: [{ ...newEntry(), title: 'Tool', description: 'Created a tool that saved 3 hours for researchers.' }],
    };
    const result = scoreReadiness(resume);
    expect(result.checks.find((check) => check.label === 'Experience or projects')?.passed).toBe(true);
    expect(result.checks.find((check) => check.label === 'Education or training')?.passed).toBe(true);
    expect(result.checks.find((check) => check.label === 'Measurable impact')?.passed).toBe(true);
  });
});
