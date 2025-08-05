// // Nécessite `xlsx` : installe avec `npm install xlsx`

// const XLSX = require("xlsx");
// const fs = require("fs");
// const path = require("path");

// const Application = require('../Application');

// const Annotation = require('../Structures/Annotation');
// const AnnotationCategory = require('../Structures/AnnotationCategory');
// const Time = require('../Structures/Time');

// // prétraitement pour faciliter les fonctions suivantes
// function getFlatAnnotations(app) {
//     const annotationItems = app.getAnnotationOrCategory();
//     const flat = [];
//     annotationItems.forEach(item => {
//         if (item instanceof Annotation) {
//             flat.push({
//                 catégorie: "",
//                 nom: item.getName(),
//                 temps: item.getAllTimes(),
//                 estDiscret: item.getIsDiscrete()
//             });
//         } else if (item instanceof AnnotationCategory) {
//             item.getAnnotations().forEach(annotation => {
//                 flat.push({
//                     catégorie: item.getName(),
//                     nom: annotation.getName(),
//                     temps: annotation.getAllTimes(),
//                     estDiscret: annotation.getIsDiscrete()
//                 });
//             });
//         }
//     });
//     return flat;
// }

// // si l'option splitByCategory est à true, cette fonction sépare les annotations par 
// // catégories pour générer les différentes feuilles de calcul/fichiers !
// function splitFlatAnnotations(flatAnnotations) {
//     const split = {};
//     flatAnnotations.forEach(annotation => {
//         const key = annotation.catégorie || "Autonome";
//         if (!split[key]) split[key] = [];
//         split[key].push(annotation);
//     });
//     return split;
// }


// /* ------------------ FONCTIONS FORMATS ------------------ */

// // format "long" -> une ligne de tableur par instance d'annotation
// function exportLongFormat(flatAnnotations, useTimeFormat = "float") {
//     return flatAnnotations.flatMap(({ catégorie, nom, temps, estDiscret }) =>
//         temps.map(time => ({
//             Variable: nom,
//             Catégorie: catégorie,
//             Début: formatTime(time.getStart(), useTimeFormat),
//             Fin: formatTime(time.getEnd(), useTimeFormat),
//             DiscrèteOuContinue: estDiscret ? 'Discrète' : 'Continue'
//         }))
//     );
// }

// // format "wide" -> une colone de tableur par annotation, avec une échelle de temps 
// // sur les colones de gauche.
// function exportWideFormat(flatAnnotations, step = 1, useTimeFormat = "float") {
//     let min = Infinity;
//     let max = -Infinity;
//     flatAnnotations.forEach(({ temps }) => {
//         temps.forEach(time => {
//             min = Math.min(min, time.getStart());
//             max = Math.max(max, time.getEnd());
//         });
//     });

//     const rows = [];
//     for (let tabTime = min; tabTime < max; tabTime += step) {
//         const row = {
//             Début: formatTime(tabTime, useTimeFormat),
//             Fin: formatTime(tabTime + step, useTimeFormat),
//         };
//         flatAnnotations.forEach(({ nom, catégorie, temps, estDiscret }) => {
//             const key = catégorie ? `${catégorie}/${nom}` : nom;
//             row[key] = 0;
//             temps.forEach(annotationTime => {
//                 const start = annotationTime.getStart();
//                 const end = annotationTime.getEnd();
//                 const active = estDiscret ? (start >= tabTime && start < tabTime + step) : !(end <= tabTime || start >= tabTime + step);
//                 if (active) row[key] = 1;
//             });
//         });
//         rows.push(row);
//     }
//     return rows;
// }

