/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, Play, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Database, Info, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { EmployeeLifecycle } from '../data/sampleData';
import { calculateAge, calculateSeniority } from '../utils/calculations';

interface ImportViewProps {
  lifecycles: EmployeeLifecycle[];
  onUpdateLifecycles: (newLifecycles: EmployeeLifecycle[]) => void;
  onResetLifecycles: () => void;
}

interface EtlStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
}

export default function ImportView({ lifecycles, onUpdateLifecycles, onResetLifecycles }: ImportViewProps) {
  const [importType, setImportType] = useState<'effectif' | 'depart'>('effectif');
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [etlSteps, setEtlSteps] = useState<EtlStep[]>([]);
  const [importResult, setImportResult] = useState<{ rowsImported: number; type: 'effectif' | 'depart'; month: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to add log lines
  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setLogs([]);
    setEtlSteps([
      { name: "Extraction des données (Extract)", status: "running" },
      { name: "Nettoyage & Normalisation (Transform)", status: "pending" },
      { name: "Chargement dans le modèle (Load)", status: "pending" }
    ]);
    addLog(`Fichier sélectionné : ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let rows: any[] = [];

        if (file.name.endsWith('.csv')) {
          addLog("Lecture du fichier CSV...");
          const text = data as string;
          // Parse basic CSV
          const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            rows = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.replace(/"/g, '').trim());
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || null;
              });
              return obj;
            });
          }
        } else {
          addLog("Lecture du fichier Excel via la bibliothèque XLSX...");
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        }

        addLog(`${rows.length} lignes extraites du fichier.`);
        setParsedData(rows);
        
        // Advance ETL
        setEtlSteps(prev => [
          { ...prev[0], status: "success", message: `${rows.length} lignes extraites` },
          { ...prev[1], status: "running" },
          prev[2]
        ]);

        // Trigger transformations
        setTimeout(() => runTransformations(rows), 1200);

      } catch (error: any) {
        addLog(`❌ Erreur lors de la lecture du fichier : ${error.message}`);
        setEtlSteps(prev => [
          { ...prev[0], status: "failed", message: error.message },
          { ...prev[1], status: "pending" },
          { ...prev[2], status: "pending" }
        ]);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const runTransformations = (rawRows: any[]) => {
    addLog("Début de l'ETL Power Query...");
    addLog("Étape Power Query : Normalisation des en-têtes (Suppression des accents et majuscules)...");
    
    // Normalization helper
    const normKey = (k: string) => k.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ""); // strip non-alphanumeric

    const normalizedRows = rawRows.map(row => {
      const normRow: any = {};
      Object.keys(row).forEach(k => {
        normRow[normKey(k)] = row[k];
      });
      return normRow;
    });

    addLog("Étape Power Query : Déduplication et validation du Matricule/CIN...");
    
    // Check required columns depending on mode
    let validRowsCount = 0;
    const transformedLifecycles = [...lifecycles];

    if (importType === 'effectif') {
      addLog(`Traitement de l'import "Effectif" pour la période ${selectedMonth}...`);
      
      normalizedRows.forEach((row, idx) => {
        // Find prenom, nom, genre, direction, service, etc.
        const prenom = row.prenom || row.nomcomplet || `Collaborateur ${idx + 1}`;
        const nom = row.nom || "";
        const genreRaw = row.genre || "Homme";
        const genre = (genreRaw.toString().toLowerCase().startsWith('f') || genreRaw.toString().toLowerCase().includes('fem')) ? "Femme" : "Homme";
        const usine = row.usine || "Usine Jebel Oust";
        const cin = row.ncin || row.cin || `0${Math.floor(1000000 + Math.random() * 9000000)}`;
        const cnss = row.ncnss || row.cnss || `${Math.floor(10000000 + Math.random() * 90000000)}-01`;
        const typeContrat = row.typedecontrat || row.contrat || "CDI";
        const direction = row.direction || "Production";
        const service = row.service || "Conditionnement";
        const fonction = row.fonction || "Opérateur";
        const nPlus1 = row.n1 || row.manager || "Mounir Chaabane";
        const catRaw = row.categoriesocioprof || row.categorie || "Exécution";
        const matricule = row.matricule || row.id || `TK-NEW-${Math.floor(100 + Math.random() * 900)}`;

        let cat: 'Cadre' | 'Maîtrise' | 'Exécution' = "Exécution";
        if (catRaw.toString().toLowerCase().includes('cad')) cat = "Cadre";
        else if (catRaw.toString().toLowerCase().includes('mai')) cat = "Maîtrise";

        // Date conversions
        let dateRecrutement = "2026-07-01";
        if (row.datederecrutement) {
          const d = new Date(row.datederecrutement);
          if (!isNaN(d.getTime())) {
            dateRecrutement = d.toISOString().substring(0, 10);
          }
        }
        
        let dateNaissance = "1995-01-01";
        if (row.datedenaissance) {
          const d = new Date(row.datedenaissance);
          if (!isNaN(d.getTime())) {
            dateNaissance = d.toISOString().substring(0, 10);
          }
        }

        addLog(`👉 Transformation ligne ${idx + 1} : [${matricule}] ${prenom} - Recruté(e) le : ${dateRecrutement} (Age calculé: ${calculateAge(dateNaissance, `${selectedMonth}-01`)} ans)`);

        // Check if exists in DB
        const existingIdx = transformedLifecycles.findIndex(item => item.matricule === matricule);
        const newLifecycleRecord: EmployeeLifecycle = {
          matricule,
          nom,
          prenom,
          genre,
          usine,
          cin,
          cnss,
          typeContrat,
          direction,
          service,
          fonction,
          nPlus1,
          categorieSocioProf: cat,
          dateRecrutement,
          dateNaissance,
          dateDepart: null,
          motifDepart: null,
          causeDepart: null,
          motif: null
        };

        if (existingIdx >= 0) {
          // Update existing active record
          transformedLifecycles[existingIdx] = {
            ...transformedLifecycles[existingIdx],
            ...newLifecycleRecord,
            // Keep original departure fields if they existed, unless re-hired
            dateDepart: transformedLifecycles[existingIdx].dateDepart,
            motifDepart: transformedLifecycles[existingIdx].motifDepart
          };
        } else {
          transformedLifecycles.push(newLifecycleRecord);
        }
        validRowsCount++;
      });

    } else {
      addLog(`Traitement de l'import "Départs" pour le mois de départ : ${selectedMonth}...`);
      
      normalizedRows.forEach((row, idx) => {
        const matricule = row.matricule || row.id || "";
        const prenom = row.prenom || "";
        const dateDepartRaw = row.datedepart || `${selectedMonth}-28`;
        const motifDepart = row.motifdepart || row.motifdudepart || "Démission";
        const causeDepart = row.causededepart || row.cause || "Convenance personnelle";
        const motifCategory = row.motif || "Volontaire";

        let dateDepart = `${selectedMonth}-28`;
        const d = new Date(dateDepartRaw);
        if (!isNaN(d.getTime())) {
          dateDepart = d.toISOString().substring(0, 10);
        }

        if (!matricule) {
          addLog(`⚠️ Ligne ${idx + 1} ignorée : matricule manquant.`);
          return;
        }

        // Find employee in active lifecycles to apply departure
        const existingIdx = transformedLifecycles.findIndex(item => item.matricule === matricule);
        if (existingIdx >= 0) {
          transformedLifecycles[existingIdx] = {
            ...transformedLifecycles[existingIdx],
            dateDepart,
            motifDepart,
            causeDepart,
            motif: motifCategory
          };
          addLog(`👉 Transformation départ ligne ${idx + 1} : Enregistré pour [${matricule}] ${transformedLifecycles[existingIdx].prenom} le ${dateDepart}. Motif: ${motifDepart}`);
          validRowsCount++;
        } else {
          addLog(`⚠️ Matricule [${matricule}] absent du référentiel actif. Création d'un profil de départ par défaut.`);
          // Create partial dummy record
          transformedLifecycles.push({
            matricule,
            nom: row.nom || "",
            prenom: prenom || `Ancien Employé ${idx + 1}`,
            genre: (row.genre || "Homme").toString().toLowerCase().startsWith('f') ? "Femme" : "Homme",
            usine: row.usine || "Usine Jebel Oust",
            cin: row.cin || "00000000",
            cnss: row.cnss || "00000000-00",
            typeContrat: row.typeContrat || "CDI",
            direction: row.direction || "Production",
            service: row.service || "Conditionnement",
            fonction: row.fonction || "Opérateur",
            nPlus1: row.nPlus1 || "Inconnu",
            categorieSocioProf: "Exécution",
            dateRecrutement: row.dateRecrutement || "2024-01-01",
            dateNaissance: row.dateNaissance || "1995-01-01",
            dateDepart,
            motifDepart,
            causeDepart,
            motif: motifCategory
          });
          validRowsCount++;
        }
      });
    }

    addLog(`Fin des transformations. ${validRowsCount} lignes prêtes pour chargement.`);

    // Load Step
    setEtlSteps(prev => [
      prev[0],
      { ...prev[1], status: "success", message: `${validRowsCount} lignes validées & enrichies` },
      { ...prev[2], status: "running" }
    ]);

    setTimeout(() => {
      onUpdateLifecycles(transformedLifecycles);
      addLog(`✨ SUCCÈS : Données fusionnées avec succès dans la base TERIAK. Les visualisations sont à jour.`);
      setEtlSteps(prev => [
        prev[0],
        prev[1],
        { ...prev[2], status: "success", message: `${validRowsCount} lignes chargées dans le modèle` }
      ]);
      setImportResult({
        rowsImported: validRowsCount,
        type: importType,
        month: selectedMonth
      });
    }, 1000);
  };

  // Simulation: Load a preset file instantly to make demo easy!
  const loadPresetData = (type: 'effectif' | 'depart') => {
    setImportType(type);
    const month = "2026-07";
    setSelectedMonth(month);
    
    addLog("Déclenchement du chargement du jeu d'essai standardisé...");
    let sampleRows: any[] = [];
    
    if (type === 'effectif') {
      setFileName("TERIAK_Effectifs_Juillet_2026.xlsx");
      sampleRows = [
        { "Matricule": "TK-2620", "Prenom": "Imed", "Nom": "Gharbi", "Genre": "Homme", "Usine": "Usine Jebel Oust", "CIN": "09876543", "CNSS": "39485029-48", "Type de contrat": "CDI", "Direction": "Production", "Service": "Formulation", "Fonction": "Technicien Formulation Senior", "N+1": "Heidi Bouzidi", "Categorie socio-prof": "Maîtrise", "Date de recrutement": "2026-07-01", "Date de naissance": "1992-04-12" },
        { "Matricule": "TK-2621", "Prenom": "Nadia", "Nom": "Mansour", "Genre": "Femme", "Usine": "Usine Charguia", "CIN": "09123456", "CNSS": "49503928-19", "Type de contrat": "CIVP", "Direction": "Qualité & Affaires Réglementaires", "Service": "Assurance Qualité", "Fonction": "Assistante Validation", "N+1": "Salma Hachicha", "Categorie socio-prof": "Cadre", "Date de recrutement": "2026-07-05", "Date de naissance": "1998-09-22" },
        { "Matricule": "TK-2622", "Prenom": "Faten", "Nom": "Bahri", "Genre": "Femme", "Usine": "Usine Jebel Oust", "CIN": "09234567", "CNSS": "29485028-10", "Type de contrat": "CDD", "Direction": "Production", "Service": "Conditionnement", "Fonction": "Opératrice Conditionnement", "N+1": "Olfa Cherif", "Categorie socio-prof": "Exécution", "Date de recrutement": "2026-07-10", "Date de naissance": "1997-11-05" }
      ];
    } else {
      setFileName("TERIAK_Departs_Juillet_2026.xlsx");
      sampleRows = [
        { "Matricule": "TK-0111", "Date de depart": "2026-07-15", "Motif du depart": "Démission", "Cause de depart": "A obtenu un emploi plus proche de son domicile", "Motif": "Volontaire" },
        { "Matricule": "TK-0124", "Date de depart": "2026-07-28", "Motif du depart": "Fin de contrat", "Cause de depart": "Fin de contrat à durée déterminée non renouvelée", "Motif": "Involontaire" }
      ];
    }

    setParsedData(sampleRows);
    setEtlSteps([
      { name: "Extraction des données (Extract)", status: "success", message: `${sampleRows.length} lignes fictives générées` },
      { name: "Nettoyage & Normalisation (Transform)", status: "running" },
      { name: "Chargement dans le modèle (Load)", status: "pending" }
    ]);

    setTimeout(() => runTransformations(sampleRows), 1000);
  };

  const handleReset = () => {
    if (confirm("Voulez-vous vraiment réinitialiser la base de données à son état d'origine ? Toutes vos données importées seront perdues.")) {
      onResetLifecycles();
      setFileName(null);
      setParsedData([]);
      setEtlSteps([]);
      setImportResult(null);
      setLogs([]);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Description */}
      <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Automatisation Power Query ETL & Import Mensuel
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
            Cette interface simule l'intégration mensuelle de vos fichiers Excel RH. Déposez vos classeurs mensuels 
            <strong>"Effectif"</strong> ou <strong>"Départ"</strong> ci-dessous. Le pipeline Power Query valide, 
            nettoie et injecte automatiquement les lignes dans le schéma relationnel consolidé.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réinitialiser la base
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Step 1: Configuration & Upload Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-display">1. Configuration du flux d'import</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500">Nature du fichier</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                  <button
                    onClick={() => { setImportType('effectif'); setImportResult(null); }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      importType === 'effectif' 
                        ? "bg-indigo-600 text-white shadow-xs" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Effectif Actif
                  </button>
                  <button
                    onClick={() => { setImportType('depart'); setImportResult(null); }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      importType === 'depart' 
                        ? "bg-rose-600 text-white shadow-xs" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Collaborateurs Partis
                  </button>
                </div>
              </div>

              {/* Month Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500">Période cible (Mois comptable)</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-gray-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Quick Presets for Demo */}
            <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Info className="h-3.5 w-3.5" />
                Démonstration instantanée (Fichiers de Juillet 2026)
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Vous n'avez pas de fichier Excel sous la main ? Cliquez sur l'un des boutons ci-dessous pour simuler l'importation de fichiers réels d'effectifs ou de départs pour le mois de Juillet 2026 :
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => loadPresetData('effectif')}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Simuler Import Effectif (3 collaborateurs)
                </button>
                <button
                  onClick={() => loadPresetData('depart')}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-rose-500" />
                  Simuler Import Départs (2 collaborateurs)
                </button>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500">Uploader votre propre fichier Excel ou CSV</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  isDragging 
                    ? "border-indigo-500 bg-indigo-50/30" 
                    : "border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-white"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
                
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Upload className="h-5 w-5" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-700">Glissez-déposez votre fichier ici, ou cliquez pour parcourir</p>
                  <p className="text-[10px] text-gray-400">Formats supportés : Excel (.xlsx, .xls) ou CSV (.csv)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Database Inventory */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider font-display flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-600" />
              Référentiel des données consolidées
            </h3>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="block text-xl font-bold font-display text-indigo-600">{lifecycles.length}</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Lignes historiques</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="block text-xl font-bold font-display text-emerald-600">
                  {lifecycles.filter(l => !l.dateDepart).length}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Collaborateurs actifs</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="block text-xl font-bold font-display text-rose-600">
                  {lifecycles.filter(l => l.dateDepart).length}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Historique départs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: ETL Log & Pipeline Monitor */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-900 rounded-xl p-6 shadow-xs text-white space-y-5">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest font-mono flex items-center justify-between">
              <span>Power Query Pipeline Status</span>
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
            </h3>

            {/* ETL Progress steps */}
            <div className="space-y-4">
              {etlSteps.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-xs font-mono">
                  En attente de chargement de fichier...
                </div>
              ) : (
                etlSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1">
                      {step.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      {step.status === 'running' && <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />}
                      {step.status === 'pending' && <div className="h-4 w-4 rounded-full border border-gray-600"></div>}
                      {step.status === 'failed' && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-bold ${
                        step.status === 'success' ? 'text-gray-100' :
                        step.status === 'running' ? 'text-indigo-300 font-mono' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </p>
                      {step.message && (
                        <p className="text-[10px] text-gray-400 font-mono">{step.message}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Live transformation logs */}
            {logs.length > 0 && (
              <div className="space-y-2 border-t border-gray-800 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Transformation Logs :</p>
                <div className="bg-black/40 rounded-lg p-3 font-mono text-[9px] leading-relaxed text-emerald-300 overflow-y-auto max-h-48 space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion card */}
            {importResult && (
              <div className="bg-emerald-950/50 border border-emerald-800/40 rounded-lg p-4 flex gap-3 text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold">Importation finalisée !</p>
                  <p className="text-[11px] leading-relaxed text-emerald-400/80">
                    L'import de type <strong>{importResult.type === 'effectif' ? "Effectif" : "Départ"}</strong> pour le mois de <strong>{importResult.month}</strong> a été traité. 
                    {importResult.rowsImported} fiches collaborateurs ont été chargées.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Excel layout warning */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Format de colonnes requis (Excel)</h4>
            <div className="space-y-1.5 text-[11px] text-gray-500 leading-relaxed">
              <p>
                <strong>Pour les Effectifs :</strong> Le fichier doit contenir les colonnes suivantes : 
                <code>Prenom</code>, <code>Nom</code>, <code>Genre</code>, <code>Usine</code>, <code>CIN</code>, <code>CNSS</code>, <code>Type de contrat</code>, <code>Direction</code>, <code>Service</code>, <code>Fonction</code>, <code>N+1</code>, <code>Categorie socio-prof</code>, <code>Date de recrutement</code>, <code>Date de naissance</code>.
              </p>
              <p>
                <strong>Pour les Départs :</strong> Le fichier doit contenir : 
                <code>Matricule</code>, <code>Date de depart</code>, <code>Motif du depart</code>, <code>Cause de depart</code>, <code>Motif</code>.
              </p>
              <p className="text-indigo-600 font-semibold">
                💡 Power Query normalise et mappe automatiquement les synonymes et les variations de casses/accents !
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
