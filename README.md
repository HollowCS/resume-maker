# Resume Studio

A browser-based resume builder with a live preview, downloadable text-based PDF, and explainable resume estimates. No account or server is required.

## Getting started

Install Node.js 20 or newer (including npm), then clone the repository and start the app:

```sh
git clone https://github.com/HollowCS/resume-maker.git
cd resume-maker
npm ci
npm run dev
```

Open the local URL printed by Vite (normally [http://localhost:5173/](http://localhost:5173/); Vite chooses another port if it is in use). Stop the server with `Ctrl+C`.

The home dashboard provides an on-demand readiness estimate and prioritized improvement suggestions. Select **Open resume editor** to add personal details, a summary, experience, education, skills, projects, and additional information such as certifications. Entries can be added or removed, and the preview updates as you type. Select **Download PDF** to generate an A4 PDF in the browser; longer resumes can span multiple pages. Use **Home** or **Editor** to switch views.

## Import a PDF resume

Select **Choose PDF resume** to extract selectable text from an existing PDF (up to 15 MB). Extraction runs locally in the browser; the file is not sent to a server. Review the suggested fields, uncheck any you do not want to replace, and choose **Apply selected fields**. Fields not selected and the job description remain unchanged. You can cancel the import without changing your resume.

The importer recognizes common section headings and makes a best-effort guess at contact details and section contents. It can separate some experience and education entries and preserves recognized additional information; other formats may still be grouped together. Review the editable result, and use **View all extracted text** to copy anything the importer missed. Complex layouts, columns, and uncommon headings may not parse correctly. Scanned or image-only PDFs, password-protected PDFs, and files without selectable text are not supported; pages without text are identified during review.

## Resume check

Select **Check my readiness** on the home dashboard to calculate an estimate and see prioritized suggestions, or **Check my resume** in the editor for the same readiness checks. The eight checks award 10 points for a name and title, 10 for contact details, 10 for a summary of at least 40 characters, 15 for an experience or project entry with a title and description, 10 for education or training, 10 for at least three skills, 20 for an experience or project description of at least 40 characters, and 15 for a measurable result expressed with a recognized unit. Open **See all scoring criteria** on the dashboard for the individual results. The checks are simple heuristics: a score is not a judgment of the truth or quality of the content, and you should never invent achievements or figures.

The job description is optional and is checked only in the editor. When provided, the app also estimates the percentage of distinct, meaningful words in the job description that appear in the resume, after removing common words and standalone numbers. It shows found and missing terms; include missing terms only when they genuinely reflect your experience. Descriptions without meaningful keywords do not get a match score. Editing or importing resume data clears previous results until you check again; editing the job description clears the editor result but not the dashboard's general-readiness estimate.

**These are simple, rule-based estimates, not actual employer ATS scores.** They do not measure all aspects of a resume, predict a hiring outcome, or reproduce a particular employer's screening system.

## Privacy and storage

Resume data and the optional job description are stored in the browser's local storage on the current device and are not sent to a server by the app. Storage is tied to the exact browser origin, so changing the host or port can make saved data appear unavailable. Data does not sync across browsers or devices and can be lost when browser data is cleared. Shared-device users should clear site data when finished.

If saved data is unreadable, the app protects it from automatic overwrite and offers an explicit option to replace it. If browser storage is unavailable or full, an error is shown; changes are not safely persisted until storage works.

## Validation

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests require Chromium and the `pdfinfo` and `pdftotext` utilities from Poppler. To use an existing Chrome installation instead of Playwright's browser, set `CHROME_PATH` to its executable when running `npm run test:e2e`.
