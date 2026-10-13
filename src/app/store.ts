/**
 * Projet multi-planchers : identification commune, liste de planchers (une poutrelle type par plancher), sauvegarde
 * automatique dans le navigateur et fichiers .plancher.json (format 1).
 */
import { useCallback, useEffect, useState } from 'react';
import type { PlancherInput } from '../plancher/types';
import { PAR_DEFAUT } from '../plancher/validation';
import { log } from '../diagnostics';

export const FORMAT = 1;
const CLE = 'plancher-ec2-projet';

export interface Identification {
  projet: string; client: string; reference: string; repere: string;
  auteur: string; verificateur: string; indice: string;
}
export const ID_DEFAUT: Identification = { projet: 'Projet', client: '', reference: 'PL-2026-001', repere: 'Plancher P1', auteur: '', verificateur: '', indice: 'A' };
export interface Plancher { id: string; repere: string; entree: PlancherInput }
export interface FichierProjet { format: number; application: 'plancher-ec2'; identification: Identification; planchers: Plancher[]; active: string }

const nouvelId = () => Math.random().toString(36).slice(2, 10);
export const nouveauPlancher = (repere = 'Plancher P1', entree: PlancherInput = PAR_DEFAUT): Plancher => ({ id: nouvelId(), repere, entree: structuredClone(entree) });
const projetVide = (): FichierProjet => { const p = nouveauPlancher(); return { format: FORMAT, application: 'plancher-ec2', identification: ID_DEFAUT, planchers: [p], active: p.id }; };

/** Lecture tolérante : champs manquants complétés par les valeurs par défaut ; fichiers d'une autre application refusés. */
export function lireProjet(texte: string): FichierProjet {
  const brut = JSON.parse(texte);
  if (!brut || typeof brut !== 'object') throw new Error("Ce fichier n'est pas un projet de plancher.");
  if (brut.application && brut.application !== 'plancher-ec2') throw new Error(`Ce fichier appartient à une autre application (${String(brut.application)}).`);
  if (typeof brut.format === 'number' && brut.format > FORMAT) throw new Error(`Projet enregistré avec une version plus récente (format ${brut.format}).`);
  if (!Array.isArray(brut.planchers) || !brut.planchers.length) throw new Error("Ce fichier n'est pas un projet de plancher (.plancher.json).");
  const identification = { ...ID_DEFAUT, ...(brut.identification ?? {}) };
  const planchers: Plancher[] = brut.planchers.map((p: Partial<Plancher>, k: number) => ({
    id: p.id ?? nouvelId(), repere: p.repere ?? `Plancher P${k + 1}`, entree: { ...PAR_DEFAUT, ...(p.entree ?? {}) } as PlancherInput,
  }));
  const active = planchers.some(p => p.id === brut.active) ? brut.active : planchers[0].id;
  return { format: FORMAT, application: 'plancher-ec2', identification, planchers, active };
}

function charger(): { fichier: FichierProjet; message: string | null } {
  try {
    const t = localStorage.getItem(CLE);
    return { fichier: t ? lireProjet(t) : projetVide(), message: null };
  } catch (e) {
    log('error', 'Projet enregistré illisible : nouveau projet', e);
    try { localStorage.setItem(`${CLE}-illisible`, localStorage.getItem(CLE) ?? ''); } catch { /* ignoré */ }
    return { fichier: projetVide(), message: "Le projet enregistré était illisible : un nouveau projet a été ouvert (contenu d'origine conservé dans le navigateur)." };
  }
}

export function useProjet() {
  const [init] = useState(charger);
  const [projet, setProjet] = useState<FichierProjet>(init.fichier);
  const [message, setMessage] = useState<string | null>(init.message);
  useEffect(() => { try { localStorage.setItem(CLE, JSON.stringify(projet)); } catch { /* stockage indisponible */ } }, [projet]);

  const plancher = projet.planchers.find(p => p.id === projet.active) ?? projet.planchers[0];
  const majPlancher = useCallback((f: (p: Plancher) => Plancher) => setProjet(pr => ({ ...pr, planchers: pr.planchers.map(p => (p.id === pr.active ? f(p) : p)) })), []);
  const maj = useCallback(<K extends keyof PlancherInput>(k: K, v: PlancherInput[K]) => majPlancher(p => ({ ...p, entree: { ...p.entree, [k]: v } })), [majPlancher]);
  const majPlusieurs = useCallback((x: Partial<PlancherInput>) => majPlancher(p => ({ ...p, entree: { ...p.entree, ...x } })), [majPlancher]);
  const renommer = useCallback((repere: string) => majPlancher(p => ({ ...p, repere })), [majPlancher]);
  const majId = useCallback(<K extends keyof Identification>(k: K, v: string) => setProjet(pr => ({ ...pr, identification: { ...pr.identification, [k]: v } })), []);
  const choisir = useCallback((id: string) => setProjet(pr => ({ ...pr, active: id })), []);
  const ajouter = useCallback(() => setProjet(pr => { const p = nouveauPlancher(`Plancher P${pr.planchers.length + 1}`); return { ...pr, planchers: [...pr.planchers, p], active: p.id }; }), []);
  const dupliquer = useCallback(() => setProjet(pr => {
    const src = pr.planchers.find(p => p.id === pr.active)!;
    const p = nouveauPlancher(`${src.repere} (copie)`, src.entree);
    const i = pr.planchers.indexOf(src);
    return { ...pr, planchers: [...pr.planchers.slice(0, i + 1), p, ...pr.planchers.slice(i + 1)], active: p.id };
  }), []);
  const supprimer = useCallback(() => setProjet(pr => {
    if (pr.planchers.length < 2) return pr;
    const i = pr.planchers.findIndex(p => p.id === pr.active);
    const planchers = pr.planchers.filter(p => p.id !== pr.active);
    return { ...pr, planchers, active: planchers[Math.max(0, i - 1)].id };
  }), []);

  const exporter = useCallback(() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(projet, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${(projet.identification.reference || 'projet').replace(/[^\w.-]+/g, '_')}.plancher.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [projet]);
  const importer = useCallback(async (f: File) => {
    try { setProjet(lireProjet(await f.text())); setMessage(`Projet « ${f.name} » ouvert.`); log('info', `Import du projet ${f.name}`); }
    catch (e) { setMessage(`Import impossible : ${(e as Error).message}`); log('warn', 'Import refusé', e); }
  }, []);
  const reinitialiser = useCallback(() => { setProjet(projetVide()); setMessage('Nouveau projet.'); }, []);

  return { projet, plancher, entree: plancher.entree, identification: { ...projet.identification, repere: plancher.repere }, maj, majPlusieurs, majId, renommer, choisir, ajouter, dupliquer, supprimer, exporter, importer, reinitialiser, message, setMessage };
}