// // retourne un tableau du nombre d'instances et de la durée cumulée de chaque annotation.
// function exportCumulativeDuration(flatAnnotations) {
//     const grouped = {};
//     flatAnnotations.forEach(({ catégorie, nom, temps, estDiscret }) => {
//         const key = catégorie || "Autonome";
//         if (!grouped[key]) grouped[key] = [];
//         const count = temps.length;
//         const total = temps.reduce((sum, t) => sum + (t.getEnd() - t.getStart()), 0);
//         const discreteOrContinuous = estDiscret ? 'Discrète' : 'Continue';
//         grouped[key].push({
//             Catégorie: key,
//             Variable: nom,
//             CompteurInstances: count,
//             DuréeTotale: total,
//             DiscrèteOuContinue: discreteOrContinuous
//         });
//     });
//     return grouped;
// }

// // retourne une matrice de transitions
// function exportTransitionMatrix(flatAnnotations, step = 1) {
//     let min = Infinity;
//     let max = -Infinity;

//     flatAnnotations.forEach(({ temps }) => {
//         temps.forEach(t => {
//             min = Math.min(min, t.getStart());
//             max = Math.max(max, t.getEnd());
//         });
//     });

//     const keys = [...new Set(flatAnnotations.map(({ catégorie, nom }) =>
//         catégorie ? `${catégorie}/${nom}` : nom
//     ))];

//     const timelineStart = [];
//     const timelineEnd = [];

//     const instanceCounter = [];
//     keys.forEach(key => {
//         instanceCounter[key] = 0;
//     });
//     for (let t = min; t <= max; t += step) {
//         const activated = new Set();
//         const deactivated = new Set();
//         flatAnnotations.forEach(({ nom, catégorie, temps }) => {
//             const key = catégorie ? `${catégorie}/${nom}` : nom;
//             temps.forEach((time, i) => {
//                 const start = time.getStart();
//                 const end = time.getEnd();
//                 if (t <= start && start < t + step) {
//                     instanceCounter[key]++;
//                     activated.add({key, time : start, counter : instanceCounter[key], index : i});
//                 }
//                 if (t <= end && end < t + step) {
//                     deactivated.add({key, time : end, counter : instanceCounter[key], index : i});
//                 }
//             });
//         });
//         timelineStart.push(activated);
//         timelineEnd.push(deactivated);
//     }

//     const matrix = {};
//     keys.forEach(from => {
//         matrix[from] = Object.fromEntries(keys.map(to => [to, 0]));
//     });

//     for (let i = 1; i < timelineEnd.length; i++) {
//         timelineEnd[i - 1].forEach(({key : fromKey, time : end, index : iFrom}) => {
//             timelineStart[i-1].forEach(({key : toKey, time : start, index : iTo}) => {
//                 if (end <= start&&(fromKey != toKey||(fromKey == toKey&&iFrom != iTo)))
//                 matrix[fromKey][toKey] += 1;
//             });
//             timelineStart[i].forEach(({key : toKey, time : start, index : iTo}) => {
//                 if (end + step > start&&(fromKey != toKey||(fromKey == toKey&&iFrom != iTo)))
//                 matrix[fromKey][toKey] += 1;
//             });
//         });
//     }

//     const result = [];
//     keys.forEach(from => {
//         const row = { De: from };
//         keys.forEach(to => {
//             row[to] = matrix[from][to];
//         });
//         result.push(row);
//     });

//     return { Transitions: result };
// }

// // retourne une matrice de coocurrences
// function exportCoocurrenceMatrix(flatAnnotations, step = 1) {
//     let min = Infinity;
//     let max = -Infinity;

//     flatAnnotations.forEach(({ temps }) => {
//         temps.forEach(t => {
//             min = Math.min(min, t.getStart());
//             max = Math.max(max, t.getEnd());
//         });
//     });

//     const keys = flatAnnotations.map(({ catégorie, nom }) => catégorie ? `${catégorie}/${nom}` : nom);
//     const uniqueKeys = [...new Set(keys)];

//     const matrix = {};
//     uniqueKeys.forEach(a => {
//         matrix[a] = Object.fromEntries(uniqueKeys.map(b => [b, 0]));
//     });

//     for (let t = min; t <= max; t += step) {
//         const active = new Set();

