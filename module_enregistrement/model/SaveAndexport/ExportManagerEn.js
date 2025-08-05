// Nécessite `xlsx` : installe avec `npm install xlsx`

// const XLSX = require("xlsx");
// const fs = require("fs");
// const path = require("path");

// const Application = require('../Application');

// const Annotation = require('../Structures/Annotation');
// const AnnotationCategory = require('../Structures/AnnotationCategory');
// const Time = require('../Structures/Time');

// Nécessite `xlsx` : installe avec `npm install xlsx`
import * as XLSX from "xlsx"; // ✅ compatible avec Vite + ESM
import fs from "fs";
import path from "path";

import Application from '../Application.js';
import Annotation from '../Structures/Annotation.js';
import AnnotationCategory from '../Structures/AnnotationCategory.js';
import Time from '../Structures/Time.js';


// prétraitement pour faciliter les fonctions suivantes
function getFlatAnnotations(app) {
    const annotationItems = app.getAnnotationOrCategory();
    const flat = [];
    annotationItems.forEach(item => {
        if (item instanceof Annotation) {
            flat.push({
                category: "",
                name: item.getName(),
                times: item.getAllTimes(),
                isDiscrete: item.getIsDiscrete()
            });
        } else if (item instanceof AnnotationCategory) {
            item.getAnnotations().forEach(annotation => {
                flat.push({
                    category: item.getName(),
                    name: annotation.getName(),
                    times: annotation.getAllTimes(),
                    isDiscrete: annotation.getIsDiscrete()
                });
            });
        }
    });
    return flat;
}

// si l'option splitByCategory est à true, cette fonction sépare les annotations par 
// categories pour générer les différentes feuilles de calcul/fichiers !
function splitFlatAnnotations(flatAnnotations) {
    const split = {};
    flatAnnotations.forEach(annotation => {
        const key = annotation.category || "Autonomous";
        if (!split[key]) split[key] = [];
        split[key].push(annotation);
    });
    return split;
}


/* ------------------ FONCTIONS FORMATS ------------------ */

// format "long" -> une ligne de tableur par instance d'annotation
function exportLongFormat(flatAnnotations, useTimeFormat = "float") {
    return flatAnnotations.flatMap(({ category, name, times, isDiscrete }) =>
        times.map(time => ({
            Annotation: name,
            Category: category,
            Start: formatTime(time.getStart(), useTimeFormat),
            End: formatTime(time.getEnd(), useTimeFormat),
            DiscreteOrContinuous: isDiscrete ? 'Discrete' : 'Continuous'
        }))
    );
}

// format "wide" -> une colone de tableur par annotation, avec une échelle de temps 
// sur les colones de gauche.
function exportWideFormat(flatAnnotations, step = 1, useTimeFormat = "float") {
    let min = Infinity;
    let max = -Infinity;
    flatAnnotations.forEach(({ times }) => {
        times.forEach(time => {
            min = Math.min(min, time.getStart());
            max = Math.max(max, time.getEnd());
        });
    });

    const rows = [];
    for (let tabTime = min; tabTime < max; tabTime += step) {
        const row = {
            Start: formatTime(tabTime, useTimeFormat),
            End: formatTime(tabTime + step, useTimeFormat),
        };
        flatAnnotations.forEach(({ name, category, times, isDiscrete }) => {
            const key = category ? `${category}/${name}` : name;
            row[key] = 0;
            times.forEach(annotationTime => {
                const start = annotationTime.getStart();
                const end = annotationTime.getEnd();
                const active = isDiscrete ? (start >= tabTime && start < tabTime + step) : !(end <= tabTime || start >= tabTime + step);
                if (active) row[key] = 1;
            });
        });
        rows.push(row);
    }
    return rows;
}

// retourne un tableau du nombre d'instances et de la durée cumulée de chaque annotation.
function exportCumulativeDuration(flatAnnotations) {
    const grouped = {};
    flatAnnotations.forEach(({ category, name, times, isDiscrete }) => {
        const key = category || "Autonomous";
        if (!grouped[key]) grouped[key] = [];
        const count = times.length;
        const total = times.reduce((sum, t) => sum + (t.getEnd() - t.getStart()), 0);
        const discreteOrContinuous = isDiscrete ? 'Discrete' : 'Continuous';
        grouped[key].push({
            Category: key,
            Annotation: name,
            InstancesCount: count,
            TotalDuration: total,
            DiscreteOrContinuous: discreteOrContinuous
        });
    });
    return grouped;
}

