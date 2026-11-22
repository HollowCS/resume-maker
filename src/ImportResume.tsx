import { useId, useState, type ChangeEvent } from 'react';
import { FileUp } from 'lucide-react';
import { extractPdfText, parseResumeText } from './importResume';
import { entryHasContent, type Resume } from './model';

type FieldName = keyof Resume;
const fields: { key: FieldName; label: string }[] = [
  { key: 'name', label: 'Full name' }, { key: 'headline', label: 'Professional title' },
  { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' }, { key: 'website', label: 'Website' },
  { key: 'summary', label: 'Summary' }, { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' }, { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
];

function display(value: Resume[FieldName]): string {
  if (typeof value === 'string') return value.trim();
  return value.filter(entryHasContent).map((entry) =>
    [entry.title, entry.organization, entry.location, entry.startDate, entry.endDate, entry.description]
      .filter(Boolean).join('\n'),
  ).join('\n\n');
}

export default function ImportResume({ resume, onApply }: {
  resume: Resume;
  onApply: (imported: Resume, selected: FieldName[]) => void;
}) {
  const id = useId();
  const [result, setResult] = useState<{ resume: Resume; text: string; filename: string; emptyPages: number[] } | null>(null);
  const [selected, setSelected] = useState<FieldName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setResult(null);
    setSelected([]);
    setError(null);
    setLoading(true);
    try {
      const { text, emptyPages } = await extractPdfText(file);
      const imported = parseResumeText(text);
      const available = fields.filter(({ key }) => display(imported[key])).map(({ key }) => key);
      setSelected(available);
      setResult({ resume: imported, text, filename: file.name, emptyPages });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read this PDF. Please try another file.');
    } finally {
      setLoading(false);
    }
  }

  const available = result ? fields.filter(({ key }) => display(result.resume[key])) : [];
  return <section className="import-card" aria-labelledby={`${id}-heading`}>
    <div className="import-heading"><span className="section-icon"><FileUp size={18} /></span>
      <div><h3 id={`${id}-heading`}>Import an existing resume</h3><p>Extract selectable text from a PDF on this device.</p></div>
    </div>
    <label className="import-upload" htmlFor={id}>{loading ? 'Reading PDF…' : 'Choose PDF resume'}</label>
    <input id={id} className="visually-hidden" type="file" accept=".pdf,application/pdf" disabled={loading} onChange={handleFile} />
    {error && <p className="import-error" role="alert">{error}</p>}
    {result && <div className="import-review" aria-live="polite">
      <h4>Review import: {result.filename}</h4>
      <p>Extraction is approximate. Select the fields to apply; checked fields replace their current values. Other fields and the job description stay unchanged. Review and edit the result afterwards.</p>
      {result.emptyPages.length > 0 && <p className="import-error">No selectable text was found on {result.emptyPages.length === 1 ? 'page' : 'pages'} {result.emptyPages.join(', ')}. These pages may be scanned or image-only and were not imported.</p>}
      {available.length === 0 && <p>No recognizable fields were found. You can copy from the extracted text below into the editor.</p>}
      {available.map(({ key, label }) => <label className="import-choice" key={key}>
        <input type="checkbox" checked={selected.includes(key)} onChange={(event) => {
          setSelected((previous) => event.target.checked ? [...previous, key] : previous.filter((field) => field !== key));
        }} />
        <span><strong>{label}</strong>{display(resume[key]) && <span className="import-replace"> · replaces existing {label.toLowerCase()}</span>}
          <span className="import-value">{display(result.resume[key])}</span>
        </span>
      </label>)}
      <details className="import-raw"><summary>View all extracted text</summary><pre>{result.text}</pre></details>
      <div className="import-actions">
        <button type="button" className="score-button" disabled={!selected.length} onClick={() => {
          onApply(result.resume, selected);
          setResult(null);
          setSelected([]);
        }}>Apply selected fields</button>
        <button type="button" className="import-cancel" onClick={() => setResult(null)}>Cancel import</button>
      </div>
    </div>}
  </section>;
}