//         flatAnnotations.forEach(({ nom, catégorie, temps }) => {
//             const key = catégorie ? `${catégorie}/${nom}` : nom;
//             temps.forEach(time => {
//                 const s = time.getStart();
//                 const e = time.getEnd();
//                 if (e > t && s < t + step) {
//                     active.add(key);
//                 }
//             });
//         });

//         const activeList = Array.from(active);
//         for (let i = 0; i < activeList.length; i++) {
//             for (let j = 0; j < activeList.length; j++) {
//                 matrix[activeList[i]][activeList[j]] += 1;
//             }
//         }
//     }

//     const result = [];
//     keys.forEach(a => {
//         const row = { Variable: a };
//         keys.forEach(b => {
//             row[b] = matrix[a][b];
//         });
//         result.push(row);
//     });

//     return { Coocurrences: result };
// }

// // sélection du format horaire
// function formatTime(value, format) {
//     if (format === "hms") {
//         const h = String(Math.floor(value / 3600)).padStart(2, '0');
//         const m = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
//         const s = String((value % 60).toFixed(2)).padStart(5, '0');
//         return `${h}:${m}:${s}`;
//     }
//     return value;
// }

// export function exportDataFr(app, options) {
//     const {
//         filePath,
//         format = "xlsx",
//         layout = "wide",
//         timeFormat = "float",
//         splitByCategory = false,
//         step = 0.1
//     } = options;

//     const flat = getFlatAnnotations(app);
//     let dataSheets = {};

//     if (splitByCategory) {
//         const split = splitFlatAnnotations(flat);
//         Object.entries(split).forEach(([cat, subFlat]) => {
//             if (layout === "long") {
//                 dataSheets[cat] = exportLongFormat(subFlat, timeFormat);
//             } else if (layout === "wide") {
//                 dataSheets[cat] = exportWideFormat(subFlat, step, timeFormat);
//             } else if (layout === "duration") {
//                 const durationSheets = exportCumulativeDuration(subFlat);
//                 Object.assign(dataSheets, durationSheets);
//             } else if (layout === "transitions") {
//                 const transitionSheets = exportTransitionMatrix(subFlat, step);
//                 Object.assign(dataSheets, transitionSheets);
//             } else if (layout === "coocurrences") {
//                 const coocurrencesSheets = exportCoocurrenceMatrix(subFlat, step);
//                 Object.assign(dataSheets, coocurrencesSheets);
//             }
//         });
//     } else {
//         if (layout === "long") {
//             dataSheets = { Annotations: exportLongFormat(flat, timeFormat) };
//         } else if (layout === "wide") {
//             dataSheets = { Annotations: exportWideFormat(flat, step, timeFormat) };
//         } else if (layout === "duration") {
//             dataSheets = exportCumulativeDuration(flat);
//         } else if (layout === "transitions") {
//             dataSheets = exportTransitionMatrix(flat, step);
//         } else if (layout === "coocurrences") {
//             dataSheets = exportCoocurrenceMatrix(flat, step);
//         }
//     }

//     try {
//         if (format === "xlsx") {
//             const wb = XLSX.utils.book_new();
//             Object.entries(dataSheets).forEach(([sheetName, rows]) => {
//                 const ws = XLSX.utils.json_to_sheet(rows);
//                 XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
//             });
//             XLSX.writeFile(wb, filePath);
//         } else if (format === "csv") {
//             Object.entries(dataSheets).forEach(([sheetName, rows]) => {
//                 const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
//                 const filename = splitByCategory ? `${sheetName}.csv` : path.basename(filePath);
//                 const targetPath = splitByCategory ? path.join(path.dirname(filePath), filename) : filePath;
//                 fs.writeFileSync(targetPath, csv);
//             });
//         }
//         console.log(`Export terminé : ${filePath}`);
//     } catch (err) {
//         console.error("Erreur lors de l'export :", err.message);
//     }
// }

// module.exports = {
//     exportDataFr
// };

// ExportManagerFr.js (version ESM)

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

