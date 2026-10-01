/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, FileText, Calendar, ArrowRight, Check, Copy, HelpCircle, Layers, Settings, ShieldAlert } from 'lucide-react';

interface DaxMeasure {
  name: string;
  category: 'Effectif' | 'Recrutement' | 'Départ' | 'Turnover';
  description: string;
  formula: string;
}

const DAX_MEASURES: DaxMeasure[] = [
  {
    name: "Effectif Actuel",
    category: "Effectif",
    description: "Calcule le nombre de collaborateurs actifs à la fin de la période sélectionnée (par exemple, fin de mois).",
    formula: `Effectif Actuel = 
CALCULATE(
    COUNTROWS(Fact_Effectifs),
    FILTER(
        ALL(Fact_Effectifs),
        Fact_Effectifs[DATE_DE_RECRUTEMENT] <= MAX(Dim_Calendrier[Date]) &&
        (ISBLANK(Fact_Effectifs[Date_de_depart]) || Fact_Effectifs[Date_de_depart] > MAX(Dim_Calendrier[Date]))
    )
)`
  },
  {
    name: "Effectif Moyen",
    category: "Effectif",
    description: "Calcule l'effectif moyen sur la période (mensuelle, trimestrielle ou annuelle) pour servir de dénominateur au Taux de Turnover.",
    formula: `Effectif Moyen = 
AVERAGEX(
    VALUES(Dim_Calendrier[AnneeMois]),
    [Effectif Actuel]
)`
  },
  {
    name: "Nombre de Recrutements",
    category: "Recrutement",
    description: "Compte le nombre de collaborateurs recrutés au cours de la période sélectionnée.",
    formula: `Nombre de Recrutements = 
CALCULATE(
    COUNT(Fact_Effectifs[MATRICULE]),
    USERELATIONSHIP(Fact_Effectifs[DATE_DE_RECRUTEMENT], Dim_Calendrier[Date])
)`
  },
  {
    name: "Nombre de Départs",
    category: "Départ",
    description: "Compte le nombre de départs enregistrés au cours de la période sélectionnée.",
    formula: `Nombre de Départs = 
CALCULATE(
    COUNT(Fact_Departs[MATRICULE]),
    USERELATIONSHIP(Fact_Departs[Date_de_depart], Dim_Calendrier[Date])
)`
  },
  {
    name: "Taux de Turnover (%)",
    category: "Turnover",
    description: "Calcule le taux de rotation du personnel sur la période selon la formule standard : Départs / Effectif Moyen × 100.",
    formula: `Taux de Turnover = 
DIVIDE(
    [Nombre de Départs],
    [Effectif Moyen],
    0
) * 100`
  },
  {
    name: "Variation des Effectifs",
    category: "Effectif",
    description: "Calcule le solde net entre les entrées (recrutements) et les sorties (départs) sur la période.",
    formula: `Variation des Effectifs = [Nombre de Recrutements] - [Nombre de Départs]`
  }
];

