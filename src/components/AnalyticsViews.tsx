/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, UserMinus, TrendingUp, RefreshCw, BarChart2, PieChart, 
  Search, Shield, Eye, MapPin, Grid, Briefcase, Filter, ArrowUpRight, 
  ArrowDownRight, HelpCircle, ChevronRight, UserCheck, CalendarDays,
  Activity, ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, 
  PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Employee, Departure, Filters } from '../types';
import { EmployeeLifecycle } from '../data/sampleData';
import { 
  getActiveHeadcountSnapshot, getDeparturesList, getRecruitmentsList, 
  getAgeGroup, getSeniorityGroup, MONTHS_FR 
} from '../utils/calculations';

// Professional Colors
const COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];
const GENDER_COLORS = { 'Homme': '#14b8a6', 'Femme': '#ec4899' };

interface ViewProps {
  lifecycles: EmployeeLifecycle[];
  filters: Filters;
  selectedYearMonth: string; // e.g., "2026-06"
}

// ----------------------------------------------------------------------------
// 1. HOME / OVERVIEW TAB (Accueil)
// ----------------------------------------------------------------------------
export function OverviewTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const currentYear = selectedYearMonth.substring(0, 4);

  // Compute stats for selected month
  const activeSnapshot = useMemo(() => {
    return getActiveHeadcountSnapshot(lifecycles, selectedYearMonth, filters);
  }, [lifecycles, selectedYearMonth, filters]);

  // Compute stats for previous month
  const prevYearMonth = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  }, [selectedYearMonth]);

  const activePrevSnapshot = useMemo(() => {
    return getActiveHeadcountSnapshot(lifecycles, prevYearMonth, filters);
  }, [lifecycles, prevYearMonth, filters]);

  // Recruitments & Departures for this month
  const monthlyRecruits = useMemo(() => {
    return getRecruitmentsList(lifecycles, selectedYearMonth, filters);
  }, [lifecycles, selectedYearMonth, filters]);

  const monthlyDeps = useMemo(() => {
    return getDeparturesList(lifecycles, selectedYearMonth, filters);
  }, [lifecycles, selectedYearMonth, filters]);

  // Recruitments & Departures for previous month (for trends)
  const prevMonthlyRecruits = useMemo(() => {
    return getRecruitmentsList(lifecycles, prevYearMonth, filters);
  }, [lifecycles, prevYearMonth, filters]);

  const prevMonthlyDeps = useMemo(() => {
    return getDeparturesList(lifecycles, prevYearMonth, filters);
  }, [lifecycles, prevYearMonth, filters]);

  // Compute historical months trend data for the selected year
  const chartData = useMemo(() => {
    const data = [];
    // Calculate for Jan to June (or whichever months exist in selected year)
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const ym = `${currentYear}-${mStr}`;
      
      // Stop if in the future (relative to our maximum data month in 2026, which is June)
      if (currentYear === '2026' && m > 6) break;

      const act = getActiveHeadcountSnapshot(lifecycles, ym, filters).length;
      const rec = getRecruitmentsList(lifecycles, ym, filters).length;
      const dep = getDeparturesList(lifecycles, ym, filters).length;

      // Simple monthly turnover
      const turnover = act > 0 ? Number(((dep / act) * 100).toFixed(1)) : 0;

      data.push({
        monthKey: ym,
        monthName: MONTHS_FR[mStr],
        Effectif: act,
        Recrutements: rec,
        Départs: dep,
        Turnover: turnover
      });
    }
    return data;
  }, [lifecycles, currentYear, filters]);

  // Overall Year-to-Date averages for KPIs
  const avgHeadcount = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.Effectif, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const totalDepsYtd = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.Départs, 0);
  }, [chartData]);

  const ytdTurnover = useMemo(() => {
    if (avgHeadcount === 0) return 0;
    return Number(((totalDepsYtd / avgHeadcount) * 100).toFixed(1));
  }, [avgHeadcount, totalDepsYtd]);

  // Compute Deltas
  const headcountDelta = activeSnapshot.length - activePrevSnapshot.length;
  const headcountDeltaPct = activePrevSnapshot.length > 0 
    ? Number(((headcountDelta / activePrevSnapshot.length) * 100).toFixed(1)) 
    : 0;

  const recruitDelta = monthlyRecruits.length - prevMonthlyRecruits.length;
  const departDelta = monthlyDeps.length - prevMonthlyDeps.length;

  // Breakdown Gender
  const genderData = useMemo(() => {
    const h = activeSnapshot.filter(e => e.genre === 'Homme').length;
    const f = activeSnapshot.filter(e => e.genre === 'Femme').length;
    const total = h + f || 1;
    return [
      { name: 'Hommes', value: h, pct: Number(((h / total) * 100).toFixed(1)), color: GENDER_COLORS['Homme'] },
      { name: 'Femmes', value: f, pct: Number(((f / total) * 100).toFixed(1)), color: GENDER_COLORS['Femme'] }
    ];
  }, [activeSnapshot]);

  // Breakdown Usines
  const usineData = useMemo(() => {
    const uMap: Record<string, number> = {};
    activeSnapshot.forEach(e => {
      uMap[e.usine] = (uMap[e.usine] || 0) + 1;
    });
    return Object.entries(uMap).map(([name, value]) => ({ name, value }));
  }, [activeSnapshot]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Headcount Actuel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Effectif Actuel</span>
              <h3 className="text-2xl font-bold text-slate-800 font-display">{activeSnapshot.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs">
            {headcountDelta >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{headcountDelta} ({headcountDeltaPct}%)
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {headcountDelta} ({headcountDeltaPct}%)
              </span>
            )}
            <span className="text-slate-400">vs mois précédent</span>
          </div>
        </div>

        {/* KPI 2: Recrutements */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recrutements du mois</span>
              <h3 className="text-2xl font-bold text-slate-800 font-display">{monthlyRecruits.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs">
            {recruitDelta >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{recruitDelta}
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {recruitDelta}
              </span>
            )}
            <span className="text-slate-400">vs mois précédent</span>
          </div>
        </div>

        {/* KPI 3: Départs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Départs du mois</span>
              <h3 className="text-2xl font-bold text-slate-800 font-display">{monthlyDeps.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserMinus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs">
            {departDelta >= 0 ? (
              <span className="text-rose-600 font-semibold flex items-center">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{departDelta} (départs)
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {departDelta} (départs)
              </span>
            )}
            <span className="text-slate-400">vs mois précédent</span>
          </div>
        </div>

        {/* KPI 4: Turnover YTD */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Turnover Annuel Moyen</span>
              <h3 className="text-2xl font-bold text-slate-800 font-display">{ytdTurnover}%</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="text-teal-600 font-semibold">Effectif Moyen YTD: {avgHeadcount}</span>
            <span className="text-slate-400">({totalDepsYtd} départs cumulés)</span>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Staffing Level Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-teal-500" />
              Évolution Mensuelle des Effectifs & Flux ({currentYear})
            </h4>
            <div className="flex gap-4 text-[10px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-500"></span> Effectif</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Recrutements</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Départs</span>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEffectif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="Effectif" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorEffectif)" />
                <Bar dataKey="Recrutements" fill="#10b981" barSize={10} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Départs" fill="#f43f5e" barSize={10} radius={[4, 4, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Demographics Fast Overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Répartition par Genre</h4>
          
          {/* Gender Pie Chart */}
          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} collaborateurs (${props.payload.pct}%)`, name]} />
              </RechartsPie>
            </ResponsiveContainer>
            
            {/* Center labels */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-slate-400">Total</span>
              <span className="text-xl font-bold text-slate-800">{activeSnapshot.length}</span>
            </div>
          </div>

          {/* Gender Legend */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {genderData.map((g, idx) => (
              <div key={idx} className="space-y-1 text-center">
                <span className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                  {g.name}
                </span>
                <p className="text-sm font-bold text-slate-700">{g.value} ({g.pct}%)</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Usine Split Map */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h4 className="text-sm font-bold text-slate-800 font-display">Effectif par Usines / Sites TERIAK</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {usineData.map((u, idx) => {
            const pct = Number(((u.value / (activeSnapshot.length || 1)) * 100).toFixed(1));
            return (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{u.name}</span>
                    <span className="text-xs font-mono font-bold text-teal-600">{u.value} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------------------------------
// 2. EFFECTIFS TAB (Active employee directory)
// ----------------------------------------------------------------------------
export function EffectifsTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Employee>("matricule");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const activeEmployees = useMemo(() => {
    return getActiveHeadcountSnapshot(lifecycles, selectedYearMonth, filters);
  }, [lifecycles, selectedYearMonth, filters]);

  // Handle Search & Sort
  const processedEmployees = useMemo(() => {
    let list = [...activeEmployees];
    
    // Search
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(e => 
        e.prenom.toLowerCase().includes(s) || 
        (e.nom && e.nom.toLowerCase().includes(s)) ||
        e.matricule?.toLowerCase().includes(s) ||
        e.fonction.toLowerCase().includes(s) ||
        e.service.toLowerCase().includes(s)
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [activeEmployees, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header and Search */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 self-start md:self-auto">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Registres des Collaborateurs Actifs</h3>
          <p className="text-xs text-slate-400">Affiche l'effectif exact présent au <strong>{selectedYearMonth}</strong> ({activeEmployees.length} collaborateurs)</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher nom, prénom, matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-xs border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
      </div>

      {/* Directory Content split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Main List */}
        <div className="xl:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider select-none">
                  <th onClick={() => handleSort('matricule')} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Matricule <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('prenom')} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Collaborateur <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('direction')} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Direction <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('fonction')} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Fonction <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('usine')} className="p-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Usine <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {processedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      Aucun collaborateur actif ne correspond à votre recherche ou vos filtres.
                    </td>
                  </tr>
                ) : (
                  processedEmployees.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-semibold text-teal-600">{emp.matricule}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                           <span className={`h-2 w-2 rounded-full ${emp.genre === 'Homme' ? 'bg-teal-500' : 'bg-pink-500'}`}></span>
                          <span className="font-semibold text-slate-800">{emp.prenom} {emp.nom}</span>
                        </div>
                      </td>
                      <td className="p-4">{emp.direction}</td>
                      <td className="p-4 text-slate-500">{emp.fonction}</td>
                      <td className="p-4 font-medium text-[11px] bg-slate-50/40">{emp.usine}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-all cursor-pointer"
                          title="Voir fiche complète"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Employee Card Panel */}
        <div className="xl:col-span-4">
          {selectedEmployee ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-teal-100 space-y-6 sticky top-6 animate-slide-in">
              {/* Header profile */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                  selectedEmployee.genre === 'Homme' 
                    ? 'bg-teal-100 text-teal-700' 
                    : 'bg-pink-100 text-pink-700'
                }`}>
                  {selectedEmployee.prenom[0]}
                  {selectedEmployee.nom ? selectedEmployee.nom[0] : ""}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 font-display text-sm">{selectedEmployee.prenom} {selectedEmployee.nom}</h4>
                  <p className="text-[10px] font-mono text-slate-400">Matricule: {selectedEmployee.matricule}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="space-y-4 text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Genre</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.genre}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">N° C.I.N</span>
                    <p className="font-mono text-slate-700">{selectedEmployee.cin}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">N° CNSS</span>
                    <p className="font-mono text-slate-700">{selectedEmployee.cnss}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contrat</span>
                    <p className="font-bold text-teal-600">{selectedEmployee.typeContrat}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Usine / Affectation</span>
                  <p className="font-medium text-slate-700 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-teal-500" />
                    {selectedEmployee.usine}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Direction</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.direction}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.service}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fonction exacte</span>
                  <p className="font-medium text-slate-700">{selectedEmployee.fonction}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">N+1 (Manager)</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.nPlus1}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Catégorie</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.categorieSocioProf}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recrutement</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.dateRecrutement}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ancienneté</span>
                    <p className="font-bold text-slate-800">{selectedEmployee.anciennete} ans</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Naissance</span>
                    <p className="font-medium text-slate-700">{selectedEmployee.dateNaissance}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Âge Réel</span>
                    <p className="font-bold text-slate-800">{selectedEmployee.age} ans</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 h-72">
              <UserCheck className="h-8 w-8 text-slate-300" />
              <p className="text-xs font-semibold">Aucune fiche sélectionnée</p>
              <p className="text-[10px] max-w-xs leading-relaxed">Cliquez sur l'icône œil d'un collaborateur dans le tableau de gauche pour consulter sa fiche complète.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. RECRUTEMENTS TAB