import Application from '../Application.js';
import Annotation from '../Structures/Annotation.js';
import AnnotationCategory from '../Structures/AnnotationCategory.js';
import Time from '../Structures/Time.js';

// Utilitaires
function getFlatAnnotations(app) {
    const annotationItems = app.getAnnotationOrCategory();
    const flat = [];
    annotationItems.forEach(item => {
        if (item instanceof Annotation) {
            flat.push({
                catégorie: "",
                nom: item.getName(),
                temps: item.getAllTimes(),
                estDiscret: item.getIsDiscrete()
            });
        } else if (item instanceof AnnotationCategory) {
            item.getAnnotations().forEach(annotation => {
                flat.push({
                    catégorie: item.getName(),
                    nom: annotation.getName(),
                    temps: annotation.getAllTimes(),
                    estDiscret: annotation.getIsDiscrete()
                });
            });
        }
    });
    return flat;
}

function splitFlatAnnotations(flatAnnotations) {
    const split = {};
    flatAnnotations.forEach(annotation => {
        const key = annotation.catégorie || "Autonome";
        if (!split[key]) split[key] = [];
        split[key].push(annotation);
    });
    return split;
}

/* -------- FORMATS -------- */

function exportLongFormat(flatAnnotations, useTimeFormat = "float") {
    return flatAnnotations.flatMap(({ catégorie, nom, temps, estDiscret }) =>
        temps.map(time => ({
            Variable: nom,
            Catégorie: catégorie,
            Début: formatTime(time.getStart(), useTimeFormat),
            Fin: formatTime(time.getEnd(), useTimeFormat),
            DiscrèteOuContinue: estDiscret ? 'Discrète' : 'Continue'
        }))
    );
}

function exportWideFormat(flatAnnotations, step = 1, useTimeFormat = "float") {
    let min = Infinity, max = -Infinity;
    flatAnnotations.forEach(({ temps }) => {
        temps.forEach(time => {
            min = Math.min(min, time.getStart());
            max = Math.max(max, time.getEnd());
        });
    });

    const rows = [];
    for (let tabTime = min; tabTime < max; tabTime += step) {
        const row = {
            Début: formatTime(tabTime, useTimeFormat),
            Fin: formatTime(tabTime + step, useTimeFormat),
        };
        flatAnnotations.forEach(({ nom, catégorie, temps, estDiscret }) => {
            const key = catégorie ? `${catégorie}/${nom}` : nom;
            row[key] = 0;
            temps.forEach(annotationTime => {
                const start = annotationTime.getStart();
                const end = annotationTime.getEnd();
                const active = estDiscret
                    ? (start >= tabTime && start < tabTime + step)
                    : !(end <= tabTime || start >= tabTime + step);
                if (active) row[key] = 1;
            });
        });
        rows.push(row);
    }
    return rows;
}

function exportCumulativeDuration(flatAnnotations) {
    const grouped = {};
    flatAnnotations.forEach(({ catégorie, nom, temps, estDiscret }) => {
        const key = catégorie || "Autonome";
        if (!grouped[key]) grouped[key] = [];
        const count = temps.length;
        const total = temps.reduce((sum, t) => sum + (t.getEnd() - t.getStart()), 0);
        const discreteOrContinuous = estDiscret ? 'Discrète' : 'Continue';
        grouped[key].push({
            Catégorie: key,
            Variable: nom,
            CompteurInstances: count,
            DuréeTotale: total,
            DiscrèteOuContinue: discreteOrContinuous
        });
    });
    return grouped;
}

