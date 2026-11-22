import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('resume persists, scores on demand, and downloads a text-based multipage PDF', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Full name').fill('José Morgan');
  await page.getByLabel('Professional title').fill('Software Engineer');
  await page.getByLabel('Email address').fill('alex@example.com');
  await page.getByLabel('Phone number').fill('123456');
  await page.getByLabel('Your summary').fill('A software engineer who builds reliable products for customers.');
  await page.getByLabel('Your skills').fill('React, TypeScript, accessibility');
  await page.getByRole('button', { name: 'Add experience' }).click();
  await page.getByLabel('Job title').fill('Developer');
  await page.getByLabel('Company').fill('Example Co');
  await page.getByLabel('Description', { exact: true }).fill(Array.from({ length: 100 }, (_, i) => `Achievement ${i + 1}: built accessible applications with React.`).join('\n'));
  await page.getByLabel('Job description (optional)').fill('React TypeScript Python');
  await page.reload();
  await expect(page.getByLabel('Full name')).toHaveValue('José Morgan');
  await expect(page.getByLabel('Job description (optional)')).toHaveValue('React TypeScript Python');
  await expect(page.getByText('GENERAL READINESS')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check my resume' }).click();
  await expect(page.getByText('JOB DESCRIPTION MATCH')).toBeVisible();
  await expect(page.getByText('Not found:').locator('..')).toContainText('python');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toBe('José-Morgan-resume.pdf');
  const path = await download.path();
  expect(path).not.toBeNull();
  const info = execFileSync('pdfinfo', [path!], { encoding: 'utf8' });
  expect(Number(info.match(/^Pages:\s+(\d+)/m)?.[1])).toBeGreaterThan(1);
  const text = execFileSync('pdftotext', ['-layout', path!, '-'], { encoding: 'utf8' });
  expect(text).toContain('José Morgan');
  expect(text).toContain('Achievement 1:');
  expect(text).toContain('Achievement 100:');
});

test('mobile layout keeps editor and preview usable without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByLabel('Full name').fill('Taylor');
  await expect(page.getByLabel('Resume preview')).toContainText('Taylor');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(await page.getByLabel('Full name').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.getByLabel('Resume preview').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
});

test('workspace panels fill available width without outer side gutters', async ({ page }) => {
  for (const width of [320, 375, 760, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const layout = await page.evaluate(() => {
      const workspace = document.querySelector('.workspace')!.getBoundingClientRect();
      const main = document.querySelector('.main-content')!.getBoundingClientRect();
      const columns = document.querySelector('.columns')!.getBoundingClientRect();
      const sidebar = document.querySelector('.sidebar')!;
      return {
        workspaceLeft: workspace.left,
        workspaceRight: workspace.right,
        mainLeft: main.left,
        columnsLeft: columns.left,
        columnsRight: columns.right,
        sidebarRight: getComputedStyle(sidebar).display === 'none' ? 0 : sidebar.getBoundingClientRect().right,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(layout.workspaceLeft).toBe(0);
    expect(layout.workspaceRight).toBe(width);
    expect(layout.mainLeft).toBe(layout.sidebarRight);
    expect(layout.columnsLeft).toBe(layout.mainLeft);
    expect(layout.columnsRight).toBe(width);
    expect(layout.scrollWidth).toBeLessThanOrEqual(width);
  }
});

test('right preview stays in view while the editor scrolls and remains usable on short screens', async ({ page }) => {
  for (const height of [900, 500]) {
    await page.setViewportSize({ width: 1440, height });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 900));
    const preview = page.locator('.preview-column');
    await expect.poll(async () => Math.round((await preview.boundingBox())!.y)).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect.poll(async () => Math.round((await preview.boundingBox())!.y)).toBe(0);
    const dimensions = await preview.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return { top: element.scrollTop, height: element.clientHeight, content: element.scrollHeight };
    });
    expect(dimensions.height).toBeLessThanOrEqual(height);
    if (dimensions.content > dimensions.height) expect(dimensions.top).toBeGreaterThan(0);
    await expect(preview.getByRole('button', { name: 'Download PDF' })).toBeVisible();
  }
});

test('mobile preview scrolls with the page without obscuring the editor', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const preview = page.locator('.preview-column');
  expect(await preview.evaluate((element) => getComputedStyle(element).position)).toBe('static');
  await page.getByLabel('Full name').scrollIntoViewIfNeeded();
  await page.getByLabel('Full name').fill('Taylor');
  await expect(page.getByLabel('Full name')).toHaveValue('Taylor');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('left navigation stays visible and scrolls independently on short desktop screens', async ({ page }) => {
  for (const height of [900, 400]) {
    await page.setViewportSize({ width: 1440, height });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 900));
    const sidebar = page.getByLabel('Resume sections', { exact: true });
    await expect.poll(async () => Math.round((await sidebar.boundingBox())!.y)).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 1600));
    await expect.poll(async () => Math.round((await sidebar.boundingBox())!.y)).toBe(0);
    const dimensions = await sidebar.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return { top: element.scrollTop, height: element.clientHeight, content: element.scrollHeight };
    });
    expect(dimensions.height).toBeLessThanOrEqual(height);
    if (dimensions.content > dimensions.height) expect(dimensions.top).toBeGreaterThan(0);
    await sidebar.getByRole('link', { name: /Resume check/ }).click();
    await expect(page.locator('#ats-check')).toBeInViewport();
  }
});

