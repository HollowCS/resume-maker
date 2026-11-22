import { blankDocument, type DocumentData, type Entry, type Resume } from './model';

export const STORAGE_KEY = 'resume-studio.document.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const entryFields = ['id', 'title', 'organization', 'location', 'startDate', 'endDate', 'description'] as const;
const resumeFields = ['name', 'headline', 'email', 'phone', 'location', 'website', 'summary', 'skills'] as const;

function isEntry(value: unknown): value is Entry {
  return isRecord(value) && entryFields.every((field) => typeof value[field] === 'string');
}

function isResume(value: unknown): value is Resume {
  return isRecord(value) &&
    resumeFields.every((field) => typeof value[field] === 'string') &&
    ['experience', 'education', 'projects'].every(
      (field) => Array.isArray(value[field]) && value[field].every(isEntry),
    );
}

export type LoadResult = { data: DocumentData; error: string | null };

export function loadDocument(storage: Storage): LoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { data: blankDocument(), error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.data) ||
        !isResume(parsed.data.resume) || typeof parsed.data.jobDescription !== 'string') {
      throw new Error('Unsupported or invalid document');
    }
    return { data: { resume: parsed.data.resume, jobDescription: parsed.data.jobDescription }, error: null };
  } catch {
    return {
      data: blankDocument(),
      error: 'Your saved data could not be read. It has not been overwritten. You can try reloading, or replace it with a new resume.',
    };
  }
}

export function saveDocument(storage: Storage, data: DocumentData): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data }));
}
