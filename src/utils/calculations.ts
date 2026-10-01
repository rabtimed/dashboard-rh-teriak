/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmployeeLifecycle } from '../data/sampleData';
import { Employee, Departure, Filters } from '../types';

// Helper: Get end of month date string (YYYY-MM-DD)
export function getEndOfMonth(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const endOfDate = new Date(year, month, 0); // last day of month
  const y = endOfDate.getFullYear();
  const m = String(endOfDate.getMonth() + 1).padStart(2, '0');
  const d = String(endOfDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Calculate age from date relative to an reference date
export function calculateAge(birthDateStr: string, referenceDateStr: string): number {
  const birth = new Date(birthDateStr);
  const ref = new Date(referenceDateStr);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

// Helper: Calculate seniority in years from date relative to reference date
export function calculateSeniority(hireDateStr: string, referenceDateStr: string): number {
  const hire = new Date(hireDateStr);
  const ref = new Date(referenceDateStr);
  const diffTime = Math.max(0, ref.getTime() - hire.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Number((diffDays / 365.25).toFixed(1));
}

// Age Group bucket
export function getAgeGroup(age: number): string {
  if (age < 25) return "<25 ans";
  if (age >= 25 && age <= 34) return "25–34 ans";
  if (age >= 35 && age <= 44) return "35–44 ans";
  if (age >= 45 && age <= 54) return "45–54 ans";
  return "55 ans et plus";
}

// Seniority bucket
export function getSeniorityGroup(years: number): string {
  if (years < 1) return "<1 an";
  if (years >= 1 && years < 3) return "1–3 ans";
  if (years >= 3 && years < 5) return "3–5 ans";
  if (years >= 5 && years < 10) return "5–10 ans";
  return "> 10 ans";
}

// Map Monthly string to French month name
export const MONTHS_FR: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre"
};

// Map French Month name to digits
export const FR_MONTH_TO_DIGITS: Record<string, string> = {
  "Janvier": "01",
  "Février": "02",
  "Mars": "03",
  "Avril": "04",
  "Mai": "05",
  "Juin": "06",
  "Juillet": "07",
  "Août": "08",
  "Septembre": "09",
  "Octobre": "10",
  "Novembre": "11",
  "Décembre": "12"
};

/**
 * Filter the lifecycles based on structural filters.
 * Note: Demographics filters (Tranche d'âge, Ancienneté) will be filtered subsequently.
 */
export function filterLifecycles(
  lifecycles: EmployeeLifecycle[],
  filters: Filters,
  targetYearMonth: string // "YYYY-MM"
): EmployeeLifecycle[] {
  return lifecycles.filter(item => {
    // Basic structural filters
    if (filters.usine !== "Tous" && item.usine !== filters.usine) return false;
    if (filters.direction !== "Tous" && item.direction !== filters.direction) return false;
    if (filters.service !== "Tous" && item.service !== filters.service) return false;
    if (filters.fonction !== "Tous" && item.fonction !== filters.fonction) return false;
    if (filters.nPlus1 !== "Tous" && item.nPlus1 !== filters.nPlus1) return false;
    if (filters.typeContrat !== "Tous" && item.typeContrat !== filters.typeContrat) return false;
    if (filters.genre !== "Tous" && item.genre !== filters.genre) return false;
    if (filters.categorieSocioProf !== "Tous" && item.categorieSocioProf !== filters.categorieSocioProf) return false;
    
    // Date checks are handled during snapshot mapping
    return true;
  });
}

/**
 * Build the "Effectif" snapshot (active employees) at the end of a specific month.
 */
export function getActiveHeadcountSnapshot(
  lifecycles: EmployeeLifecycle[],
  yearMonth: string, // YYYY-MM
  filters: Filters
): Employee[] {
  const endOfMonthStr = getEndOfMonth(yearMonth);
  
  // Filter structurally
  const structurallyFiltered = filterLifecycles(lifecycles, filters, yearMonth);
  
  const activeList: Employee[] = [];
  
  structurallyFiltered.forEach(item => {
    // Hired on or before end of month
    const isHired = item.dateRecrutement <= endOfMonthStr;
    // Departed after end of month (or not departed)
    const isNotDepartedYet = !item.dateDepart || item.dateDepart > endOfMonthStr;
    
    if (isHired && isNotDepartedYet) {
      const age = calculateAge(item.dateNaissance, endOfMonthStr);
      const seniority = calculateSeniority(item.dateRecrutement, endOfMonthStr);
      
      // Filter by dynamic brackets if specified
      if (filters.trancheAge !== "Tous" && getAgeGroup(age) !== filters.trancheAge) return;
      if (filters.trancheAnciennete !== "Tous" && getSeniorityGroup(seniority) !== filters.trancheAnciennete) return;
      
      activeList.push({
        id: item.matricule,
        matricule: item.matricule,
        nom: item.nom,
        prenom: item.prenom,
        genre: item.genre,
        usine: item.usine,
        cin: item.cin,
        cnss: item.cnss,
        typeContrat: item.typeContrat,
        direction: item.direction,
        service: item.service,
        fonction: item.fonction,
        nPlus1: item.nPlus1,
        categorieSocioProf: item.categorieSocioProf,
        dateRecrutement: item.dateRecrutement,
        dateNaissance: item.dateNaissance,
        anciennete: seniority,
        age: age,
        monthRecord: yearMonth
      });
    }
  });
  
  return activeList;
}

/**
 * Build the "Départs" list for a specific period.
 */
export function getDeparturesList(
  lifecycles: EmployeeLifecycle[],
  yearMonth: string, // YYYY-MM or "Tous-Année"
  filters: Filters
): Departure[] {
  // Filter structurally
  const structurallyFiltered = filterLifecycles(lifecycles, filters, yearMonth === "Tous" ? "2026-06" : yearMonth.startsWith("Tous-") ? yearMonth.replace("Tous-", "") + "-06" : yearMonth);
  const departures: Departure[] = [];
  
  structurallyFiltered.forEach(item => {
    if (item.dateDepart) {
      const depDate = item.dateDepart;
      const depYear = depDate.substring(0, 4);
      const depMonth = depDate.substring(5, 7);
      const depYearMonth = `${depYear}-${depMonth}`;
      
      // Period filter check
      if (yearMonth !== "Tous") {
        if (yearMonth.startsWith("Tous-")) { // "Tous-2026"
          const filterYear = yearMonth.substring(5);
          if (depYear !== filterYear) return;
        } else { // specific "2026-06"
          if (depYearMonth !== yearMonth) return;
        }
      }
      
      const age = calculateAge(item.dateNaissance, depDate);
      const seniority = calculateSeniority(item.dateRecrutement, depDate);
      
      // Filter by dynamic brackets if specified
      if (filters.trancheAge !== "Tous" && getAgeGroup(age) !== filters.trancheAge) return;
      if (filters.trancheAnciennete !== "Tous" && getSeniorityGroup(seniority) !== filters.trancheAnciennete) return;
      
      departures.push({
        matricule: item.matricule,
        nom: item.nom,
        prenom: item.prenom,
        genre: item.genre,
        usine: item.usine,
        typeContrat: item.typeContrat,
        direction: item.direction,
        service: item.service,
        fonction: item.fonction,
        nPlus1: item.nPlus1,
        categorieSocioProf: item.categorieSocioProf,
        dateRecrutement: item.dateRecrutement,
        dateNaissance: item.dateNaissance,
        anciennete: seniority,
        age: age,
        motifDepart: item.motifDepart || "Autre",
        causeDepart: item.causeDepart || "Autre",
        motif: item.motif || "Autre",
        moisDepart: depYearMonth,
        dateDepart: depDate
      });
    }
  });
  
  return departures;
}

/**
 * Build the "Recrutements" list for a specific period.
 */
export function getRecruitmentsList(
  lifecycles: EmployeeLifecycle[],
  yearMonth: string, // YYYY-MM or "Tous-Année"
  filters: Filters
): Employee[] {
  // Filter structurally
  const structurallyFiltered = filterLifecycles(lifecycles, filters, yearMonth === "Tous" ? "2026-06" : yearMonth.startsWith("Tous-") ? yearMonth.replace("Tous-", "") + "-06" : yearMonth);
  const recruitments: Employee[] = [];
  
  structurallyFiltered.forEach(item => {
    const hireDate = item.dateRecrutement;
    const hireYear = hireDate.substring(0, 4);
    const hireMonth = hireDate.substring(5, 7);
    const hireYearMonth = `${hireYear}-${hireMonth}`;
    
    // Period filter check
    if (yearMonth !== "Tous") {
      if (yearMonth.startsWith("Tous-")) { // "Tous-2026"
        const filterYear = yearMonth.substring(5);
        if (hireYear !== filterYear) return;
      } else { // specific "2026-06"
        if (hireYearMonth !== yearMonth) return;
      }
    }
    
    const age = calculateAge(item.dateNaissance, hireDate);
    const seniority = 0; // Freshly recruited
    
    // Filter by dynamic brackets if specified
    if (filters.trancheAge !== "Tous" && getAgeGroup(age) !== filters.trancheAge) return;
    if (filters.trancheAnciennete !== "Tous" && getSeniorityGroup(seniority) !== filters.trancheAnciennete) return;
    
    recruitments.push({
      id: item.matricule,
      matricule: item.matricule,
      nom: item.nom,
      prenom: item.prenom,
      genre: item.genre,
      usine: item.usine,
      cin: item.cin,
      cnss: item.cnss,
      typeContrat: item.typeContrat,
      direction: item.direction,
      service: item.service,
      fonction: item.fonction,
      nPlus1: item.nPlus1,
      categorieSocioProf: item.categorieSocioProf,
      dateRecrutement: item.dateRecrutement,
      dateNaissance: item.dateNaissance,
      anciennete: seniority,
      age: age,
      monthRecord: hireYearMonth
    });
  });
  
  return recruitments;
}

/**
 * Get the history of months available in the lifecycles.
 */
export function getAvailableMonths(lifecycles: EmployeeLifecycle[]): string[] {
  const months = new Set<string>();
  
  // Scrape all recruitment dates and departure dates
  lifecycles.forEach(item => {
    months.add(item.dateRecrutement.substring(0, 7));
    if (item.dateDepart) {
      months.add(item.dateDepart.substring(0, 7));
    }
  });
  
  // Sort chronically
  return Array.from(months).sort();
}

/**
 * Get available years
 */
export function getAvailableYears(lifecycles: EmployeeLifecycle[]): string[] {
  const years = new Set<string>();
  lifecycles.forEach(item => {
    years.add(item.dateRecrutement.substring(0, 4));
    if (item.dateDepart) {
      years.add(item.dateDepart.substring(0, 4));
    }
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending order
}