// retourne une matrice de transitions (compte le nb de fois ou les instances d'une 
// annotation suivent les instances d'une autre; ex : nombre de fois où Bob a parlé 
// après Alice, dans le temps step qui à suivi, ici 1 seconde)
function exportTransitionMatrix(flatAnnotations, step = 1) {
    let min = Infinity;
    let max = -Infinity;

    flatAnnotations.forEach(({ times }) => {
        times.forEach(t => {
            min = Math.min(min, t.getStart());
            max = Math.max(max, t.getEnd());
        });
    });

    const keys = [...new Set(flatAnnotations.map(({ category, name }) =>
        category ? `${category}/${name}` : name
    ))];

    // TimelineStart → liste d'ensembles des annotations activées à chaque pas
    // TimelineEnd   → liste d'ensembles des annotations désactivées à chaque pas
    const timelineStart = [];
    const timelineEnd = [];

    // Indice d
    const instanceCounter = [];
    keys.forEach(key => {
        instanceCounter[key] = 0;
    });
    for (let t = min; t <= max; t += step) {
        const activated = new Set();
        const deactivated = new Set();
        flatAnnotations.forEach(({ name, category, times }) => {
            const key = category ? `${category}/${name}` : name;
            times.forEach((time, i) => {
                const start = time.getStart();
                const end = time.getEnd();
                if (t <= start && start < t + step) {
                    instanceCounter[key]++;
                    activated.add({key, time : start, counter : instanceCounter[key], index : i});
                }
                if (t <= end && end < t + step) {
                    deactivated.add({key, time : end, counter : instanceCounter[key], index : i});
                }
            });
        });
        timelineStart.push(activated);
        timelineEnd.push(deactivated);
    }

    // Création de la matrice vide
    const matrix = {};
    keys.forEach(from => {
        matrix[from] = Object.fromEntries(keys.map(to => [to, 0]));
    });

    // Parcours des transitions temporelles
    for (let i = 1; i < timelineEnd.length; i++) {
        timelineEnd[i - 1].forEach(({key : fromKey, time : end, index : iFrom}) => {
            timelineStart[i-1].forEach(({key : toKey, time : start, index : iTo}) => {
                if (end <= start&&(fromKey != toKey||(fromKey == toKey&&iFrom != iTo)))
                matrix[fromKey][toKey] += 1;
            });
            timelineStart[i].forEach(({key : toKey, time : start, index : iTo}) => {
                if (end + step > start&&(fromKey != toKey||(fromKey == toKey&&iFrom != iTo)))
                matrix[fromKey][toKey] += 1;
            });
        });
    }

    // On convertit en tableau pour Excel
    const result = [];
    keys.forEach(from => {
        const row = { From: from };
        keys.forEach(to => {
            row[to] = matrix[from][to];
        });
        result.push(row);
    });

    // Une seule feuille nommée "Transitions"
    return { Transitions: result };
}

// retourne une matrice de coocurrences (nombre d'intervalles de temps 
// où deux annotations sont actives en même temps)
function exportCoocurrenceMatrix(flatAnnotations, step = 1) {
    let min = Infinity;
    let max = -Infinity;

    // Déterminer l'intervalle temporel global
    flatAnnotations.forEach(({ times }) => {
        times.forEach(t => {
            min = Math.min(min, t.getStart());
            max = Math.max(max, t.getEnd());
        });
    });

    // Générer la liste des clés (nom complet annotation)
    const keys = flatAnnotations.map(({ category, name }) => category ? `${category}/${name}` : name);
    const uniqueKeys = [...new Set(keys)];

    // Initialiser la matrice vide
    const matrix = {};
    uniqueKeys.forEach(a => {
        matrix[a] = Object.fromEntries(uniqueKeys.map(b => [b, 0]));
    });

    // À chaque pas de temps, détecter les annotations actives
    for (let t = min; t <= max; t += step) {
        const active = new Set();

        flatAnnotations.forEach(({ name, category, times }) => {
            const key = category ? `${category}/${name}` : name;
            times.forEach(time => {
                const s = time.getStart();
                const e = time.getEnd();
                if (e > t && s < t + step) {
                    active.add(key);
                }
            });
        });

        // Pour chaque paire d’annotations actives, incrémenter la matrice
        const activeList = Array.from(active);
        for (let i = 0; i < activeList.length; i++) {
            for (let j = 0; j < activeList.length; j++) {
                matrix[activeList[i]][activeList[j]] += 1;
            }
        }
    }

    // Convertir la matrice en un objet exploitable par exportData
    // On convertit en tableau pour Excel
    const result = [];
    keys.forEach(a => {
        const row = { Items: a };
        keys.forEach(b => {
            row[b] = matrix[a][b];
        });
        result.push(row);
    });

    // Une seule feuille nommée "Coocurrences"
    return { Coocurrences: result };
}