// ----------------------------------------------------------------------------
export function RecrutementsTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const currentYear = selectedYearMonth.substring(0, 4);

  // Filter and get recruitments for the selected year or period
  const recruitsList = useMemo(() => {
    return getRecruitmentsList(lifecycles, `Tous-${currentYear}`, filters);
  }, [lifecycles, currentYear, filters]);

  // Aggregate recruitments monthly
  const monthlyRecruits = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      counts[String(m).padStart(2, '0')] = 0;
    }
    recruitsList.forEach(item => {
      const m = item.monthRecord.substring(5, 7);
      if (counts[m] !== undefined) {
        counts[m]++;
      }
    });
    return Object.entries(counts).map(([monthKey, count]) => ({
      monthName: MONTHS_FR[monthKey],
      Recrutements: count
    }));
  }, [recruitsList]);

  // Direction breakdown
  const directionRecruits = useMemo(() => {
    const counts: Record<string, number> = {};
    recruitsList.forEach(item => {
      counts[item.direction] = (counts[item.direction] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [recruitsList]);

  // Usine breakdown
  const usineRecruits = useMemo(() => {
    const counts: Record<string, number> = {};
    recruitsList.forEach(item => {
      counts[item.usine] = (counts[item.usine] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [recruitsList]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Analyses des Recrutements (YTD {currentYear})</h3>
          <p className="text-xs text-slate-400">Suivi des nouvelles embauches de l'année. Total cumulé : <strong>{recruitsList.length} recrutements</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Recrutements par mois</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRecruits} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="Recrutements" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Direction breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Recrutements par Direction</h4>
          <div className="space-y-3">
            {directionRecruits.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Aucun recrutement cette année.</p>
            ) : (
              directionRecruits.map((dir, idx) => {
                const pct = Number(((dir.value / recruitsList.length) * 100).toFixed(0));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{dir.name}</span>
                      <span className="font-mono text-teal-600">{dir.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Usine breakdown */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h4 className="text-sm font-bold text-slate-800 font-display">Distribution Géographique (Usines / Siège)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {usineRecruits.map((u, idx) => {
            const pct = Number(((u.value / (recruitsList.length || 1)) * 100).toFixed(0));
            return (
              <div key={idx} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{u.name}</span>
                <span className="text-2xl font-bold text-teal-600 block">{u.value}</span>
                <span className="text-xs text-slate-500">({pct}% des embauches)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 4. DEPARTS TAB (Departures)
// ----------------------------------------------------------------------------
export function DepartsTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const currentYear = selectedYearMonth.substring(0, 4);

  const departuresList = useMemo(() => {
    return getDeparturesList(lifecycles, `Tous-${currentYear}`, filters);
  }, [lifecycles, currentYear, filters]);

  // Monthly exit counts
  const monthlyExits = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) {
      counts[String(m).padStart(2, '0')] = 0;
    }
    departuresList.forEach(item => {
      const m = item.moisDepart.substring(5, 7);
      if (counts[m] !== undefined) {
        counts[m]++;
      }
    });
    return Object.entries(counts).map(([monthKey, count]) => ({
      monthName: MONTHS_FR[monthKey],
      Départs: count
    }));
  }, [departuresList]);

  // Reasons / motifs breakdown
  const exitMotifs = useMemo(() => {
    const counts: Record<string, number> = {};
    departuresList.forEach(item => {
      counts[item.motifDepart] = (counts[item.motifDepart] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [departuresList]);

  // Voluntary vs Involuntary breakdown
  const exitTypeData = useMemo(() => {
    const v = departuresList.filter(d => d.motif === 'Volontaire').length;
    const inv = departuresList.filter(d => d.motif === 'Involontaire').length;
    return [
      { name: 'Volontaires (Démission, ...)', value: v, color: '#14b8a6' },
      { name: 'Involontaires (Licenciement, Retraite, ...)', value: inv, color: '#f43f5e' }
    ];
  }, [departuresList]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Analyses des Départs (YTD {currentYear})</h3>
        <p className="text-xs text-slate-400">Analyses qualitatives et quantitatives des départs d'effectifs. Total cumulé : <strong>{departuresList.length} départs</strong></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Exits monthly chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Départs enregistrés par mois</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExits} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="Départs" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exit Nature Doughnut */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
          <h4 className="text-sm font-bold text-slate-800 font-display">Nature du départ (Volontaire / Involontaire)</h4>
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={exitTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {exitTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
            {exitTypeData.map((type, idx) => (
              <div key={idx} className="text-center">
                <span className="text-[10px] font-bold text-slate-400 block">{type.name}</span>
                <span className="text-lg font-bold" style={{ color: type.color }}>{type.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Motifs / reasons detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {exitMotifs.map((motif, idx) => {
          const pct = Number(((motif.value / (departuresList.length || 1)) * 100).toFixed(0));
          return (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Motif : {motif.name}</span>
              <span className="text-3xl font-bold text-rose-500 block">{motif.value}</span>
              <span className="text-xs text-slate-500">({pct}% des sorties)</span>
            </div>
          );
        })}
      </div>

      {/* Exits list log */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Détail et causes réelles des départs</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Matricule</th>
                <th className="p-4">Collaborateur</th>
                <th className="p-4">Date Départ</th>
                <th className="p-4">Motif</th>
                <th className="p-4">Cause de départ</th>
                <th className="p-4">Ancienneté</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {departuresList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">Aucun départ à afficher pour cette année.</td>
                </tr>
              ) : (
                departuresList.map((dep, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-mono font-semibold text-rose-600">{dep.matricule}</td>
                    <td className="p-4 font-semibold text-slate-800">{dep.prenom} {dep.nom}</td>
                    <td className="p-4 font-medium text-[11px]">{dep.dateDepart}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        {dep.motifDepart}
                      </span>
                    </td>
                    <td className="p-4 font-normal text-slate-500 max-w-sm truncate" title={dep.causeDepart}>{dep.causeDepart}</td>
                    <td className="p-4 font-mono">{dep.anciennete} ans</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------------------------------
// 5. TURNOVER TAB
// ----------------------------------------------------------------------------
export function TurnoverTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const currentYear = selectedYearMonth.substring(0, 4);

  // Compute stats dynamically by year
  const turnoverStats = useMemo(() => {
    // Collect active snapshots and departure lists monthly
    let sumActive = 0;
    let totalExits = 0;
    const monthsEvaluated = [];

    // Evaluate January to June 2026 or similar
    const maxMonth = currentYear === '2026' ? 6 : 12;
    for (let m = 1; m <= maxMonth; m++) {
      const mStr = String(m).padStart(2, '0');
      const ym = `${currentYear}-${mStr}`;
      
      const act = getActiveHeadcountSnapshot(lifecycles, ym, filters).length;
      const dep = getDeparturesList(lifecycles, ym, filters).length;

      sumActive += act;
      totalExits += dep;
      monthsEvaluated.push({ act, dep, ym, name: MONTHS_FR[mStr] });
    }

    const avgHeadcount = monthsEvaluated.length > 0 ? Math.round(sumActive / monthsEvaluated.length) : 0;
    const turnoverRate = avgHeadcount > 0 ? Number(((totalExits / avgHeadcount) * 100).toFixed(1)) : 0;

    return {
      avgHeadcount,
      totalExits,
      turnoverRate,
      monthsEvaluated
    };
  }, [lifecycles, currentYear, filters]);

  // Breakdown Turnover by Usine
  const usineTurnover = useMemo(() => {
    const usines = Array.from(new Set(lifecycles.map(l => l.usine)));
    
    return usines.map(usine => {
      // Create isolated subfilters
      const uFilters = { ...filters, usine };
      
      let sumActive = 0;
      let totalExits = 0;
      const maxMonth = currentYear === '2026' ? 6 : 12;
      for (let m = 1; m <= maxMonth; m++) {
        const mStr = String(m).padStart(2, '0');
        const ym = `${currentYear}-${mStr}`;
        
        sumActive += getActiveHeadcountSnapshot(lifecycles, ym, uFilters).length;
        totalExits += getDeparturesList(lifecycles, ym, uFilters).length;
      }
      
      const avg = maxMonth > 0 ? sumActive / maxMonth : 0;
      const rate = avg > 0 ? Number(((totalExits / avg) * 100).toFixed(1)) : 0;
      
      return { usine, rate, exits: totalExits, avg: Math.round(avg) };
    }).sort((a,b) => b.rate - a.rate);
  }, [lifecycles, currentYear, filters]);

  // Breakdown Turnover by Contract Type
  const contractTurnover = useMemo(() => {
    const contracts = ["CDI", "CDD", "CIVP"];
    
    return contracts.map(typeContrat => {
      const cFilters = { ...filters, typeContrat };
      
      let sumActive = 0;
      let totalExits = 0;
      const maxMonth = currentYear === '2026' ? 6 : 12;
      for (let m = 1; m <= maxMonth; m++) {
        const mStr = String(m).padStart(2, '0');
        const ym = `${currentYear}-${mStr}`;
        
        sumActive += getActiveHeadcountSnapshot(lifecycles, ym, cFilters).length;
        totalExits += getDeparturesList(lifecycles, ym, cFilters).length;
      }
      
      const avg = maxMonth > 0 ? sumActive / maxMonth : 0;
      const rate = avg > 0 ? Number(((totalExits / avg) * 100).toFixed(1)) : 0;
      
      return { contract: typeContrat, rate, exits: totalExits, avg: Math.round(avg) };
    }).sort((a,b) => b.rate - a.rate);
  }, [lifecycles, currentYear, filters]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Calculation Formula card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 font-mono">Détail du calcul automatique</span>
          <h2 className="text-xl font-bold font-display">Taux de Turnover de la société TERIAK</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Le taux de turnover annuel est mesuré sur l'année calendaire {currentYear} en divisant le nombre total de départs enregistrés par l'effectif moyen pondéré sur les mois évalués :
          </p>
          <div className="bg-white/10 rounded-lg p-3 font-mono text-[11px] text-teal-200">
            Turnover = (Total Départs : {turnoverStats.totalExits}) / (Effectif Moyen YTD : {turnoverStats.avgHeadcount}) × 100
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-5 text-center shrink-0 border border-slate-800 w-full md:w-56">
          <span className="text-xs font-semibold text-teal-200 block mb-1">Taux Annuel Moyen YTD</span>
          <span className="text-4xl font-extrabold font-display text-white block">{turnoverStats.turnoverRate}%</span>
          <span className="text-[10px] text-slate-400 block mt-2">({turnoverStats.monthsEvaluated.length} mois évalués)</span>
        </div>
      </div>

      {/* Monthly details of turnover */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Trend Table */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Détail Mensuel</h4>
          <div className="overflow-hidden border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">Mois</th>
                  <th className="p-3 text-center">Effectif</th>
                  <th className="p-3 text-center">Exits</th>
                  <th className="p-3 text-center">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {turnoverStats.monthsEvaluated.map((m, idx) => {
                  const rate = m.act > 0 ? ((m.dep / m.act) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700">{m.name}</td>
                      <td className="p-3 text-center font-mono">{m.act}</td>
                      <td className="p-3 text-center font-mono text-rose-500">{m.dep}</td>
                      <td className="p-3 text-center font-bold text-teal-600">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Turnover by Usines */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Taux de Turnover par Usine</h4>
          <div className="space-y-4">
            {usineTurnover.map((u, idx) => (
              <div key={idx} className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{u.usine}</span>
                  <span className="font-mono text-rose-600">{u.rate}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${Math.min(u.rate * 3, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Effectif Moyen : {u.avg}</span>
                  <span>{u.exits} Départs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Turnover by Contract */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Turnover par Type de Contrat</h4>
          <div className="space-y-4">
            {contractTurnover.map((c, idx) => (
              <div key={idx} className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span className="font-mono font-bold text-teal-600">{c.contract}</span>
                  <span className="font-mono text-amber-600">{c.rate}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(c.rate * 3, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Effectif Moyen : {c.avg}</span>
                  <span>{c.exits} Départs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

// ----------------------------------------------------------------------------
// 6. DEMOGRAPHICS TAB (Analyses démographiques)
// ----------------------------------------------------------------------------
export function DemographicsTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const activeEmployees = useMemo(() => {
    return getActiveHeadcountSnapshot(lifecycles, selectedYearMonth, filters);
  }, [lifecycles, selectedYearMonth, filters]);

  // Age Groups distribution
  const ageData = useMemo(() => {
    const buckets = {
      "<25 ans": 0,
      "25–34 ans": 0,
      "35–44 ans": 0,
      "45–54 ans": 0,
      "55 ans et plus": 0
    };
    activeEmployees.forEach(item => {
      const g = getAgeGroup(item.age);
      if (buckets[g as keyof typeof buckets] !== undefined) {
        buckets[g as keyof typeof buckets]++;
      }
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [activeEmployees]);

  // Seniority distribution
  const seniorityData = useMemo(() => {
    const buckets = {
      "<1 an": 0,
      "1–3 ans": 0,
      "3–5 ans": 0,
      "5–10 ans": 0,
      "> 10 ans": 0
    };
    activeEmployees.forEach(item => {
      const g = getSeniorityGroup(item.anciennete);
      if (buckets[g as keyof typeof buckets] !== undefined) {
        buckets[g as keyof typeof buckets]++;
      }
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [activeEmployees]);

  // Socio-professional category breakdown
  const socioProfData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmployees.forEach(item => {
      counts[item.categorieSocioProf] = (counts[item.categorieSocioProf] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeEmployees]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Analyses Démographiques des Effectifs</h3>
        <p className="text-xs text-slate-400">Structure d'âge, d'ancienneté et de catégories socioprofessionnelles pour les {activeEmployees.length} collaborateurs actifs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Age distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Répartition par tranche d'âge (Âge Réel)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seniority distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Ancienneté dans la société TERIAK</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seniorityData} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Socio-Professional Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {socioProfData.map((item, idx) => {
          const pct = Number(((item.value / (activeEmployees.length || 1)) * 100).toFixed(0));
          return (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Catégorie : {item.name}</span>
                <h4 className="text-2xl font-bold text-slate-800 font-display">{item.value} <span className="text-xs text-slate-400 font-normal">collaborateurs</span></h4>
              </div>
              <div className="bg-teal-50 border border-teal-100 text-teal-700 h-12 w-12 rounded-lg flex items-center justify-center font-bold font-display">
                {pct}%
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
}

// ----------------------------------------------------------------------------
// 7. ORGANISATIONAL TAB (Rankings & Managers)
// ----------------------------------------------------------------------------
export function OrganisationTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const activeEmployees = useMemo(() => {
    return getActiveHeadcountSnapshot(lifecycles, selectedYearMonth, filters);
  }, [lifecycles, selectedYearMonth, filters]);

  // Breakdown of headcount by Direction
  const directionsHeadcount = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmployees.forEach(e => {
      counts[e.direction] = (counts[e.direction] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [activeEmployees]);

  // Manager spans of control (N+1 direct reports)
  const managersSpan = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmployees.forEach(e => {
      counts[e.nPlus1] = (counts[e.nPlus1] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [activeEmployees]);

  // Top services by active headcount
  const topServices = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEmployees.forEach(e => {
      counts[e.service] = (counts[e.service] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [activeEmployees]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Analyses de la Structure Organisationnelle</h3>
        <p className="text-xs text-slate-400">Classements et répartition des effectifs par branches, services et superviseurs directs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Headcount by Direction bar visual */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Effectifs par Direction</h4>
          <div className="space-y-4">
            {directionsHeadcount.map((dir, idx) => {
              const pct = Number(((dir.value / activeEmployees.length) * 100).toFixed(0));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{dir.name}</span>
                    <span className="font-mono text-teal-600 font-bold">{dir.value}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Services Matrix */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Top 5 des Services par Effectif</h4>
          <div className="overflow-hidden border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">Rang</th>
                  <th className="p-3">Service</th>
                  <th className="p-3 text-center">Effectif Actuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {topServices.map((srv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold font-mono text-teal-600 text-center">#{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-700">{srv.name}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">{srv.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Managers & supervisors Spans */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h4 className="text-sm font-bold text-slate-800 font-display">Rapports Directs par N+1 (Supervision)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {managersSpan.slice(0, 8).map((mng, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Manager (N+1)</span>
              <h4 className="text-base font-bold text-slate-800 font-display truncate py-1">{mng.name}</h4>
              <p className="text-xs text-teal-600 font-semibold font-mono">{mng.value} collaborateurs directs</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------------------------------
// 8. TEMPORAL TREND TAB (Évolution temporelle)
// ----------------------------------------------------------------------------
export function EvolutionTab({ lifecycles, filters, selectedYearMonth }: ViewProps) {
  const currentYear = selectedYearMonth.substring(0, 4);

  const trendData = useMemo(() => {
    const data = [];
    const maxMonth = currentYear === '2026' ? 6 : 12;
    for (let m = 1; m <= maxMonth; m++) {
      const mStr = String(m).padStart(2, '0');
      const ym = `${currentYear}-${mStr}`;

      const act = getActiveHeadcountSnapshot(lifecycles, ym, filters).length;
      const rec = getRecruitmentsList(lifecycles, ym, filters).length;
      const dep = getDeparturesList(lifecycles, ym, filters).length;

      // Net change
      const delta = rec - dep;

      data.push({
        name: MONTHS_FR[mStr],
        Effectif: act,
        Recrutements: rec,
        Départs: dep,
        Solde: delta
      });
    }
    return data;
  }, [lifecycles, currentYear, filters]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">Courbes d'Évolution Temporelle</h3>
        <p className="text-xs text-slate-400">Analyse croisée des flux d'entrées (recrutements) et de sorties (départs) et leur impact sur le niveau d'effectif global pour l'année {currentYear}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend of headcount curve */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 font-display">Niveau d'effectif consolidé par mois</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: -30 }}>
                <defs>
                  <linearGradient id="colorEffectifTab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Effectif" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorEffectifTab)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Solde Net (entrées vs sorties) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 font-display">Solde net des flux d'effectifs</h4>
            <p className="text-xs text-slate-400">Solde = Recrutements - Départs par mois. Un solde positif indique un élargissement de l'équipe.</p>
          </div>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                {/* Solde color conditional - teal if positive, rose if negative */}
                <Bar dataKey="Solde" radius={[4, 4, 0, 0]} barSize={16}>
                  {trendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.Solde >= 0 ? '#14b8a6' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Inputs vs Outputs Line Overlay */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h4 className="text-sm font-bold text-slate-800 font-display">Courbes superposées : Recrutements vs Départs</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ left: -30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="Recrutements" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Départs" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