export default function ModelView() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Tous");

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredMeasures = activeCategory === "Tous" 
    ? DAX_MEASURES 
    : DAX_MEASURES.filter(m => m.category === activeCategory);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Introduction */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Database className="h-6 w-6 text-indigo-300" />
          Modélisation BI & Architecture des Données
        </h2>
        <p className="mt-2 text-indigo-100 max-w-4xl text-sm leading-relaxed">
          Pour garantir des performances optimales et une flexibilité analytique conforme aux standards de la Business Intelligence, 
          le modèle de données de la société <strong>TERIAK</strong> est structuré en un <strong>Schéma en Étoile (Star Schema)</strong>. 
          Les tables de dimensions (Dim) entourent les tables de faits (Fact), éliminant la redondance et facilitant les calculs DAX.
        </p>
      </div>

      {/* Interactive Star Schema Visualizer */}
      <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6 font-display flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-600" />
          Visualisation du Modèle Relationnel (Schéma en Étoile)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center justify-center p-4 bg-gray-50 rounded-xl overflow-x-auto">
          {/* Dimension Tables (Left Side) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">Tables de Dimensions</h4>
            
            {/* Dim_Usine */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs hover:border-indigo-400 transition-colors">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-1 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-xs font-bold text-gray-700">Dim_Usine</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>🔑 Code_Usine (PK)</li>
                <li>• Nom_Usine</li>
                <li>• Localisation</li>
              </ul>
            </div>

            {/* Dim_Organisation */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs hover:border-indigo-400 transition-colors">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-1 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-xs font-bold text-gray-700">Dim_Structure</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>🔑 Code_Service (PK)</li>
                <li>• Direction</li>
                <li>• Service</li>
                <li>• Fonction</li>
              </ul>
            </div>

            {/* Dim_SocioProf */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs hover:border-indigo-400 transition-colors">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-1 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-xs font-bold text-gray-700">Dim_SocioProf</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>🔑 Categorie_SocioProf (PK)</li>
                <li>• Description_Socio</li>
              </ul>
            </div>
          </div>

          {/* Central Fact Tables */}
          <div className="space-y-8 flex flex-col items-center">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">Tables de Faits</h4>

            {/* Fact_Effectifs */}
            <div className="w-full max-w-xs bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 shadow-sm relative">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-600 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-indigo-900">Fact_Effectifs</span>
                </div>
                <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-full font-mono">Actifs</span>
              </div>
              <ul className="text-xs text-indigo-950 space-y-1.5 font-mono">
                <li>🔑 MATRICULE (PK)</li>
                <li>🔗 Code_Usine (FK)</li>
                <li>🔗 Code_Service (FK)</li>
                <li>🔗 Categorie_SocioProf (FK)</li>
                <li>🔗 Date_Recrutement_Key (FK)</li>
                <li>• CIN / CNSS</li>
                <li>• Type de Contrat</li>
                <li>• Nom & Prénom</li>
                <li>• Date Naissance (Age)</li>
              </ul>
              {/* Relationship lines pointers */}
              <div className="hidden lg:block absolute left-0 top-1/2 -translate-x-full h-[1px] w-4 bg-indigo-300"></div>
              <div className="hidden lg:block absolute right-0 top-1/2 translate-x-full h-[1px] w-4 bg-indigo-300"></div>
            </div>

            {/* Fact_Departs */}
            <div className="w-full max-w-xs bg-rose-50 border-2 border-rose-200 rounded-xl p-4 shadow-sm relative">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-rose-600" />
                  <span className="font-mono text-xs font-bold text-rose-900">Fact_Departs</span>
                </div>
                <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full font-mono">Départs</span>
              </div>
              <ul className="text-xs text-rose-950 space-y-1.5 font-mono">
                <li>🔑 MATRICULE (PK)</li>
                <li>🔗 Code_Usine (FK)</li>
                <li>🔗 Code_Service (FK)</li>
                <li>🔗 Categorie_SocioProf (FK)</li>
                <li>🔗 Date_Depart_Key (FK)</li>
                <li>• Date_Recrutement_Key</li>
                <li>• Motif & Cause de départ</li>
                <li>• Type de Contrat</li>
                <li>• Ancienneté Réelle</li>
              </ul>
            </div>
          </div>

          {/* Dimension Tables (Right Side) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">Dimensions Communes</h4>

            {/* Dim_Calendrier */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs hover:border-indigo-400 transition-colors">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-1 mb-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <span className="font-mono text-xs font-bold text-gray-700">Dim_Calendrier</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>🔑 Date (PK)</li>
                <li>• Année</li>
                <li>• Trimestre</li>
                <li>• Numéro de Mois</li>
                <li>• Nom du Mois (Fr)</li>
                <li>• Semestre</li>
              </ul>
              <div className="mt-2 text-[10px] bg-amber-50 text-amber-700 p-1.5 rounded border border-amber-100">
                ⚠️ Connectée à <strong>Fact_Effectifs</strong> et <strong>Fact_Departs</strong> via des relations actives/inactives pour l'analyse temporelle (Time Intelligence).
              </div>
            </div>

            {/* Dim_Manager */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xs hover:border-indigo-400 transition-colors">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-1 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-xs font-bold text-gray-700">Dim_Manager</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>🔑 N_Plus_1_ID (PK)</li>
                <li>• Nom_Manager</li>
                <li>• Niveau_Hierarchique</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* DAX Formulas Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Formules de calcul DAX optimisées
            </h3>
            <p className="text-xs text-gray-500">
              Sélectionnez et copiez ces mesures clés pour les intégrer directement dans votre modèle Power BI.
            </p>
          </div>

          {/* Categories Filters */}
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
            {["Tous", "Effectif", "Recrutement", "Départ", "Turnover"].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeCategory === cat 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of measures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMeasures.map((measure, index) => {
            const actualIndex = DAX_MEASURES.findIndex(m => m.name === measure.name);
            return (
              <div key={index} className="bg-white rounded-xl shadow-xs border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display font-bold text-gray-800 text-sm">{measure.name}</h4>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      measure.category === 'Effectif' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                      measure.category === 'Recrutement' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      measure.category === 'Départ' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {measure.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{measure.description}</p>
                </div>

                <div className="bg-gray-900 p-4 border-t border-gray-800 relative group font-mono text-xs">
                  <button
                    onClick={() => handleCopy(measure.formula, actualIndex)}
                    className="absolute right-3 top-3 bg-gray-800 hover:bg-gray-700 text-gray-300 p-1.5 rounded-md transition-colors"
                    title="Copier le code"
                  >
                    {copiedIndex === actualIndex ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <pre className="text-indigo-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 pr-6">
                    <code>{measure.formula}</code>
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Implementation Guidance */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 items-start text-amber-800">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="font-bold text-sm">Conseil d'implémentation Power BI (Time Intelligence)</h4>
          <p className="text-xs leading-relaxed">
            Pour que les mesures DAX d'<strong>Effectif Actuel</strong> et de <strong>Turnover</strong> s'actualisent de manière optimale sans boucle infinie, configurez une table de dates dédiée appelée <code>Dim_Calendrier</code>. Activez l'option <strong>Marquer comme table de dates</strong> dans Power BI Desktop et vérifiez que les relations avec vos tables de faits sont configurées en mode d'intégrité référentielle approprié.
          </p>
        </div>
      </div>
    </div>
  );
}
