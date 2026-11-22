import { ArrowRight, Check, ClipboardCheck, FileText, LockKeyhole, ScanLine, Sparkles } from 'lucide-react';
import { entryHasContent, type Resume } from './model';
import type { ReadinessResult } from './scoring';

function hasContent(resume: Resume): boolean {
  return [resume.name, resume.headline, resume.email, resume.phone, resume.location, resume.website,
    resume.summary, resume.skills, resume.additionalInfo].some((value) => value.trim()) ||
    [...resume.experience, ...resume.education, ...resume.projects].some(entryHasContent);
}

export default function Dashboard({ resume, score, onCheck, onEdit }: {
  resume: Resume;
  score: ReadinessResult | null;
  onCheck: () => void;
  onEdit: () => void;
}) {
  const empty = !hasContent(resume);
  const weaknesses = score?.checks.filter((check) => !check.passed).sort((a, b) => b.points - a.points) ?? [];
  return <main className="dashboard">
    <div className="dashboard-heading">
      <div>
        <div className="eyebrow"><span /> YOUR RESUME DASHBOARD</div>
        <h1>A clearer path to <em>what’s next.</em></h1>
        <p>Understand where your resume stands and make your next improvement with confidence.</p>
      </div>
      <button className="dashboard-editor-link" type="button" onClick={onEdit}>Open resume editor <ArrowRight size={17} /></button>
    </div>
    <div className="dashboard-grid">
      <section className="dashboard-score-card" aria-labelledby="readiness-title">
        <div className="dashboard-card-label"><span><ScanLine size={17} /> RESUME READINESS</span><span className="dashboard-estimate">ESTIMATE</span></div>
        <h2 id="readiness-title">Your resume, at a glance.</h2>
        <p className="dashboard-score-description">A practical check for the building blocks of a clear, informative resume.</p>
        <div className="dashboard-score-area" aria-live="polite">
          <div className="dashboard-score-ring" aria-label={score && !empty ? `Readiness score ${score.readiness} out of 100` : 'Readiness score not calculated'}>
            <strong>{score && !empty ? score.readiness : '—'}</strong><span> / 100</span>
          </div>
          <div className="dashboard-score-copy">
            <span className="dashboard-kicker">{score && !empty ? 'YOUR READINESS ESTIMATE' : 'READY WHEN YOU ARE'}</span>
            <h3>{score && !empty ? (weaknesses.length ? 'A good place to grow.' : 'Your foundations look strong.') : 'Let’s see where you stand.'}</h3>
            <p>{empty ? 'Add or import a resume in the editor to get started.' : score ? `${score.checks.length - weaknesses.length} of ${score.checks.length} checks passed. See the suggestions alongside your score.` : 'Run a check whenever you want an updated view of your resume.'}</p>
          </div>
        </div>
        <button className="dashboard-check-button" type="button" onClick={onCheck}><Sparkles size={17} /> Check my readiness <ArrowRight size={17} /></button>
        <p className="dashboard-disclaimer">A rule-based estimate, not an actual employer ATS score or a prediction of hiring outcomes.</p>
      </section>
      <section className="dashboard-feedback-card" aria-labelledby="feedback-title">
        <div className="dashboard-card-label"><span><ClipboardCheck size={17} /> YOUR NEXT STEPS</span></div>
        <h2 id="feedback-title">Make every detail count.</h2>
        <p className="dashboard-feedback-intro">Small, honest improvements can make your experience easier to understand.</p>
        {!score && <div className="dashboard-placeholder"><span><ScanLine size={22} /></span><strong>Insights are waiting</strong><p>Check your readiness to see personalized suggestions here.</p></div>}
        {score && empty && <div className="dashboard-placeholder"><span><FileText size={22} /></span><strong>Start with your resume</strong><p>Add your details or import a PDF in the editor, then come back for your readiness estimate.</p><button type="button" className="dashboard-text-button" onClick={onEdit}>Go to editor <ArrowRight size={15} /></button></div>}
        {score && !empty && weaknesses.length === 0 && <div className="dashboard-placeholder"><span><Check size={22} /></span><strong>All checks passed</strong><p>Your resume meets every check in this rubric. Review it for accuracy and tailor it to each opportunity.</p></div>}
        {score && !empty && weaknesses.length > 0 && <ol className="dashboard-weaknesses">{weaknesses.map((check) => <li key={check.label}>
          <span className="dashboard-weakness-icon"><ArrowRight size={15} /></span>
          <div><div className="dashboard-weakness-title"><strong>{check.label}</strong><span>{check.points} pts</span></div><p>{check.advice}</p></div>
        </li>)}</ol>}
        {score && !empty && <details className="dashboard-rubric"><summary>See all scoring criteria</summary><ul>{score.checks.map((check) => <li key={check.label}><span>{check.passed ? 'Passed' : 'Not yet'}</span> {check.label} <small>({check.points} points)</small></li>)}</ul></details>}
      </section>
    </div>
    <div className="dashboard-bottom">
      <div className="dashboard-tip-card"><span><Sparkles size={19} /></span><div><strong>Make it yours</strong><p>Use the editor to refine your story, import a PDF, or compare it with a job description.</p></div></div>
      <div className="dashboard-privacy"><LockKeyhole size={15} /><span>Your resume stays in this browser.</span></div>
    </div>
  </main>;
}
