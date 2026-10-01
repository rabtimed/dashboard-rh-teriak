/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string; // Internal unique ID or MATRICULE
  matricule?: string;
  nom?: string;
  prenom: string;
  genre: 'Homme' | 'Femme';
  usine: string; // e.g., "Usine Jebel Oust", "Usine Charguia", "Siège"
  cin: string;
  cnss: string;
  typeContrat: string; // "CDI" | "CDD" | "CIVP" | "SVP"
  direction: string; // e.g., "Production", "Qualité", "RH", "Finance", "Commercial"
  service: string;
  fonction: string;
  nPlus1: string; // Manager name
  categorieSocioProf: 'Cadre' | 'Maîtrise' | 'Exécution';
  dateRecrutement: string; // YYYY-MM-DD
  anciennete: number; // in years
  dateNaissance: string; // YYYY-MM-DD
  age: number;
  monthRecord: string; // e.g., "2026-06" representing the headcount snapshot of that month
}

export interface Departure {
  matricule: string;
  nom: string;
  prenom: string;
  genre: 'Homme' | 'Femme';
  usine: string;
  typeContrat: string;
  direction: string;
  service: string;
  fonction: string;
  nPlus1: string;
  categorieSocioProf: 'Cadre' | 'Maîtrise' | 'Exécution';
  dateRecrutement: string; // YYYY-MM-DD
  anciennete: number; // in years
  dateNaissance: string; // YYYY-MM-DD
  age: number;
  motifDepart: string; // e.g., "Démission", "Retraite", "Licenciement", "Fin de contrat"
  causeDepart: string; // detailed cause
  motif: string; // summary category
  moisDepart: string; // e.g., "2026-06"
  dateDepart: string; // YYYY-MM-DD
}

export interface Filters {
  annee: string; // "Tous", "2026", "2025"
  mois: string; // "Tous", "01", "02", ...
  usine: string;
  direction: string;
  service: string;
  fonction: string;
  nPlus1: string;
  typeContrat: string;
  genre: string;
  categorieSocioProf: string;
  trancheAge: string;
  trancheAnciennete: string;
}

export interface KpiSummary {
  headcountActuel: number;
  headcountMoyen: number;
  recrutementsCount: number;
  departsCount: number;
  turnoverRate: number;
  headcountDeltaPercent: number; // monthly or annual evolution
  recrutementsDeltaPercent: number;
  departsDeltaPercent: number;
}
