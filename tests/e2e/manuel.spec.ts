import { test, expect } from '@playwright/test';

/** Captures du manuel (projet « bureau » uniquement) : npm run manuel. */
test('captures du manuel', async ({ page }, info) => {
  test.skip(info.project.name !== 'bureau', 'captures au format bureau');
  test.setTimeout(120_000);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible();
  const prise = (nom: string) => page.screenshot({ path: `docs/manuel/img/${nom}.png`, fullPage: true });
  await prise('01-geometrie-charges');
  await page.getByRole('tab', { name: '2. Matériaux et armatures' }).click(); await prise('02-materiaux-armatures');
  await page.getByRole('tab', { name: '3. Résultats' }).click(); await prise('03-resultats-synthese');
  await page.getByRole('tab', { name: 'Efforts', exact: true }).click(); await prise('04-resultats-efforts');
  await page.getByRole('tab', { name: 'ELS', exact: true }).click(); await prise('05-resultats-els');
  await page.getByRole('tab', { name: 'Vérifications', exact: true }).click(); await prise('06-resultats-verifications');
  await page.getByRole('tab', { name: '4. Documents' }).click(); await prise('07-documents');
  await page.getByRole('button', { name: 'Ouvrir la note (imprimer / PDF)' }).click();
  await prise('08-note-de-calcul');
  await page.getByRole('button', { name: 'Fermer' }).click();
  // Option feu et projet
  await page.getByRole('tab', { name: '2. Matériaux et armatures' }).click();
  await page.getByLabel('Vérifier la résistance au feu (EN 1992-1-2)').check();
  await prise('09-option-feu');
  await page.getByRole('tab', { name: '4. Documents' }).click();
  await prise('10-documents-plans');
  await page.getByRole('button', { name: 'Projet', exact: true }).click();
  await page.getByRole('tab', { name: '1. Géométrie et charges' }).click();
  await prise('11-projet');
});
