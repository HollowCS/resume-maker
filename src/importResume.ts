import { blankResume, newEntry, type Resume } from './model';

type Section = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'additional';

const headings: Record<string, Section> = {
  summary: 'summary', profile: 'summary', 'professional summary': 'summary',
  'professional profile': 'summary', 'about me': 'summary', objective: 'summary',
  skills: 'skills', 'technical skills': 'skills', 'core skills': 'skills',
  competencies: 'skills', 'core competencies': 'skills',
  experience: 'experience', 'work experience': 'experience',
  'professional experience': 'experience', employment: 'experience',
  'employment history': 'experience', 'work history': 'experience',
  education: 'education', qualifications: 'education',
  projects: 'projects', 'personal projects': 'projects',
  'additional information': 'additional', certifications: 'additional',
  'awards and certifications': 'additional', languages: 'additional',
};

const emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)/;
const websitePattern = /(?:https?:\/\/|www\.|(?:linkedin\.com|github\.com)\/)[^\s|·]+/i;
const contactPattern = /@|https?:\/\/|www\.|linkedin\.com|github\.com|\d{5,}/i;
const datePattern = /(?:\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2}/i;
const dateRangePattern = /((?:\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2})\s*[-–—]\s*((?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2}|present|current)/i;
const degreePattern = /^(?:(?:master(?:s|'s)?|bachelor(?:s|'s)?|associate(?:'s)?|doctor(?:ate)?|diploma|certificate)\b|(?:b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|b\.?sc\.?|m\.?sc\.?|ph\.?d\.?)\b)/i;

function splitEntries(lines: string[], section: 'experience' | 'education' | 'projects') {
  const entries: ReturnType<typeof newEntry>[] = [];
  let entry: ReturnType<typeof newEntry> | undefined;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const next = lines[index + 1];
    const dateRange = line.match(dateRangePattern);
    const dateFree = line.replace(dateRangePattern, '').replace(/\s*[|·]\s*$/, '').trim();
    const inlineRole = section === 'experience' && dateFree.length < 120 && /^.{2,80},\s*[^,]{2,70}$/.test(dateFree) &&
      (Boolean(dateRange) || /\b(?:engineer|developer|consultant|analyst|manager|designer|director|intern|specialist|architect|lead|scientist|officer|associate|annotator|technician)\b/i.test(dateFree.split(',')[0]));
    const educationStart = section === 'education' && degreePattern.test(line);
    if (inlineRole || educationStart) {
      entry = newEntry();
      entries.push(entry);
      if (inlineRole) {
        const separator = dateFree.lastIndexOf(',');
        entry.title = dateFree.slice(0, separator).trim();
        entry.organization = dateFree.slice(separator + 1).trim();
        if (dateRange) {
          entry.startDate = dateRange[1];
          entry.endDate = dateRange[2];
        }
      } else {
        entry.title = line;
        if (next && !degreePattern.test(next) && next.length < 100 && !/^[•*\-]/.test(next)) {
          entry.organization = next;
          index++;
        }
      }
    } else {
      if (!entry) {
        entry = newEntry();
        entries.push(entry);
        if (next && line.length <= 100 && next.length <= 100 &&
            !/^[•*\-]/.test(line) && !/^[•*\-]/.test(next) && !datePattern.test(line)) {
          entry.title = line;
          entry.organization = next;
          index++;
          continue;
        }
      }
      entry.description += (entry.description ? '\n' : '') + line;
    }
  }
  return entries;
}

function heading(line: string): { section: Section; remainder: string } | null {
  const [label, ...rest] = line.split(':');
  const key = label.trim().toLowerCase().replace(/^[\s#]+|[\s#]+$/g, '');
  const section = headings[key];
  if (!section || (!rest.length && line.length > 40)) return null;
  return { section, remainder: rest.join(':').trim() };
}

export function parseResumeText(text: string): Resume {
  const resume = blankResume();
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: Record<Section, string[]> = { summary: [], skills: [], experience: [], education: [], projects: [], additional: [] };
  const header: string[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const found = heading(line);
    if (found) {
      current = found.section;
      if (current === 'additional' && !/^additional information\s*:?$/i.test(line)) {
        sections.additional.push(line);
        continue;
      }
      if (found.remainder) sections[current].push(found.remainder);
    } else if (current) {
      sections[current].push(line);
    } else {
      header.push(line);
    }
  }
  const contactText = header.join(' | ');
  resume.email = contactText.match(emailPattern)?.[0] ?? '';
  resume.phone = contactText.match(phonePattern)?.[0].trim() ?? '';
  resume.website = contactText.match(websitePattern)?.[0] ?? '';
  const nonContacts = header.flatMap((line) => line.split(/\s*[|·]\s*/))
    .map((part) => part.trim()).filter((part) => part && !contactPattern.test(part) && !phonePattern.test(part));
  const first = nonContacts[0];
  if (first && first.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]+$/u.test(first) && first.split(/\s+/).length <= 6) {
    resume.name = first;
    resume.headline = nonContacts[1] ?? '';
    resume.location = nonContacts[2] ?? '';
  }
  resume.summary = sections.summary.join('\n');
  const additionalSkills = sections.additional.filter((line) => /^(?:languages?|tools(?: used)?|technical skills)\s*:/i.test(line));
  resume.skills = [...sections.skills, ...additionalSkills].join('\n');
  resume.additionalInfo = sections.additional.join('\n');
  for (const section of ['experience', 'education', 'projects'] as const) {
    resume[section] = splitEntries(sections[section], section);
  }
  return resume;
}

type PdfTextItem = { str: string; transform: number[]; width: number };

export function reconstructLines(items: PdfTextItem[]): string {
  const lines: { y: number; items: PdfTextItem[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }
  return lines.sort((a, b) => b.y - a.y).map((line) => {
    let text = '';
    let previous: PdfTextItem | undefined;
    for (const item of line.items.sort((a, b) => a.transform[4] - b.transform[4])) {
      const gap = previous ? item.transform[4] - (previous.transform[4] + previous.width) : 0;
      const spaceThreshold = Math.max(1, Math.abs(item.transform[3]) * 0.12);
      if (text && !/\s$/.test(text) && !/^\s/.test(item.str) && gap > spaceThreshold) text += ' ';
      text += item.str;
      previous = item;
    }
    return text.trim();
  }).filter(Boolean).join('\n');
}

export async function extractPdfText(file: File): Promise<{ text: string; emptyPages: number[] }> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a PDF file to import.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('This PDF is larger than 15 MB. Choose a smaller file.');
  }
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    const emptyPages: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = reconstructLines(content.items.filter((item): item is Extract<typeof item, { str: string }> => 'str' in item));
      if (!pageText.trim()) emptyPages.push(pageNumber);
      pages.push(pageText);
      page.cleanup();
    }
    const text = pages.join('\n').trim();
    if (!text) throw new Error('No selectable text was found. Scanned or image-only PDFs are not supported.');
    return { text, emptyPages };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No selectable text')) throw error;
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error('Password-protected PDFs are not supported. Remove the password and try again.');
    }
    throw new Error('Could not read this PDF. It may be damaged or unsupported.');
  } finally {
    await loadingTask.destroy();
  }
}