test('mobile section navigation remains accessible without covering the editor', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 900));
  const menu = page.locator('.mobile-navigation');
  await expect.poll(async () => Math.round((await menu.boundingBox())!.y)).toBe(0);
  await page.getByText('Resume sections', { exact: true }).click();
  await page.getByRole('navigation', { name: 'Mobile resume sections' }).getByRole('link', { name: 'Skills' }).click();
  await expect(page.locator('#skills')).toBeInViewport();
  await expect(menu.locator('nav')).toBeHidden();
  await page.getByLabel('Your skills').fill('Testing, Accessibility');
  await expect(page.getByLabel('Your skills')).toHaveValue('Testing, Accessibility');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('imports a real exported PDF locally after review and preserves unchecked data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Full name').fill('Jordan Smith');
  await page.getByLabel('Professional title').fill('Software Engineer');
  await page.getByLabel('Email address').fill('jordan@example.com');
  await page.getByLabel('Your summary').fill('Builds reliable systems for customers.');
  await page.getByLabel('Your skills').fill('React, TypeScript, Testing');
  await page.getByLabel('Additional information').fill('Certifications: Example credential');
  await page.getByRole('button', { name: 'Add experience' }).click();
  await page.getByLabel('Job title').fill('Engineer');
  await page.getByLabel('Company').fill('Example Corp');
  await page.getByLabel('Description', { exact: true }).fill('Built accessible apps.');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).first().click(),
  ]);
  const pdfPath = await download.path();
  expect(pdfPath).not.toBeNull();
  await page.getByLabel('Full name').fill('Existing Person');
  await page.getByLabel('Your skills').fill('Existing skills');
  await page.getByLabel('Job description (optional)').fill('Keep this job description');
  await page.getByLabel('Choose PDF resume').setInputFiles({
    name: 'resume.pdf', mimeType: 'application/pdf', buffer: readFileSync(pdfPath!),
  });
  await expect(page.getByRole('heading', { name: /Review import/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveValue('Existing Person');
  await expect(page.getByRole('checkbox', { name: /Full name/ })).toBeChecked();
  await page.getByRole('checkbox', { name: /Full name/ }).uncheck();
  await page.getByRole('button', { name: 'Apply selected fields' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Existing Person');
  await expect(page.getByLabel('Your skills')).toHaveValue('React, TypeScript, Testing');
  await expect(page.getByLabel('Additional information')).toHaveValue('Certifications: Example credential');
  await expect(page.getByLabel('Job description (optional)')).toHaveValue('Keep this job description');
  await expect(page.getByLabel('Job title')).toHaveValue('Engineer');
  await expect(page.getByLabel('Company')).toHaveValue('Example Corp');
  await expect(page.getByLabel('Description', { exact: true })).toContainText('Built accessible apps.');
  await page.reload();
  await expect(page.getByLabel('Your skills')).toHaveValue('React, TypeScript, Testing');
  await expect(page.getByLabel('Additional information')).toHaveValue('Certifications: Example credential');
});

test('reports a PDF with no selectable text', async ({ browser, page }) => {
  const blankPage = await browser.newPage();
  await blankPage.setContent('<html><body></body></html>');
  const blankPdf = await blankPage.pdf();
  await blankPage.close();
  await page.goto('/');
  await page.getByLabel('Full name').fill('Original');
  await page.getByLabel('Choose PDF resume').setInputFiles({
    name: 'scan.pdf', mimeType: 'application/pdf', buffer: blankPdf,
  });
  await expect(page.getByRole('alert')).toContainText('Scanned or image-only PDFs are not supported');
  await expect(page.getByLabel('Full name')).toHaveValue('Original');
});

test('rejects a damaged PDF without changing existing fields', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Full name').fill('Original');
  await page.getByLabel('Choose PDF resume').setInputFiles({
    name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF'),
  });
  await expect(page.getByRole('alert')).toContainText('Could not read this PDF');
  await expect(page.getByLabel('Full name')).toHaveValue('Original');
});

test('reports password-protected PDFs without changing the resume', async ({ page }) => {
  const encryptedPdf = execFileSync(process.execPath, ['-e', `
    const pdf = require('pdfmake/build/pdfmake');
    const fonts = require('pdfmake/build/vfs_fonts');
    pdf.createPdf({ content: ['Private resume'], userPassword: 'secret' }, undefined, undefined, fonts)
      .getBuffer(buffer => process.stdout.write(buffer));
  `]);
  await page.goto('/');
  await page.getByLabel('Full name').fill('Original');
  await page.getByLabel('Choose PDF resume').setInputFiles({
    name: 'protected.pdf', mimeType: 'application/pdf', buffer: encryptedPdf,
  });
  await expect(page.getByRole('alert')).toContainText('Password-protected PDFs are not supported');
  await expect(page.getByLabel('Full name')).toHaveValue('Original');
});
