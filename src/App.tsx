/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, LayoutDashboard, FileSpreadsheet, Layers, Menu, X, 
  RefreshCw, MapPin, SlidersHorizontal, Calendar, ArrowRight, Activity, HelpCircle,
  Users
} from 'lucide-react';
import { EmployeeLifecycle, INITIAL_EMPLOYEE_LIFECYCLES } from './data/sampleData';
import { Filters } from './types';
import { 
  getAvailableMonths, getAvailableYears, MONTHS_FR 
} from './utils/calculations';
import { 
  OverviewTab, EffectifsTab, RecrutementsTab, DepartsTab, 
  TurnoverTab, DemographicsTab, OrganisationTab, EvolutionTab 
} from './components/AnalyticsViews';
import ImportView from './components/ImportView';
import ModelView from './components/ModelView';

const STORAGE_KEY = "TERIAK_HR_LIFECYCLES_V1";

const DEFAULT_FILTERS: Filters = {
  annee: "Tous",
  mois: "Tous",
  usine: "Tous",
  direction: "Tous",
  service: "Tous",
  fonction: "Tous",
  nPlus1: "Tous",
  typeContrat: "Tous",
  genre: "Tous",
  categorieSocioProf: "Tous",
  trancheAge: "Tous",
  trancheAnciennete: "Tous"
};

