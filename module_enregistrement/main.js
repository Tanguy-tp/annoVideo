console.log('main process working');

const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require("path");
const url = require("url");

/* Module dédié */
const Application = require('./model/Application')
//structures
const Time = require('./model/Structures/Time');
const Annotation = require('./model/Structures/Annotation');
const AnnotationCategory = require('./model/Structures/AnnotationCategory');
//History
const HistoryManager = require('./model/History/HistoryManager')
//save&export
const StateManager = require('./model/Save&export/StateManager'); 


let win;

function createWindow() {
    win = new BrowserWindow();
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));

    win.webContents.openDevTools();

    win.on('closed', () => {
        win = null;
    })
}

// Fonction utilitaire d'affichage des tests
function logTest(label, result) {
  console.log(`\n----- ${label} -----`);
  console.log(result);
}

// Fonction d'assertion simple pour le test
function assert(condition, message) {
  if (!condition) {
    throw new Error("Assertion échouée: " + message);
  }
}

// ==============================
// Test Global : Application & Historique
// ==============================
function testIntegrationModule() {
  console.log("=== Début du test intégral du module ===");

  // Création de l'application avec historique (HistoryManager est géré par Application)
  const app = new Application();
  logTest("Application initialisée", app);

  // ------------------------------
  // 1. Test des ajouts et de l'unicité des noms
  // ------------------------------

  // Ajout d'une catégorie
  const catA = app.addCategory("Catégorie A");
  assert(app.annotationItems.length === 1, "La catégorie doit être ajoutée à l'application.");
  logTest("Catégorie ajoutée", catA.serialize());

  // Ajout d'une annotation autonome
  const annAutonome = app.addAnnotation("Annotation 2", "#00FF00", "b", true);
  assert(app.annotationItems.length === 2, "L'annotation autonome doit être ajoutée à l'application.");
  logTest("Annotation autonome ajoutée", annAutonome.serialize());

  // Ajout d'une annotation à la catégorie via addAnnotationByParams
  const annCat = catA.addAnnotationByParams("Annotation 1", "#FF0000", "a", false);
  assert(catA.annotations.length === 1, "L'annotation dans la catégorie doit être ajoutée.");
  logTest("Annotation dans catégorie ajoutée", annCat.serialize());

  // Test de l'unicité du nom : création d'une autre catégorie avec le même nom.
  const catA2 = app.addCategory("Catégorie A");
  assert(catA2.name !== "Catégorie A", "Le nom devrait être rendu unique automatiquement.");
  logTest("Catégorie avec nom identique (uniqueName)", catA2.serialize());

  // ------------------------------
  // 2. Test des méthodes sur Annotation
  // ------------------------------

  // Création d'une annotation pour tester les méthodes
  const ann = new Annotation("Test Annotation", "#123456", "c", false);
  app.addAnnotationOrCategory(ann);
  // Ajout de plusieurs Time à l'annotation
  ann.addTime(1.0, 2.0);
  ann.addTime(3.0, 4.0);
  assert(ann.getTimeCount() === 2, "L'annotation doit contenir 2 time instances.");
  logTest("Annotation avec Time", ann.serialize());

  // Modification des propriétés avec historique
  ann.setColor("#654321");
  ann.setName("Test Annotation Modifiée");
  ann.setKey("d");
  // Passage d'annotation en inactif puis actif (pour tester setIsActive & undo)
  ann.setIsActive(false);
  assert(ann.getIsActive() === false, "L'annotation doit être inactive.");
  ann.setIsActive(true);
  assert(ann.getIsActive() === true, "L'annotation doit redevenir active.");
  logTest("Annotation modifiée", ann.serialize());

  // Test slideTimes et switchDiscrete
  const oldTimes = ann.getAllTimes().map(t => t.start);
  ann.slideTimes(1.0); // décale tous les times de +1
  const newTimes = ann.getAllTimes().map(t => t.start);
  newTimes.forEach((val, index) => {
    assert(val === oldTimes[index] + 1.0, "Les temps doivent être décalés correctement.");
  });
  // Basculer entre mode discret et continu
  const modeAfterSwitch = ann.switchDiscrete();
  logTest("Après switchDiscrete", { isDiscrete: modeAfterSwitch });
  // (On ne fait pas d'assert ici si le comportement dépend de la logique interne)

  // ------------------------------
  // 3. Test des méthodes sur Time
  // ------------------------------
  // Créer un Time et tester ses setters / getters
  const timeInst = new Time(10.0, 12.0, false);
  timeInst.setStart(11.0);
  assert(timeInst.getStart() === 11.0, "Le début doit être modifié.");
  timeInst.setEnd(13.0);
  assert(timeInst.getEnd() === 13.0, "La fin doit être modifiée.");
  const duration = timeInst.duration();
  assert(duration === 2.0, "La durée doit être 2.");
  logTest("Time modifié", timeInst.serialize());
  
  // Test slide (avec historique)
  timeInst.slide(15.0);
  assert(timeInst.getStart() === 15.0, "Le slide doit décaler le début correctement.");
  // Slide sans historique
  timeInst.slideWithoutHistory(20.0);
  assert(timeInst.getStart() === 20.0, "Le slide sans historique doit fonctionner correctement.");

  // ------------------------------
  // 4. Test de l'historique (Undo/Redo successifs)
  // ------------------------------
  // Supposons que chaque modification (setColor, setName, etc.) a été enregistrée
  // On effectue plusieurs actions puis on annule tout
  console.log("\n--- État avant test historique ---");
  logTest("Annotation", ann.serialize());
  const initialColor = ann.getColor();
  app.history.clear();
  ann.setColor("#AAAAAA");
  ann.setKey("e");
  ann.setName("Annotation UNDO Test");

  console.log("\n--- État avant UNDO ---");
  logTest("Annotation", ann.serialize());
  
  // Effectuer plusieurs undo successifs
  while (app.canUndo()) {
    app.undo();
  }
  console.log("\n--- État après UNDO complet ---");
  logTest("Annotation", ann.serialize());
  // Vérifier que les propriétés sont revenues à leur état d'avant les modifications
  assert(ann.getColor() === initialColor, "La couleur doit être revenue à l'état initial.");

  // Refait toutes les actions avec redo successifs
  while (app.canRedo()) {
    app.redo();
  }
  console.log("\n--- État après REDO complet ---");
  logTest("Annotation", ann.serialize());

  // ------------------------------
  // 5. Test de suppression
  // ------------------------------
  // Suppression d'une annotation dans une catégorie
  //console.log("catA : \n", catA.serialize());
  const initialCountCat = catA.getAnnotationCount();
  catA.removeAnnotationByName("Annotation 1"); // Suppression par nom
  assert(catA.getAnnotationCount() === initialCountCat - 1, "L'annotation doit être supprimée de la catégorie.");
  // Suppression d'une annotation autonome par index
  const initialCountApp = app.annotationItems.length;
  app.removeAnnotationOrCategoryByIndex(app.annotationItems.indexOf(annAutonome));
  assert(app.annotationItems.length === initialCountApp - 1, "L'annotation autonome doit être supprimée.");
  logTest("Application après suppressions", app.serialize());

  // ------------------------------
  // 6. Test de clearAllItems
  // ------------------------------
  app.clearAllItems();
  assert(app.annotationItems.length === 0, "Toutes les annotations et catégories doivent être supprimées.");
  logTest("Application après clearAllItems", app.serialize());

  // ------------------------------
  // 7. Test de sérialisation / désérialisation et sauvegarde / chargement
  // ------------------------------
  // Reconstruction d'un état avec plusieurs éléments
  const catB = app.addCategory("Catégorie B");
  const annB = catB.addAnnotationByParams("Annotation B", "#112233", "f", false);
  annB.addTime(5, 6);
  annB.addTime(7, 8);
  // Sérialisation
  const serializedState = app.serialize();
  const jsonString = JSON.stringify(serializedState, null, 2);
  logTest("État sérialisé", jsonString);
  
  // Sauvegarde via StateManager (écrit dans un fichier)
  const filePath = "./test_app.json";
  StateManager.save(app, filePath);
  console.log("\nÉtat sauvegardé dans le fichier :", filePath);
  
  // Chargement via StateManager
  const loadedApp = StateManager.load(filePath);
  const loadedState = loadedApp.serialize();
  const jsonLoaded = JSON.stringify(loadedState, null, 2);
  logTest("État chargé", jsonLoaded);
  
  // Comparer les deux états (ici on fait une comparaison simple)
  assert(jsonString === jsonLoaded, "L'état chargé doit correspondre à l'état sauvegardé.");
  
  console.log("\n[ZZCC GOOD] Tous les tests d'intégration ont été passés avec succès !");


}


