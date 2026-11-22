import { useEffect, useId, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, BriefcaseBusiness, Check, CircleAlert, FileText, GraduationCap, LayoutDashboard, Lightbulb, Link as LinkIcon, LockKeyhole, Plus, ScanLine, Sparkles, Trash2, UserRound, Wrench, FolderKanban } from 'lucide-react';
import { blankDocument, newEntry, type DocumentData, type Entry, type Resume } from './model';
import { loadDocument, saveDocument } from './storage';
import { scoreResume, type ScoreResult } from './scoring';
import ResumePreview from './ResumePreview';
import { downloadPdf } from './pdf';

type SectionName = 'experience' | 'education' | 'projects';
type TextField = Exclude<keyof Resume, SectionName>;

const sectionInfo: Record<SectionName, { title: string; singular: string; titleLabel: string; organizationLabel: string; icon: ReactNode; hint: string }> = {
  experience: { title: 'Experience', singular: 'experience', titleLabel: 'Job title', organizationLabel: 'Company', icon: <BriefcaseBusiness size={18} />, hint: 'Showcase the work that got you here.' },
  education: { title: 'Education', singular: 'education', titleLabel: 'Degree or qualification', organizationLabel: 'School or institution', icon: <GraduationCap size={18} />, hint: 'Add your education and qualifications.' },
  projects: { title: 'Projects', singular: 'project', titleLabel: 'Project name', organizationLabel: 'Organization or link', icon: <FolderKanban size={18} />, hint: 'Highlight work you are proud of.' },
};

function Field({ label, value, onChange, placeholder, multiline = false, hint }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; hint?: string;
}) {
  const id = useId();
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {multiline
      ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} aria-describedby={hint ? `${id}-hint` : undefined} />
      : <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
  </div>;
}

function SectionCard({ id, title, hint, icon, children }: { id: string; title: string; hint: string; icon: ReactNode; children: ReactNode }) {
  return <section className="editor-card" id={id}>
    <div className="card-heading"><span className="section-icon">{icon}</span><div><h3>{title}</h3><p>{hint}</p></div></div>
    {children}
  </section>;
}

function EntriesEditor({ type, entries, onChange }: { type: SectionName; entries: Entry[]; onChange: (entries: Entry[]) => void }) {
  const info = sectionInfo[type];
  const update = (id: string, field: keyof Omit<Entry, 'id'>, value: string) =>
    onChange(entries.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry));
  return <SectionCard id={type} title={info.title} hint={info.hint} icon={info.icon}>
    {entries.length === 0 && <p className="empty-entry">No {info.singular} added yet.</p>}
    {entries.map((entry, index) => <div className="entry-editor" key={entry.id}>
      <div className="entry-heading"><strong>{info.singular.charAt(0).toUpperCase() + info.singular.slice(1)} {index + 1}</strong>
        <button className="remove-button" type="button" onClick={() => onChange(entries.filter((item) => item.id !== entry.id))} aria-label={`Remove ${info.singular} ${index + 1}`}><Trash2 size={15} /> Remove</button>
      </div>
      <div className="field-grid">
        <Field label={info.titleLabel} value={entry.title} onChange={(value) => update(entry.id, 'title', value)} />
        <Field label={info.organizationLabel} value={entry.organization} onChange={(value) => update(entry.id, 'organization', value)} />
        <Field label="Location" value={entry.location} onChange={(value) => update(entry.id, 'location', value)} placeholder="City, country or remote" />
        <div className="date-grid">
          <Field label="Start date" value={entry.startDate} onChange={(value) => update(entry.id, 'startDate', value)} placeholder="e.g. Jan 2022" />
          <Field label="End date" value={entry.endDate} onChange={(value) => update(entry.id, 'endDate', value)} placeholder="e.g. Present" />
        </div>
      </div>
      <Field label="Description" value={entry.description} onChange={(value) => update(entry.id, 'description', value)} multiline placeholder="Describe your impact, responsibilities, or achievements." hint="Use a new line for each detail." />
    </div>)}
    <button className="add-button" type="button" onClick={() => onChange([...entries, newEntry()])}><Plus size={16} /> Add {info.singular}</button>
  </SectionCard>;
}

function initialDocument() {
  try { return loadDocument(window.localStorage); }
  catch { return { data: blankDocument(), error: 'Browser storage is unavailable. Your changes cannot be saved on this device.' }; }
}

