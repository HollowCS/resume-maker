import { resumeText, type Resume } from './model';

type Check = { label: string; passed: boolean; points: number; advice: string };
export type ScoreResult = {
  readiness: number;
  checks: Check[];
  match: null | { score: number; matched: string[]; missing: string[] };
  matchMessage: string | null;
};

const stopWords = new Set(
  `a an and are as at be been being but by can candidate candidates company could do for from
  have has had in into is it its job may more must of on or our role should that the their
  them they this to using we will with work working you your years year experience ability
  skills strong preferred required requirements responsibilities team including knowledge
  excellent minimum plus related seeking looking position opportunity`.split(/\s+/),
);

export function keywords(text: string): string[] {
  const words = text.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[+#.]?[\p{L}\p{N}+#]+)*/gu) ?? [];
  return [...new Set(words.filter((word) => word.length > 1 && !stopWords.has(word) && !/^\d+$/.test(word)))];
}

export function scoreResume(resume: Resume, jobDescription: string): ScoreResult {
  const checks: Check[] = [
    { label: 'Name and professional title', passed: Boolean(resume.name.trim() && resume.headline.trim()), points: 10, advice: 'Add your name and a clear professional title.' },
    { label: 'Contact information', passed: Boolean(resume.email.trim() && (resume.phone.trim() || resume.website.trim())), points: 15, advice: 'Add an email and a phone number or professional link.' },
    { label: 'Professional summary', passed: resume.summary.trim().length >= 40, points: 15, advice: 'Write a summary of at least 40 characters.' },
    { label: 'Experience details', passed: resume.experience.some((entry) => Boolean(entry.title.trim() && entry.organization.trim() && entry.description.trim())), points: 25, advice: 'Add a role, organization, and description for at least one experience.' },
    { label: 'Education', passed: resume.education.some((entry) => Boolean(entry.title.trim() && entry.organization.trim())), points: 15, advice: 'Add a qualification and institution.' },
    { label: 'Skills', passed: resume.skills.split(/[,\n]/).filter((skill) => skill.trim()).length >= 3, points: 20, advice: 'List at least three skills, separated by commas or new lines.' },
  ];
  const readiness = checks.reduce((total, check) => total + (check.passed ? check.points : 0), 0);
  if (!jobDescription.trim()) {
    return { readiness, checks, match: null, matchMessage: 'Add a job description to see a job-match estimate.' };
  }
  const terms = keywords(jobDescription);
  if (!terms.length) {
    return { readiness, checks, match: null, matchMessage: 'Add more meaningful words to the job description to calculate a match.' };
  }
  const resumeTerms = new Set(keywords(resumeText(resume)));
  const matched = terms.filter((term) => resumeTerms.has(term));
  const missing = terms.filter((term) => !resumeTerms.has(term));
  return {
    readiness,
    checks,
    match: { score: Math.round((matched.length / terms.length) * 100), matched, missing },
    matchMessage: null,
  };
}
