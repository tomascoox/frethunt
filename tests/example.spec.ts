import { test, expect } from '@playwright/test';

test('Kontrollera startsida', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/FretHunt/);
});
