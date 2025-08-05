import { exportDataFr } from "../../module_enregistrement/model/SaveAndexport/ExportManagerFr";

import React, { useState } from "react";

const ExportButton = ({ app }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [format, setFormat] = useState("xlsx");
  const [layout, setLayout] = useState("wide");
  const [timeFormat, setTimeFormat] = useState("float");
  const [splitByCategory, setSplitByCategory] = useState(false);
  const [step, setStep] = useState(0.1);

  const handleExport = () => {
    exportDataFr(app, {
      filePath: `annotations_fr.${format}`,
      format,
      layout,
      timeFormat,
      splitByCategory,
      step: parseFloat(step),
    });
  };

  return (
    <div className="relative inline-block text-center">
      {/* Bouton vert stylé */}
      <button
        onClick={() => setShowOptions((prev) => !prev)}
        className="w-48 h-16 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition inline-flex items-center justify-between"
      >
        <span>Exporter (FR)</span>
        <span className="ml-2 text-white text-sm">▼</span>
      </button>

      {/* Menu déroulant */}
      {showOptions && (
        <div className="absolute mt-2 z-10 bg-white text-black border border-gray-300 rounded-lg shadow-lg p-4 space-y-3 w-96">
          <div className="flex gap-4">
            <label className="flex flex-col text-sm text-black">
              Format:
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="mt-1 px-2 py-1 border rounded text-black"
              >
                <option value="xlsx">xlsx</option>
                <option value="csv">csv</option>
              </select>
            </label>
            <label className="flex flex-col text-sm text-black">
              Layout:
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className="mt-1 px-2 py-1 border rounded text-black"
              >
                <option value="wide">wide</option>
                <option value="long">long</option>
                <option value="duration">duration</option>
                <option value="transitions">transitions</option>
                <option value="coocurrences">coocurrences</option>
              </select>
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex flex-col text-sm text-black">
              Format du temps:
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="mt-1 px-2 py-1 border rounded text-black"
              >
                <option value="float">secondes</option>
                <option value="hms">hh:mm:ss</option>
              </select>
            </label>
            <label className="flex flex-col text-sm text-black">
              Step:
              <input
                type="number"
                step="0.1"
                value={step}
                onChange={(e) => setStep(e.target.value)}
                className="mt-1 px-2 py-1 border rounded w-20 text-black"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              checked={splitByCategory}
              onChange={(e) => setSplitByCategory(e.target.checked)}
            />
            Générer un fichier par catégorie
          </label>

          <button
            onClick={handleExport}
            className="w-full mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded shadow hover:bg-green-700 transition"
          >
            Lancer l’export
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