function exportTransitionMatrix(flatAnnotations, step = 1) {
    let min = Infinity, max = -Infinity;
    flatAnnotations.forEach(({ temps }) => {
        temps.forEach(t => {
            min = Math.min(min, t.getStart());
            max = Math.max(max, t.getEnd());
        });
    });

    const keys = [...new Set(flatAnnotations.map(({ catégorie, nom }) =>
        catégorie ? `${catégorie}/${nom}` : nom
    ))];

    const timelineStart = [], timelineEnd = [], instanceCounter = {};
    keys.forEach(key => instanceCounter[key] = 0);

    for (let t = min; t <= max; t += step) {
        const activated = new Set();
        const deactivated = new Set();

        flatAnnotations.forEach(({ nom, catégorie, temps }) => {
            const key = catégorie ? `${catégorie}/${nom}` : nom;
            temps.forEach((time, i) => {
                const start = time.getStart();
                const end = time.getEnd();
                if (t <= start && start < t + step)
                    activated.add({ key, time: start, counter: ++instanceCounter[key], index: i });
                if (t <= end && end < t + step)
                    deactivated.add({ key, time: end, counter: instanceCounter[key], index: i });
            });
        });

        timelineStart.push(activated);
        timelineEnd.push(deactivated);
    }

    const matrix = {};
    keys.forEach(from => {
        matrix[from] = Object.fromEntries(keys.map(to => [to, 0]));
    });

    for (let i = 1; i < timelineEnd.length; i++) {
        timelineEnd[i - 1].forEach(({ key: fromKey, time: end, index: iFrom }) => {
            timelineStart[i - 1].forEach(({ key: toKey, time: start, index: iTo }) => {
                if (end <= start && (fromKey !== toKey || iFrom !== iTo))
                    matrix[fromKey][toKey] += 1;
            });
            timelineStart[i].forEach(({ key: toKey, time: start, index: iTo }) => {
                if (end + step > start && (fromKey !== toKey || iFrom !== iTo))
                    matrix[fromKey][toKey] += 1;
            });
        });
    }

    return {
        Transitions: keys.map(from => ({
            De: from,
            ...Object.fromEntries(keys.map(to => [to, matrix[from][to]]))
        }))
    };
}

function exportCoocurrenceMatrix(flatAnnotations, step = 1) {
    let min = Infinity, max = -Infinity;

    flatAnnotations.forEach(({ temps }) => {
        temps.forEach(t => {
            min = Math.min(min, t.getStart());
            max = Math.max(max, t.getEnd());
        });
    });

    const keys = flatAnnotations.map(({ catégorie, nom }) => catégorie ? `${catégorie}/${nom}` : nom);
    const uniqueKeys = [...new Set(keys)];

    const matrix = {};
    uniqueKeys.forEach(a => {
        matrix[a] = Object.fromEntries(uniqueKeys.map(b => [b, 0]));
    });

    for (let t = min; t <= max; t += step) {
        const active = new Set();
        flatAnnotations.forEach(({ nom, catégorie, temps }) => {
            const key = catégorie ? `${catégorie}/${nom}` : nom;
            temps.forEach(time => {
                const s = time.getStart(), e = time.getEnd();
                if (e > t && s < t + step) active.add(key);
            });
        });

        const list = [...active];
        for (let i = 0; i < list.length; i++) {
            for (let j = 0; j < list.length; j++) {
                matrix[list[i]][list[j]] += 1;
            }
        }
    }

    return {
        Coocurrences: uniqueKeys.map(a => ({
            Variable: a,
            ...Object.fromEntries(uniqueKeys.map(b => [b, matrix[a][b]]))
        }))
    };
}

function formatTime(value, format) {
    if (format === "hms") {
        const h = String(Math.floor(value / 3600)).padStart(2, '0');
        const m = String(Math.floor((value % 3600) / 60)).padStart(2, '0');
        const s = String((value % 60).toFixed(2)).padStart(5, '0');
        return `${h}:${m}:${s}`;
    }
    return value;
}

// FONCTION EXPORT PRINCIPALE
// export function exportDataFr(app, options) {
//     const {
//         filePath,
//         format = "xlsx",
//         layout = "wide",
//         timeFormat = "float",
//         splitByCategory = false,
//         step = 0.1
//     } = options;

//     const flat = getFlatAnnotations(app);
//     let dataSheets = {};

