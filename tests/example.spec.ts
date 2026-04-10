import { test, expect } from '@playwright/test';

// Detta körs innan varje test i den här filen
test.beforeEach(async ({ page }) => {
  // Vi går till den lokala servern (viktigt för automatiseringen sen!)
  await page.goto('/');

  // Letar efter knappen som stänger cookie-rutan.
  const acceptButton = page.getByRole('button', { name: /acceptera|godkänn|ok/i });

  // Vänta en liten stund för att se om rutan dyker upp
  try {
    await acceptButton.waitFor({ state: 'visible', timeout: 3000 });
    await acceptButton.click();
  } catch (e) {
    // Rutan dök inte upp inom vår timeout, vi kan strunta i det
  }
});

test('Kontrollera startsida och grundläggande sektioner', async ({ page }) => {
  // 1. Kolla titeln
  await expect(page).toHaveTitle(/Master the Guitar Fretboard | FretHunt/);

  // 2. Verifiera att instruktionssektionen är synlig
  await expect(page.getByRole('heading', { name: 'How to Use FretHunt', exact: true })).toBeVisible();
});
