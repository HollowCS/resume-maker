import { entryHasContent, type Entry, type Resume } from './model';

function EntryPreview({ entry }: { entry: Entry }) {
  const date = [entry.startDate, entry.endDate].filter(Boolean).join(' – ');
  return <div className="preview-entry">
    <div className="preview-entry-heading"><strong>{entry.title || entry.organization}</strong><span>{date}</span></div>
    {entry.title && entry.organization && <div className="preview-organization">{entry.organization}{entry.location && ` · ${entry.location}`}</div>}
    {(!entry.title || !entry.organization) && entry.location && <div className="preview-organization">{entry.location}</div>}
    {entry.description && <p className="preserve-lines">{entry.description}</p>}
  </div>;
}

export default function ResumePreview({ resume }: { resume: Resume }) {
  const contacts = [resume.email, resume.phone, resume.location, resume.website].filter((value) => value.trim());
  const sections: { title: string; entries: Entry[] }[] = [
    { title: 'Experience', entries: resume.experience },
    { title: 'Education', entries: resume.education },
    { title: 'Projects', entries: resume.projects },
  ];
  return <article className="resume-paper" aria-label="Resume preview">
    <header className="resume-header">
      <h2>{resume.name || 'Your name'}</h2>
      <div className="resume-headline">{resume.headline || 'Your professional title'}</div>
      {contacts.length > 0 && <p>{contacts.join('  |  ')}</p>}
    </header>
    {resume.summary && <section className="resume-section"><h3>Profile</h3><p className="preserve-lines">{resume.summary}</p></section>}
    {sections.map(({ title, entries }) => {
      const visible = entries.filter(entryHasContent);
      return visible.length > 0 && <section className="resume-section" key={title}>
        <h3>{title}</h3>
        {visible.map((entry) => <EntryPreview key={entry.id} entry={entry} />)}
      </section>;
    })}
    {resume.skills && <section className="resume-section"><h3>Skills</h3><p className="preserve-lines">{resume.skills}</p></section>}
    {resume.additionalInfo && <section className="resume-section"><h3>Additional information</h3><p className="preserve-lines">{resume.additionalInfo}</p></section>}
    {!resume.summary && !resume.experience.some(entryHasContent) && !resume.education.some(entryHasContent) &&
      !resume.projects.some(entryHasContent) && !resume.skills && !resume.additionalInfo &&
      <div className="preview-empty"><span></span><span></span><span></span><p>Your story starts here. Fill in the sections to see your resume take shape.</p></div>}
  </article>;
}
