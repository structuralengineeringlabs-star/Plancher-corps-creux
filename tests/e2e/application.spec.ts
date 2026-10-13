import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';

const ETAPES = ['1. Géométrie et charges', '2. Matériaux et armatures', '3. Résultats', '4. Documents'];
async function demarrer(page: Page) {
  const erreurs: string[] = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible();
  return erreurs;
}
const debordement = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test('parcours des 4 étapes sans erreur ni débordement horizontal', async ({ page }) => {
  const erreurs = await demarrer(page);
  for (const e of ETAPES) {
    await page.getByRole('tab', { name: e }).click();
    expect(await debordement(page), `débordement à l'étape ${e}`).toBeLessThanOrEqual(1);
  }
  for (const o of ['Synthèse', 'Efforts', 'Flexion', 'Effort tranchant', 'ELS', 'Vérifications']) {
    await page.getByRole('tab', { name: ETAPES[2] }).click();
    await page.getByRole('tab', { name: o, exact: true }).click();
    expect(await debordement(page), `débordement à l'onglet ${o}`).toBeLessThanOrEqual(1);
  }
  expect(erreurs).toEqual([]);
});

test('onglets au clavier (flèches)', async ({ page }) => {
  await demarrer(page);
  await page.getByRole('tab', { name: ETAPES[0] }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: ETAPES[1] })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: ETAPES[3] })).toHaveAttribute('aria-selected', 'true');
});

test('saisie invalide : verdict « non vérifié » et message, puis retour à la normale', async ({ page }) => {
  await demarrer(page);
  const L = page.getByLabel("Portée L (entre axes d'appuis)");
  await L.fill('-5');
  await expect(page.getByText('NON VÉRIFIÉ')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Données à corriger' })).toContainText('Portée L');
  await L.fill('4');
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible();
});

test('aide contextuelle accessible au toucher', async ({ page }) => {
  await demarrer(page);
  const aide = page.getByRole('button', { name: 'Aide' }).first();
  await aide.click();
  await expect(aide).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('note').first()).toBeVisible();
});

test('portée trop grande : non conforme, puis proposition d\'armatures', async ({ page }) => {
  await demarrer(page);
  await page.getByLabel("Portée L (entre axes d'appuis)").fill('5,2');
  await expect(page.getByText('NON CONFORME')).toBeVisible();
  await page.getByRole('tab', { name: ETAPES[1] }).click();
  await page.getByRole('button', { name: 'Proposer des armatures' }).click();
  await expect(page.getByText(/As requis .* fourni .* ✓/).first()).toBeVisible();
});

test('poutrelle isostatique : chapeaux de construction et verdict', async ({ page }) => {
  await demarrer(page);
  await page.getByLabel('Appuis de la poutrelle').selectOption('simple');
  await expect(page.getByLabel('Nombre de travées')).toHaveCount(0);
  await page.getByRole('tab', { name: ETAPES[1] }).click();
  await expect(page.getByLabel('Chapeaux de construction : nombre par appui')).toBeVisible();
});

test('projet multi-planchers : ajout, duplication, suppression confirmée, persistance', async ({ page }) => {
  await demarrer(page);
  await page.getByRole('button', { name: '+ Plancher' }).click();
  await page.getByRole('button', { name: 'Dupliquer' }).click();
  await expect(page.locator('#plancher-actif option')).toHaveCount(3);
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.locator('#plancher-actif option')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('#plancher-actif option')).toHaveCount(2);
});

