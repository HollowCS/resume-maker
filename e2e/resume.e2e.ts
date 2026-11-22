import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

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
});
