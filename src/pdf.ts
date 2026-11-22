import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { entryHasContent, type Entry, type Resume } from './model';

function entryContent(entry: Entry): Content[] {
  const date = [entry.startDate, entry.endDate].filter(Boolean).join(' – ');
  const heading = entry.title || entry.organization;
  const subheading = [entry.title && entry.organization ? entry.organization : '', entry.location].filter(Boolean).join(' · ');
  return [
    { columns: [{ text: heading, bold: true, width: '*' }, { text: date, alignment: 'right', width: 'auto' }], columnGap: 12, margin: [0, 7, 0, 2] },
    ...(subheading ? [{ text: subheading, color: '#555b65', margin: [0, 0, 0, 3] } as Content] : []),
    ...(entry.description ? [{ text: entry.description, margin: [0, 0, 0, 4] } as Content] : []),
  ];
}

export function createPdfDefinition(resume: Resume): TDocumentDefinitions {
  const content: Content[] = [
    { text: resume.name || 'Your name', fontSize: 24, bold: true, color: '#1e2935', margin: [0, 0, 0, 3] },
    { text: resume.headline || 'Your professional title', fontSize: 11, color: '#54756c', margin: [0, 0, 0, 6] },
  ];
  const contacts = [resume.email, resume.phone, resume.location, resume.website].filter((value) => value.trim());
  if (contacts.length) content.push({ text: contacts.join('  |  '), fontSize: 9, color: '#5e6872', margin: [0, 0, 0, 8] });
  const section = (title: string, body: Content[]) => {
    if (body.length) content.push({ text: title.toUpperCase(), style: 'sectionHeading', headlineLevel: 1 }, ...body);
  };
  if (resume.summary.trim()) section('Profile', [{ text: resume.summary }]);
  const groups: { title: string; entries: Entry[] }[] = [
    { title: 'Experience', entries: resume.experience },
    { title: 'Education', entries: resume.education },
    { title: 'Projects', entries: resume.projects },
  ];
  groups.forEach(({ title, entries }) => section(title, entries.filter(entryHasContent).flatMap(entryContent)));
  if (resume.skills.trim()) section('Skills', [{ text: resume.skills }]);
  return {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    content,
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.25 },
    styles: { sectionHeading: { bold: true, fontSize: 11, color: '#25453d', margin: [0, 16, 0, 5] } },
    info: { title: resume.name.trim() ? `${resume.name.trim()} - Resume` : 'Resume' },
  };
}

export async function downloadPdf(resume: Resume): Promise<void> {
  const [pdfModule, fontModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = pdfModule.default;
  const fonts = fontModule.default;
  const blob = await new Promise<Blob>((resolve) => {
    pdfMake.createPdf(createPdfDefinition(resume), undefined, undefined, fonts).getBlob(resolve);
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const name = resume.name.trim().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'resume';
  link.href = url;
  link.download = `${name}-resume.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
