export type Entry = {
  id: string;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type Resume = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  experience: Entry[];
  education: Entry[];
  skills: string;
  projects: Entry[];
};

export type DocumentData = { resume: Resume; jobDescription: string };

export const blankResume = (): Resume => ({
  name: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  website: '',
  summary: '',
  experience: [],
  education: [],
  skills: '',
  projects: [],
});

export const blankDocument = (): DocumentData => ({
  resume: blankResume(),
  jobDescription: '',
});

export const newEntry = (): Entry => ({
  id: typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join('-'),
  title: '',
  organization: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
});

export const entryHasContent = (entry: Entry) =>
  [entry.title, entry.organization, entry.location, entry.startDate, entry.endDate, entry.description]
    .some((value) => value.trim());

export const resumeText = (resume: Resume) => [
  resume.name, resume.headline, resume.email, resume.phone, resume.location, resume.website,
  resume.summary, resume.skills,
  ...[...resume.experience, ...resume.education, ...resume.projects].flatMap(
    ({ title, organization, location, startDate, endDate, description }) =>
      [title, organization, location, startDate, endDate, description],
  ),
].join(' ');
