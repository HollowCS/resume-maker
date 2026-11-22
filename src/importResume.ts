import { blankResume, newEntry, type Resume } from './model';

type Section = 'summary' | 'skills' | 'experience' | 'education' | 'projects';

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
};

const emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)/;
const websitePattern = /(?:https?:\/\/|www\.|(?:linkedin\.com|github\.com)\/)[^\s|·]+/i;
const contactPattern = /@|https?:\/\/|www\.|linkedin\.com|github\.com|\d{5,}/i;

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
  const sections: Record<Section, string[]> = { summary: [], skills: [], experience: [], education: [], projects: [] };
  const header: string[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const found = heading(line);
    if (found) {
      current = found.section;
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
  resume.skills = sections.skills.join('\n');
  for (const section of ['experience', 'education', 'projects'] as const) {
    if (sections[section].length) {
      const [first, second, ...rest] = sections[section];
      const hasHeading = Boolean(second && first.length <= 100 && second.length <= 100 &&
        !/^[•*\-]/.test(first) && !/^[•*\-]/.test(second));
      resume[section] = [{
        ...newEntry(),
        title: hasHeading ? first : '',
        organization: hasHeading ? second : '',
        description: hasHeading ? rest.join('\n') : sections[section].join('\n'),
      }];
    }
  }
  return resume;
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
      const lines: string[] = [];
      let line = '';
      let previousY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (previousY !== null && Math.abs(y - previousY) > 3 && line.trim()) {
          lines.push(line.trim());
          line = '';
        }
        if (item.str) line += (line && !/\s$/.test(line) && !/^\s/.test(item.str) ? ' ' : '') + item.str;
        if (item.hasEOL && line.trim()) {
          lines.push(line.trim());
          line = '';
        }
        previousY = y;
      }
      if (line.trim()) lines.push(line.trim());
      const pageText = lines.join('\n');
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
