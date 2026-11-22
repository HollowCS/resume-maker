import { describe, expect, it } from 'vitest';
import { blankResume, newEntry } from './model';
import { keywords, scoreResume } from './scoring';

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
      experience: [{ ...newEntry(), title: 'Engineer', organization: 'Acme', description: 'Built React apps.' }],
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
});