test('enregistrement et réouverture d\'un projet .plancher.json', async ({ page }) => {
  await demarrer(page);
  await page.getByLabel('Hauteur du corps creux').fill('250');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Enregistrer' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.plancher\.json$/);
  const chemin = await dl.path();
  const contenu = JSON.parse(readFileSync(chemin!, 'utf8'));
  expect(contenu.format).toBe(1);
  expect(contenu.application).toBe('plancher-ec2');
  expect(contenu.planchers[0].entree.hCorps).toBe(250);
  await page.getByRole('button', { name: 'Nouveau' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remplacer' }).click();
  await page.getByLabel('Fichier projet').setInputFiles(chemin!);
  await expect(page.getByLabel('Hauteur du corps creux')).toHaveValue('250');
});

test('un fichier d\'une autre application est refusé', async ({ page }) => {
  await demarrer(page);
  await page.getByLabel('Fichier projet').setInputFiles({ name: 'autre.poutre.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 2, application: 'poutres-ec2', poutres: [] })) });
  await expect(page.getByRole('status')).toContainText('Import impossible');
});

test('documents : note paginée et nomenclature', async ({ page }) => {
  await demarrer(page);
  await page.getByRole('tab', { name: ETAPES[3] }).click();
  await expect(page.getByText('étrier triangulaire', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir la note (imprimer / PDF)' }).click();
  await expect(page.getByRole('heading', { name: 'Sommaire' })).toBeVisible();
  await expect(page.getByText(/Figure 1 —/).first()).toBeVisible();
  expect(await debordement(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('tab', { name: ETAPES[3] })).toBeVisible();
});

test('robustesse : projet enregistré corrompu', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('plancher-ec2-projet', '{ corrompu'));
  await page.reload();
  await expect(page.getByRole('status')).toContainText('illisible');
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible();
});

test('étrier triangulaire dessiné et en-tête cohérent', async ({ page }) => {
  await demarrer(page);
  await page.getByRole('tab', { name: ETAPES[2] }).click();
  await expect(page.getByRole('img', { name: 'Coupe transversale en travée' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Coupe transversale sur appui' })).toBeVisible();
  await expect(page.getByText(/étrier triangulaire fermé HA6, crochet 135°/).first()).toBeVisible();
  await expect(page.getByText(/vérifications · acier \d/)).toBeVisible();
});

test('plans A3 : aperçu, export DXF, impression', async ({ page }) => {
  const erreurs = await demarrer(page);
  await page.getByRole('tab', { name: ETAPES[3] }).click();
  await expect(page.getByText("Plans d'exécution (A3)")).toBeVisible();
  await expect(page.getByRole('img', { name: /Planche 1 : Élévation, coupes et étrier/ })).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'DXF (CAO)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.dxf$/);
  const dxf = readFileSync(await dl.path()!, 'utf8');
  expect(dxf.startsWith('0\r\nSECTION')).toBe(true);
  expect(dxf).toContain('ENTITIES');
  expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
  expect(await debordement(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Imprimer / PDF', exact: true }).click();
  await expect(page.getByText('Plans A3 — aperçu')).toBeVisible();
  await expect(page.locator('.plan-feuille')).toHaveCount(2);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('tab', { name: ETAPES[3] })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('résistance au feu : option, durée, verdict et note de calcul', async ({ page }) => {
  const erreurs = await demarrer(page);
  await page.getByRole('tab', { name: ETAPES[1] }).click();
  await expect(page.getByLabel('Durée de résistance au feu')).toHaveCount(0);
  await page.getByLabel('Vérifier la résistance au feu (EN 1992-1-2)').check();
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible(); // R60 continu : a = 37 ≥ 25 mm
  await page.getByLabel('Durée de résistance au feu').selectOption('90');
  await expect(page.getByText('NON CONFORME')).toBeVisible(); // bw 120 < bmin 150 mm
  await page.getByRole('tab', { name: ETAPES[2] }).click();
  await page.getByRole('tab', { name: 'Vérifications', exact: true }).click();
  await expect(page.getByText("Largeur de la nervure (R90)", { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: ETAPES[1] }).click();
  await page.getByLabel('Durée de résistance au feu').selectOption('60');
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: ETAPES[3] }).click();
  await page.getByRole('button', { name: 'Ouvrir la note (imprimer / PDF)' }).click();
  await expect(page.getByRole('heading', { name: 'Résistance au feu' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Annexe France : la catégorie A passe à 1,5 kN/m²', async ({ page }) => {
  const erreurs = await demarrer(page);
  await expect(page.getByText('A – Habitation, planchers : qk = 2,00 kN/m²')).toBeVisible();
  await page.getByRole('tab', { name: ETAPES[1] }).click();
  await page.getByLabel('Paramètres nationaux').selectOption('FR');
  await page.getByRole('tab', { name: ETAPES[0] }).click();
  await expect(page.getByText('A – Habitation, planchers : qk = 1,50 kN/m²')).toBeVisible();
  await expect(page.getByText('CONFORME', { exact: true })).toBeVisible();
  expect(erreurs).toEqual([]);
});
