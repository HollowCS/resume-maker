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

Add personal details, a summary, experience, education, skills, and projects. Entries can be added or removed, and the preview updates as you type. Select **Download PDF** to generate an A4 PDF in the browser; longer resumes can span multiple pages.

## Resume check

Select **Check my resume** to calculate a general readiness estimate. It awards 10 points for a name and title, 15 for contact details, 15 for a summary of at least 40 characters, 25 for a complete experience entry, 15 for education, and 20 for at least three skills.

The job description is optional. When provided, the app also estimates the percentage of distinct, meaningful words in the job description that appear in the resume, after removing common words and standalone numbers. It shows found and missing terms; include missing terms only when they genuinely reflect your experience. Descriptions without meaningful keywords do not get a match score. Editing the resume or job description clears the previous result until you check again.

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