// sélection du format horaire : 'float' pour une représentation en secondes, 
// 'hms' pour une représentation hh:mm:ss
function formatTime(value, format) {
    if (format === "hms") {
        const h = String(Math.floor(value / 3600)).padStart(2, '0');
        const m = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
        const s = String((value % 60).toFixed(2)).padStart(5, '0');
        return `${h}:${m}:${s}`;
    }
    return value;
}

// fonction générale du module, la seule à être appelée en dehors !
export function exportDataEn(app, options) {
    const {
        filePath,
        format = "xlsx",            // "xlsx" ou "csv"
        layout = "wide",            // "long" ou "wide" ou "duration" ou "transitions" ou "coocurrences"
        timeFormat = "float",       // "float" ou "hms"
        splitByCategory = false,    // si mis à "true", génère une feuille de calcul (xlsx) ou un fichier (csv) par annotation
        step = 0.1                  // pas temporel, utile pour les formats "wide" et "transitions"
    } = options;

    const flat = getFlatAnnotations(app);
    let dataSheets = {};

    if (splitByCategory) {
        const split = splitFlatAnnotations(flat);
        Object.entries(split).forEach(([cat, subFlat]) => {
            if (layout === "long") {
                dataSheets[cat] = exportLongFormat(subFlat, timeFormat);
            } else if (layout === "wide") {
                dataSheets[cat] = exportWideFormat(subFlat, step, timeFormat);
            } else if (layout === "duration") {
                const durationSheets = exportCumulativeDuration(subFlat);
                Object.assign(dataSheets, durationSheets);
            } else if (layout === "transitions") {
                const transitionSheets = exportTransitionMatrix(subFlat, step);
                Object.assign(dataSheets, transitionSheets);
            } else if (layout === "coocurrences") {
                const coocurrencesSheets = exportCoocurrenceMatrix(subFlat, step);
                Object.assign(dataSheets, coocurrencesSheets);
            }
        });
    } else {
        if (layout === "long") {
            dataSheets = { Annotations: exportLongFormat(flat, timeFormat) };
        } else if (layout === "wide") {
            dataSheets = { Annotations: exportWideFormat(flat, step, timeFormat) };
        } else if (layout === "duration") {
            dataSheets = exportCumulativeDuration(flat);
        } else if (layout === "transitions") {
            dataSheets = exportTransitionMatrix(flat, step);
        } else if (layout === "coocurrences") {
            dataSheets = exportCoocurrenceMatrix(flat, step);
        }
    }
    /*console.log("paramètres : ");
    console.log("format : ", format, ", layout : ", layout, ", splitByCatrgory : ", splitByCategory);
    console.log(dataSheets);
    console.log("processing...");*/

    try {
        if (format === "xlsx") {
            const wb = XLSX.utils.book_new();
            Object.entries(dataSheets).forEach(([sheetName, rows]) => {
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
            });
            XLSX.writeFile(wb, filePath);
        } else if (format === "csv") {
            Object.entries(dataSheets).forEach(([sheetName, rows]) => {
                const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
                const filename = splitByCategory ? `${sheetName}.csv` : path.basename(filePath);
                const targetPath = splitByCategory ? path.join(path.dirname(filePath), filename) : filePath;
                fs.writeFileSync(targetPath, csv);
            });
        }
        console.log(`Export terminé : ${filePath}`);
    } catch (err) {
        console.error("Erreur lors de l'export :", err.message);
    }
}





/* EXEMPLE D'APPEL :

exportData(app, {
    filePath: "./export/annotations.xlsx",
    format: "xlsx",         // "xlsx" ou "csv"
    layout: "duration",     // "long" ou "wide" ou "duration" ou "transitions"
    timeFormat: "float",    // "float" ou "hms"
    splitByCategory: true,  // si mis à "true", génère une feuille de calcul (xlsx) ou un fichier (csv) par annotation
    step: 1                 // pas temporel, utile pour les formats "wide" et "transitions"
});

*/