//     if (splitByCategory) {
//         const split = splitFlatAnnotations(flat);
//         for (const [cat, subFlat] of Object.entries(split)) {
//             if (layout === "long") {
//                 dataSheets[cat] = exportLongFormat(subFlat, timeFormat);
//             } else if (layout === "wide") {
//                 dataSheets[cat] = exportWideFormat(subFlat, step, timeFormat);
//             } else if (layout === "duration") {
//                 Object.assign(dataSheets, exportCumulativeDuration(subFlat));
//             } else if (layout === "transitions") {
//                 Object.assign(dataSheets, exportTransitionMatrix(subFlat, step));
//             } else if (layout === "coocurrences") {
//                 Object.assign(dataSheets, exportCoocurrenceMatrix(subFlat, step));
//             }
//         }
//     } else {
//         if (layout === "long") {
//             dataSheets = { Annotations: exportLongFormat(flat, timeFormat) };
//         } else if (layout === "wide") {
//             dataSheets = { Annotations: exportWideFormat(flat, step, timeFormat) };
//         } else if (layout === "duration") {
//             dataSheets = exportCumulativeDuration(flat);
//         } else if (layout === "transitions") {
//             dataSheets = exportTransitionMatrix(flat, step);
//         } else if (layout === "coocurrences") {
//             dataSheets = exportCoocurrenceMatrix(flat, step);
//         }
//     }

//     try {
//         if (format === "xlsx") {
//             const wb = XLSX.utils.book_new();
//             for (const [sheetName, rows] of Object.entries(dataSheets)) {
//                 const ws = XLSX.utils.json_to_sheet(rows);
//                 XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
//             }
//             XLSX.writeFile(wb, filePath);
//         } else if (format === "csv") {
//             for (const [sheetName, rows] of Object.entries(dataSheets)) {
//                 const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
//                 const filename = splitByCategory ? `${sheetName}.csv` : path.basename(filePath);
//                 const targetPath = splitByCategory ? path.join(path.dirname(filePath), filename) : filePath;
//                 fs.writeFileSync(targetPath, csv);
//             }
//         }
//         console.log(`Export terminé : ${filePath}`);
//     } catch (err) {
//         console.error("Erreur lors de l'export :", err.message);
//     }
// }
export function exportDataFr(app, options) {
    const {
        filePath,
        format = "xlsx",
        layout = "wide",
        timeFormat = "float",
        splitByCategory = false,
        step = 0.1
    } = options;

    const flat = getFlatAnnotations(app);
    let dataSheets = {};

    if (splitByCategory) {
        const split = splitFlatAnnotations(flat);
        for (const [cat, subFlat] of Object.entries(split)) {
            if (layout === "long") {
                dataSheets[cat] = exportLongFormat(subFlat, timeFormat);
            } else if (layout === "wide") {
                dataSheets[cat] = exportWideFormat(subFlat, step, timeFormat);
            } else if (layout === "duration") {
                Object.assign(dataSheets, exportCumulativeDuration(subFlat));
            } else if (layout === "transitions") {
                Object.assign(dataSheets, exportTransitionMatrix(subFlat, step));
            } else if (layout === "coocurrences") {
                Object.assign(dataSheets, exportCoocurrenceMatrix(subFlat, step));
            }
        }
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

    try {
        if (format === "xlsx") {
            const wb = XLSX.utils.book_new();
            for (const [sheetName, rows] of Object.entries(dataSheets)) {
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
            }

            if (typeof window !== "undefined") {
                const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                const blob = new Blob([wbout], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filePath.endsWith(".xlsx") ? filePath : filePath + ".xlsx";
                a.click();
                URL.revokeObjectURL(url);
            } else {
                XLSX.writeFile(wb, filePath);
            }
        } else if (format === "csv") {
            for (const [sheetName, rows] of Object.entries(dataSheets)) {
                const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
                const filename = splitByCategory ? `${sheetName}.csv` : (filePath.endsWith('.csv') ? filePath : `${filePath}.csv`);

                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        }

        console.log(`Export terminé : ${filePath}`);
    } catch (err) {
        console.error("Erreur lors de l'export :", err.message);
    }
}