export default function App() {
  // 1. Core State
  const [lifecycles, setLifecycles] = useState<EmployeeLifecycle[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>("2026-06");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<string>("accueil");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // 2. Load initially from LocalStorage or Seed Data
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setLifecycles(JSON.parse(cached));
      } catch (e) {
        setLifecycles(INITIAL_EMPLOYEE_LIFECYCLES);
      }
    } else {
      setLifecycles(INITIAL_EMPLOYEE_LIFECYCLES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEE_LIFECYCLES));
    }
  }, []);

  // Save changes to localStorage
  const handleUpdateLifecycles = (newLifecycles: EmployeeLifecycle[]) => {
    setLifecycles(newLifecycles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLifecycles));
    
    // Automatically select the newly imported month if applicable
    const available = getAvailableMonths(newLifecycles);
    if (available.length > 0) {
      const latest = available[available.length - 1];
      setSelectedYearMonth(latest);
    }
  };

  const handleResetLifecycles = () => {
    setLifecycles(INITIAL_EMPLOYEE_LIFECYCLES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEE_LIFECYCLES));
    setSelectedYearMonth("2026-06");
    setFilters(DEFAULT_FILTERS);
  };

  // 3. Extract dynamic options for Filters based on currently active lifecycles
  const filterOptions = useMemo(() => {
    const usines = new Set<string>();
    const directions = new Set<string>();
    const services = new Set<string>();
    const fonctions = new Set<string>();
    const managers = new Set<string>();
    const contrats = new Set<string>();

    lifecycles.forEach(item => {
      usines.add(item.usine);
      directions.add(item.direction);
      
      // Cascade service options if a direction is selected
      if (filters.direction === "Tous" || item.direction === filters.direction) {
        services.add(item.service);
      }
      
      fonctions.add(item.fonction);
      managers.add(item.nPlus1);
      contrats.add(item.typeContrat);
    });

    return {
      usines: ["Tous", ...Array.from(usines).sort()],
      directions: ["Tous", ...Array.from(directions).sort()],
      services: ["Tous", ...Array.from(services).sort()],
      fonctions: ["Tous", ...Array.from(fonctions).sort()],
      managers: ["Tous", ...Array.from(managers).sort()],
      contrats: ["Tous", ...Array.from(contrats).sort()],
      genres: ["Tous", "Homme", "Femme"],
      categories: ["Tous", "Cadre", "Maîtrise", "Exécution"],
      tranchesAge: ["Tous", "<25 ans", "25–34 ans", "35–44 ans", "45–54 ans", "55 ans et plus"],
      tranchesAnciennete: ["Tous", "<1 an", "1–3 ans", "3–5 ans", "5–10 ans", "> 10 ans"]
    };
  }, [lifecycles, filters.direction]);

  // Extract available months for the snapshot picker
  const availableMonths = useMemo(() => {
    return getAvailableMonths(lifecycles);
  }, [lifecycles]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Cascade reset: if direction changes, reset service
      if (key === "direction") {
        next.service = "Tous";
      }
      return next;
    });
  };

  const resetAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Format the currently selected snapshot date nicely
  const formattedSnapshotLabel = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-');
    const frMonth = MONTHS_FR[m] || m;
    return `${frMonth} ${y}`;
  }, [selectedYearMonth]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* 1. TOP CORPORATE BAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-xs">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shadow-xs">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg text-slate-900 tracking-tight">TERIAK <span className="text-teal-500 font-extrabold">RH</span></span>
              <span className="text-[10px] bg-teal-50 text-teal-600 font-bold px-1.5 py-0.5 rounded-full border border-teal-100 uppercase tracking-wider">BI</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Tableau de bord de suivi des effectifs</p>
          </div>
        </div>

        {/* Dynamic snapshot switcher & controls */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs text-slate-700">
            <Calendar className="h-4 w-4 text-teal-500" />
            <span className="font-semibold">Mois d'analyse :</span>
            <select
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableMonths.map(month => {
                const [y, m] = month.split('-');
                return (
                  <option key={month} value={month}>
                    {MONTHS_FR[m]} {y}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Info */}
          <div className="hidden lg:flex items-center gap-2 text-right">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Base synchronisée</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        
        {/* 2. DYNAMIC FILTERS SIDEBAR */}
        <aside className={`bg-white border-r border-slate-200 w-64 flex flex-col shrink-0 transition-all z-30 ${
          isFiltersOpen ? "block" : "hidden"
        }`}>
          {/* Header & reset */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
              <SlidersHorizontal className="h-4 w-4 text-teal-500" />
              Filtres (Slicers)
            </div>
            <button
              onClick={resetAllFilters}
              className="text-[10px] text-teal-600 hover:text-teal-800 font-bold hover:underline"
            >
              Effacer tout
            </button>
          </div>

          {/* Slicers List */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)]">
            
            {/* Filter: Usine */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usine / Site</label>
              <select
                value={filters.usine}
                onChange={(e) => handleFilterChange('usine', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
              >
                {filterOptions.usines.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Direction */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direction</label>
              <select
                value={filters.direction}
                onChange={(e) => handleFilterChange('direction', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
              >
                {filterOptions.directions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Service */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service</label>
              <select
                value={filters.service}
                disabled={filters.direction === "Tous"}
                onChange={(e) => handleFilterChange('service', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium disabled:opacity-50"
              >
                {filterOptions.services.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Contrat */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type de contrat</label>
              <select
                value={filters.typeContrat}
                onChange={(e) => handleFilterChange('typeContrat', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium font-mono"
              >
                {filterOptions.contrats.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Genre */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Genre</label>
              <select
                value={filters.genre}
                onChange={(e) => handleFilterChange('genre', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
              >
                {filterOptions.genres.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Catégorie */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catégorie Socio-prof</label>
              <select
                value={filters.categorieSocioProf}
                onChange={(e) => handleFilterChange('categorieSocioProf', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
              >
                {filterOptions.categories.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Tranche d'âge */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tranche d'âge</label>
              <select
                value={filters.trancheAge}
                onChange={(e) => handleFilterChange('trancheAge', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
              >
                {filterOptions.tranchesAge.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Filter: Ancienneté */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tranche d'ancienneté</label>
              <select
                value={filters.trancheAnciennete}
                onChange={(e) => handleFilterChange('trancheAnciennete', e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
              >
                {filterOptions.tranchesAnciennete.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

          </div>
        </aside>

        {/* 3. MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-x-hidden">
          
          {/* Tabs Navigation menu */}
          <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between overflow-x-auto shrink-0 select-none scrollbar-none">
            <nav className="flex gap-1 py-3 whitespace-nowrap">
              {[
                { id: "accueil", label: "Accueil", icon: LayoutDashboard },
                { id: "effectifs", label: "Effectifs", icon: Users },
                { id: "recrutements", label: "Recrutements", icon: Activity },
                { id: "departs", label: "Départs", icon: X },
                { id: "turnover", label: "Turnover", icon: RefreshCw },
                { id: "demographie", label: "Démographie", icon: SlidersHorizontal },
                { id: "organisation", label: "Organisation", icon: Layers },
                { id: "evolution", label: "Évolution Temporelle", icon: Activity },
                { id: "import", label: "Power Query ETL (Import)", icon: FileSpreadsheet },
                { id: "model", label: "Modèle & DAX", icon: Database }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      active 
                        ? "bg-teal-500 text-white shadow-md shadow-teal-500/20" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar display triggers */}
            <div className="flex gap-2 shrink-0 pl-4 py-3">
              <button
                onClick={() => setIsFiltersOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  isFiltersOpen 
                    ? "bg-slate-100 border-slate-300 text-slate-800" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {isFiltersOpen ? "Masquer Filtres" : "Afficher Filtres"}
              </button>
            </div>
          </div>

          {/* Tab Render Area */}
          <div className="p-6 md:p-8 flex-1 space-y-6">
            
            {/* Dynamic Month Ribbon indicator */}
            {activeTab !== 'import' && activeTab !== 'model' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-300 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <p className="text-xs font-semibold leading-none">
                    Visualisation filtrée sur le mois comptable : <strong className="text-white font-bold">{formattedSnapshotLabel}</strong>
                  </p>
                </div>
                
                {/* Active filters indicators */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {Object.entries(filters).map(([k, v]) => {
                    if (v === "Tous") return null;
                    return (
                      <span key={k} className="bg-slate-800 border border-slate-700/50 rounded-full px-2 py-0.5 font-bold text-teal-400 uppercase tracking-wide shadow-2xs">
                        {k}: {v}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "accueil" && (
              <OverviewTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}
            
            {activeTab === "effectifs" && (
              <EffectifsTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "recrutements" && (
              <RecrutementsTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "departs" && (
              <DepartsTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "turnover" && (
              <TurnoverTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "demographie" && (
              <DemographicsTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "organisation" && (
              <OrganisationTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "evolution" && (
              <EvolutionTab 
                lifecycles={lifecycles} 
                filters={filters} 
                selectedYearMonth={selectedYearMonth} 
              />
            )}

            {activeTab === "import" && (
              <ImportView 
                lifecycles={lifecycles} 
                onUpdateLifecycles={handleUpdateLifecycles} 
                onResetLifecycles={handleResetLifecycles} 
              />
            )}

            {activeTab === "model" && (
              <ModelView />
            )}

          </div>

          {/* 4. FOOTER */}
          <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-[11px] text-slate-400 font-medium">
            &copy; 2026 TERIAK S.A. — Système décisionnel d'analyse des ressources humaines (Power BI Prototype). Tous droits réservés.
          </footer>
        </main>
      </div>

    </div>
  );
}