function main() {
    /*createWindow();*/
    /* //Time tests
    let h = new HistoryManager();
    let t = new Time(3.5, 1.2, false, h);
    console.log(t.toString());
    console.log("duration : "+t.duration());
    console.log("\n");
    t.setStart(3.2);
    console.log("done")
    console.log(t.toString());
    console.log("\n");
    h.undo();
    console.log("undone")
    console.log(t.toString());
    console.log("\n");
    h.redo();
    console.log("redone")
    console.log(t.toString());
    console.log("\n");
    t.switchDiscrete();
    console.log(t.toString());
    console.log("duration : "+t.duration());
    console.log("\n");
    t.switchDiscrete();
    console.log(t.toString());
    console.log("duration : "+t.duration());
    console.log("\n");
    console.log(h);
    //*/
    
    /* //Annotation tests
    let a = new Annotation("name", [255,255,255], "blorp", false);
    a.addTime(2);
    a.addTime(2.3, 5.6);
    console.log(a);*/
    
    /* //Array tests
    let fruits = ["Banana", "Orange", "Apple", "Mango"];
    fruits.push("zzcc");
    fruits.push("quoi ?");
    //console.log(fruits.pop());
    //console.log(fruits.pop());
    //console.log(fruits.pop());
    console.log(fruits);
    fruits.forEach((fruits, index) => {
        console.log(fruits);
        console.log(index);
    });//*/

    /* //AnnotationCategory tests
    // category = new AnnotationCategory("Mouvements", "#FFA500"); // orange

    // Ajout d'annotations avec noms en doublon
    category.addAnnotationByParams("saut", "#FF0000", "S", true);   // saut
    category.addAnnotationByParams("saut", "#00FF00", "A", false);  // saut(1)
    category.addAnnotationByParams("saut", "#0000FF", "U", true);   // saut(2)

    // Ajout direct d'une instance d'Annotation
    const ann = new Annotation("saut", "#FFFFFF", "T", false);      // saut(3)
    category.addAnnotation(ann);

    // Affichage des noms
    console.log("Annotations dans la catégorie :", category.getName());
    category.getAnnotations().forEach((annotation, index) => {
        console.log(`  [${index}] ${annotation.name} (${annotation.color}, key: ${annotation.key})`);
    });*/

    /* //Serialization test
    // Création de l'application
    const app = new Application();
    global.sharedApp = app;

    // 🔹 Ajout d'une catégorie avec plusieurs annotations
    const cat = app.addCategory("Mouvements", "#FF0000");
    const ann1 = cat.addAnnotationByParams("Saut", "#FFA500", "S", true);
    ann1.addTime(5.0);
    ann1.addTime(10.0);
    const ann2 = cat.addAnnotationByParams("Course", "#00FF00", "C", false);
    ann2.addTime(3.0, 7.0);
    ann2.addTime(12.0, 15.5);

    // 🔹 Ajout d'une annotation "globale" directement dans l'application
    const globalAnn1 = app.addAnnotation("Coup de feu", "#0000FF", "F", true);
    globalAnn1.addTime(1.0);
    globalAnn1.addTime(2.5);

    const globalAnn2 = app.addAnnotation("Explosion", "#9900FF", "E", false);
    globalAnn2.addTime(6.0, 9.0);

    // 🔹 Ajout d’un objet par `addAnnotationOrCategory`
    const annOr = new Annotation("Repère", "#00AAAA", "R", true);
    annOr.addTime(20.0);
    app.addAnnotationOrCategory(annOr);

    // 🔹 Test spécial : annotation dont le nom entre en collision (sera renommée automatiquement)
    app.addAnnotation("Saut", "#999999", "Z", true);  // Devrait devenir "Saut(1)"

    // Affichage de l'application originale
    console.log("\n--- Application originale ---\n");
    console.log(app);

    // Sauvegarde avec StateManager
    filePath = path.join(__dirname, 'oui.json');
    StateManager.save(app, filePath);

    // Rechargement
    const loadedApp = StateManager.load(filePath);

    // Affichage du contenu après rechargement
    console.log("\n--- Données rechargées ---\n");
    console.log(loadedApp); // */

    /* // Test général n°1
    // === INITIALISATION DE L’APPLICATION ===
    const app = new Application();

    // === AJOUT D’UNE CATÉGORIE ===
    const cat = app.addCategory("Catégorie A");

    // === AJOUT D’UNE ANNOTATION À LA CATÉGORIE ===
    const ann1 = cat.addAnnotationByParams("Annotation 1", "#FF0000", "a", true);

    // === AJOUT D’UNE ANNOTATION AUTONOME ===
    const ann2 = app.addAnnotation("Annotation 2", "#00FF00", "b", true);

    // === AJOUT DE TEMPS À CHAQUE ANNOTATION ===
    ann1.addTime(1.0);                 // Discret
    ann1.addTime(2.0);                 // Discret
    ann2.addTime(3.0, 5.0);           // Continu
    ann2.addTime(6.0, 7.0);           // Continu

    //console.log("ann1.times : ", app.getAnnotationByKey("a").getAllTimes());
    //console.log("ann2.times : ", app.getAnnotationByKey("b").getAllTimes());

    // === MODIFICATION DE PROPRIÉTÉS ===
    ann1.setColor("#FF00FF");
    ann2.setIsActive(false);

    // === TEST HISTORIQUE (UNDO / REDO) ===
    console.log("Undo possible ?", app.canUndo());
    app.undo();
    app.undo();
    console.log("Apres undo :", ann1.getColor(),"\nisActive : ", ann2.getIsActive());
    app.redo();
    app.redo();
    console.log("Apres redo :", ann1.getColor(),"\nisActive : ", ann2.getIsActive());

    // === TEST SLIDE + SWITCH DISCRET/CONTINU ===
    ann1.slideTimes(1.0);                  // Tous les start de ann1 += 1
    ann1.switchDiscrete();                // Devient continu
    ann1.getAllTimes()[0].setEnd(2.0);    // Ajout d’un end au premier Time

    // === TEST SUPPRESSION ===
    //ann1.removeTimeByStart(2.0);          // Supprime un Time approx.
    //app.removeAnnotationOrCategoryByName("Annotation 2");

    // === TEST SÉRIALISATION ===
    console.log("Catégories dans app :", app.annotationItems);
    const serialized = app.serialize();
    console.log("Serialise :", serialized);

    // === TEST SAUVEGARDE ===
    const path = "./test_save.json";
    StateManager.save(app, path);
    console.log("Etat sauvegarde.");

    // === TEST CHARGEMENT ===
    const loadedApp = StateManager.load(path);
    console.log("Charge :", loadedApp.serialize());

    // === ASSERTIONS SIMPLIFIÉES ===
    //console.assert(loadedApp.getOnlyCategories().length === 1, "[FLOP] Categorie non chargee");
    //console.assert(loadedApp.getOnlyAnnotations().length === 0, "[FLOP] Annotations autonomes devraient etre supprimees");
    console.assert(loadedApp.getOnlyCategories()[0].getAnnotationCount() === 1, "[FLOP] Annotation manquante dans la categorie");

    console.log("[ZZCC REUSSITE] Tous les tests de base sont passes."); //*/

    /* // Test général n°2
    // Lancer le test complet
    try {
        testIntegrationModule();
    } catch (error) {
        console.error("[FLOP] Erreur lors des tests :", error);
    } //*/

}

app.on('ready', main);