export default function App() {
  const [loaded] = useState(initialDocument);
  const [data, setData] = useState<DocumentData>(loaded.data);
  const [storageError, setStorageError] = useState<string | null>(loaded.error);
  const [blocked, setBlocked] = useState(Boolean(loaded.error));
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (blocked) return;
    try { saveDocument(window.localStorage, data); setStorageError(null); }
    catch { setStorageError('Could not save your changes in this browser. Check storage permissions or available space.'); }
  }, [data, blocked]);

  function changeResume(field: TextField, value: string) {
    setData((previous) => ({ ...previous, resume: { ...previous.resume, [field]: value } }));
    setScore(null);
  }
  function changeEntries(field: SectionName, entries: Entry[]) {
    setData((previous) => ({ ...previous, resume: { ...previous.resume, [field]: entries } }));
    setScore(null);
  }
  async function handlePdf() {
    setPdfError(null);
    setExporting(true);
    try { await downloadPdf(data.resume); }
    catch { setPdfError('Could not create the PDF. Please try again or check your browser settings.'); }
    finally { setExporting(false); }
  }

  const nav = [
    { id: 'personal', label: 'Personal details', icon: <UserRound size={16} /> },
    { id: 'summary', label: 'Professional summary', icon: <FileText size={16} /> },
    { id: 'experience', label: 'Experience', icon: <BriefcaseBusiness size={16} /> },
    { id: 'education', label: 'Education', icon: <GraduationCap size={16} /> },
    { id: 'skills', label: 'Skills', icon: <Wrench size={16} /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={16} /> },
    { id: 'ats-check', label: 'Resume check', icon: <ScanLine size={16} /> },
  ];
  const r = data.resume;

  return <div className="app-shell">
    <header className="topbar"><a href="#top" className="brand"><span className="brand-mark"><FileText size={19} /></span><span>resume<span className="brand-light">studio</span><small>YOUR CAREER, ON PAPER</small></span></a>
      <div className="topbar-right"><span className="privacy-note"><LockKeyhole size={14} /> Private to this browser</span><span className="avatar" aria-hidden="true">RS</span></div>
    </header>
    <div className="workspace" id="top">
      <aside className="sidebar" aria-label="Resume sections">
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <div className="sidebar-current"><LayoutDashboard size={17} /> Resume builder</div>
        <div className="sidebar-label section-nav-label">RESUME SECTIONS</div>
        <nav>{nav.map((item, index) => <a href={`#${item.id}`} key={item.id}><span>{item.icon}</span>{item.label}<small>{String(index + 1).padStart(2, '0')}</small></a>)}</nav>
        <div className="sidebar-tip"><span><Lightbulb size={17} /></span><strong>A little tip</strong><p>Specific achievements help your resume stand out.</p></div>
      </aside>
      <main className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><span></span> YOUR RESUME WORKSPACE</div><h1>Let’s build your story<span>.</span></h1><p>Everything you need to create a resume that feels like you.</p></div>
          <button type="button" className="primary-button download-top" onClick={handlePdf} disabled={exporting}><ArrowDownToLine size={16} /> {exporting ? 'Creating PDF…' : 'Download PDF'}</button>
        </div>
        {storageError && <div className="alert" role="alert"><CircleAlert size={18} /><div>{storageError}{blocked && <button type="button" className="inline-button" onClick={() => setBlocked(false)}>Replace saved data</button>}</div></div>}
        {pdfError && <div className="alert" role="alert"><CircleAlert size={18} /> {pdfError}</div>}
        <div className="columns">
          <div className="editor-column">
            <div className="column-heading"><div><span className="step-number">01</span><div><h2>Build your resume</h2><p>Start with the essentials, then make it yours.</p></div></div><span className="autosave"><span></span>{storageError ? 'Not saved' : 'Saved locally'}</span></div>
            <SectionCard id="personal" title="Personal details" hint="Let’s start with the basics." icon={<UserRound size={18} />}>
              <div className="field-grid">
                <Field label="Full name" value={r.name} onChange={(v) => changeResume('name', v)} placeholder="e.g. Alex Morgan" />
                <Field label="Professional title" value={r.headline} onChange={(v) => changeResume('headline', v)} placeholder="e.g. Product Designer" />
                <Field label="Email address" value={r.email} onChange={(v) => changeResume('email', v)} placeholder="you@example.com" />
                <Field label="Phone number" value={r.phone} onChange={(v) => changeResume('phone', v)} placeholder="+1 (555) 000-0000" />
                <Field label="Location" value={r.location} onChange={(v) => changeResume('location', v)} placeholder="City, country" />
                <Field label="Website or LinkedIn" value={r.website} onChange={(v) => changeResume('website', v)} placeholder="linkedin.com/in/you" />
              </div>
            </SectionCard>
            <SectionCard id="summary" title="Professional summary" hint="A little introduction goes a long way." icon={<FileText size={18} />}>
              <Field label="Your summary" value={r.summary} onChange={(v) => changeResume('summary', v)} multiline placeholder="A brief introduction to who you are, what you do, and what you bring to the table." />
            </SectionCard>
            {(['experience', 'education'] as const).map((type) => <EntriesEditor key={type} type={type} entries={r[type]} onChange={(entries) => changeEntries(type, entries)} />)}
            <SectionCard id="skills" title="Skills" hint="What are you great at?" icon={<Wrench size={18} />}>
              <Field label="Your skills" value={r.skills} onChange={(v) => changeResume('skills', v)} multiline placeholder="e.g. Research, Figma, Project management" hint="Separate skills with commas or new lines." />
            </SectionCard>
            <EntriesEditor type="projects" entries={r.projects} onChange={(entries) => changeEntries('projects', entries)} />
            <SectionCard id="ats-check" title="Resume check" hint="Get a little more confident before you apply." icon={<ScanLine size={18} />}>
              <div className="score-intro"><Sparkles size={18} /><p>Get a quick readiness check and see how your resume matches a role.</p></div>
              <Field label="Job description (optional)" value={data.jobDescription} onChange={(value) => { setData((previous) => ({ ...previous, jobDescription: value })); setScore(null); }} multiline placeholder="Paste a job description here to check for keyword matches." hint="Saved only in this browser, along with your resume." />
              <button type="button" className="score-button" onClick={() => setScore(scoreResume(r, data.jobDescription))}><ScanLine size={16} /> Check my resume <ArrowRight size={16} /></button>
              <p className="score-disclaimer">These are simple estimates, not actual employer ATS scores or a guarantee of results.</p>
              {score && <div className="score-results" aria-live="polite">
                <div className="score-block"><div><span>GENERAL READINESS</span><strong>{score.readiness}<small>/ 100</small></strong></div><p>Based on six resume completeness checks.</p></div>
                <div className="score-block"><div><span>JOB DESCRIPTION MATCH</span><strong>{score.match ? <>{score.match.score}<small>/ 100</small></> : '—'}</strong></div><p>{score.match ? 'Share of distinct job-description keywords found in your resume.' : score.matchMessage}</p></div>
                <h4>What to work on</h4>
                <ul className="feedback-list">{score.checks.map((check) => <li key={check.label}><span className={check.passed ? 'check-pass' : 'check-missing'}>{check.passed ? <Check size={13} /> : '!'}</span><span>{check.passed ? check.label : check.advice} <small>({check.points} pts)</small></span></li>)}</ul>
                {score.match && <div className="keywords"><h4>Keyword comparison</h4><p><strong>Found:</strong> {score.match.matched.join(', ') || 'None yet'}</p><p><strong>Not found:</strong> {score.match.missing.join(', ') || 'None'}</p><p>Only add terms that accurately reflect your experience.</p></div>}
              </div>}
            </SectionCard>
          </div>
          <div className="preview-column">
            <div className="column-heading"><div><span className="step-number">02</span><div><h2>Your live preview</h2><p>A little glimpse of the finished product.</p></div></div><span className="live-tag"><span></span> LIVE</span></div>
            <div className="preview-toolbar"><div><span className="paper-icon"><FileText size={17} /></span><div><strong>Resume preview</strong><small>Updates as you type</small></div></div><span className="preview-format">A4</span></div>
            <div className="preview-stage"><ResumePreview resume={r} /></div>
            <div className="preview-footer"><span><LockKeyhole size={14} /> Your data stays on this device</span><button type="button" onClick={handlePdf} disabled={exporting}><ArrowDownToLine size={15} /> Download PDF</button></div>
            <div className="preview-note"><span><Sparkles size={17} /></span><div><strong>Made for your next move</strong><p>Keep it clear, relevant, and uniquely yours. You’ve got this.</p></div></div>
          </div>
        </div>
        <footer className="page-footer"><span>© Resume Studio · Made for your next chapter</span><span><LinkIcon size={13} /> Your data, your story.</span></footer>
      </main>
    </div>
  </div>;
}
