//structures
import Time from './Structures/Time.js';
import Annotation from './Structures/Annotation.js';
import AnnotationCategory from './Structures/AnnotationCategory.js';

//history
import HistoryManager from './History/HistoryManager.js';

class Application {

    constructor() {
        this.annotationItems = [];
        this.history = new HistoryManager();
        this._listeners = new Set();
    }

    subscribe(callback) {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    _notify() {
        for (const listener of this._listeners) {
            listener();
        }
    }



    /* ------------------ PRIVATE ------------------ */

    _makeUniqueName(baseName) {
        const existing = this.annotationItems.map(cat => cat.name);

        if (!existing.includes(baseName)) return baseName;

        let i = 1;
        let newName;
        do {
            newName = `${baseName}(${i})`;
            i++;
        } while (existing.includes(newName));

        return newName;
    }

    _deactivateAnnotations(key, exceptAnnotation) {
        for (const item of this.annotationItems) {
            if (item instanceof Annotation) {
                if (item.key === key && item !== exceptAnnotation) {
                    item.setIsActive(false);
                }
            } else if (item instanceof AnnotationCategory) {
                for (const ann of item.getAnnotations()) {
                    if (ann.key === key && ann !== exceptAnnotation) {
                        ann.setIsActive(false);
                    }
                }
            }
        }
    }


    /* ------------------ ADD ------------------ */

    addCategory(name) {
        if (typeof name !== 'string') {
            throw new TypeError("Name must be string.");
        }

        const uniqueName = this._makeUniqueName(name);
        const category = new AnnotationCategory(uniqueName, true, this.history, this);
        
        const apply = () => {
            this.annotationItems.push(category);
        };

        const revert = () => {
            const index = this.annotationItems.indexOf(category);
            if (index !== -1) {
                this.annotationItems.splice(index, 1);
            }
        };

        apply();
        this._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }

        return category;
    }

    addAnnotation(name, color, key, isDiscrete) {
        if (typeof name !== 'string') {
            throw new TypeError("Name must be string.");
        }

        if (typeof key !== 'string' || key.length != 1) {
            throw new TypeError("The key must be a caracter.");
        }

        if (typeof isDiscrete !== 'boolean') {
            throw new TypeError("isDiscrete must be boolean.");
        }

        const uniqueName = this._makeUniqueName(name);
        const annotation = new Annotation(uniqueName, color, key, isDiscrete, true, this.history, this);
        
        const apply = () => {
            this.annotationItems.push(annotation);
        };

        const revert = () => {
            const index = this.annotationItems.indexOf(annotation);
            if (index !== -1) {
                this.annotationItems.splice(index, 1);
            }
        };

        apply();
        this._notify();
        if (this.history) {
            this.history.do(apply, revert);
        }

        return annotation;
    }

    addAnnotationOrCategory(item) {
        if (item instanceof AnnotationCategory || item instanceof Annotation) {
            const uniqueName = this._makeUniqueName(item.name);
            item.name = uniqueName;
            item.setHistory(this.history);
            item.setApp(this);
                
            const apply = () => {
                this.annotationItems.push(item);
            };

            const revert = () => {
                const index = this.annotationItems.indexOf(item);
                if (index !== -1) {
                    this.annotationItems.splice(index, 1);
                }
            };

            apply();
            this._notify();
            if (this.history) {
                this.history.do(apply, revert);
            }

            return item;
        } else {
            throw new TypeError("Item must be an instance of Annotation or AnnotationCategory.");
        }
    }


    /* ------------------ GETTERS ------------------ */

    getAnnotationOrCategory() {
        return this.annotationItems;
    }

    getOnlyCategories() {
        return this.annotationItems.filter(obj => obj instanceof AnnotationCategory);
    }

    getOnlyAnnotations() {
        return this.annotationItems.filter(obj => obj instanceof Annotation);
    }

    getCategoryByName(name) {
        return this.annotationItems.find(cat => cat.name === name);
    }

    getCategoryIndexByName(name) {
        return this.annotationItems.findIndex(cat => cat.name === name);
    }

    getAnnotationByPath(path) {
        const parts = path.split('/');
        if (parts.length === 1) {
            // Cherche parmi les annotations directes
            return this.getOnlyAnnotations().find(a => a.name === parts[0]) || null;
        } else if (parts.length === 2) {
            const [categoryName, annotationName] = parts;
            const category = this.getCategoryByName(categoryName);
            if (category) {
                return category.annotations.find(a => a.name === annotationName) || null;
            }
        }
        return null; // format invalide ou introuvable
    }

    getAnnotationByKey(key) {
        if (typeof key !== 'string' || key.length !== 1) {
            throw new TypeError("Key must be a single character string.");
        }

        for (const item of this.annotationItems) {
            if (item instanceof Annotation) {
                if (item.key === key && item.isActive) {
                    return item;
                }
            } else if (item instanceof AnnotationCategory) {
                for (const ann of item.getAnnotations()) {
                    if (ann.key === key && ann.isActive) {
                        return ann;
                    }
                }
            }
        }

        return null;
    }



    /* ------------------ REMOVE ------------------ */

    removeAnnotationByKey(key) {
        const removed = this.getAnnotationByKey(key);
        const index = this.annotationItems.indexOf(removed);
        console.log("Index of removed annotation:", index);

            const apply = () => {
                this.annotationItems.splice(index, 1);
            };

            const revert = () => {
                this.annotationItems.splice(index, 0, removed);
            };

        apply();
        this._notify();
        if (this.history) {
            this.history.do(apply, revert);
        }
        return true;
    }


    removeAnnotationOrCategoryByIndex(index) {
        if (index >= 0 && index < this.annotationItems.length) {
            const removed = this.annotationItems[index];

            const apply = () => {
                this.annotationItems.splice(index, 1);
            };

            const revert = () => {
                this.annotationItems.splice(index, 0, removed);
            };

            apply();
            this._notify();
            if (this.history) {
                this.history.do(apply, revert);
            }
            return true;
        }
        return false;
    }

    removeAnnotationOrCategoryByName(name) {
        const index = this.getCategoryIndexByName(name);
        this.removeAnnotationOrCategoryByIndex(index);
    }


    /* ------------------ UTILITY ------------------ */

    clearAllItems() {
        const oldItems = this.annotationItems;

        const apply = () => {
            this.annotationItems = [];
        };

        const revert = () => {
            this.annotationItems = oldItems;
        };

        apply();
        this._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }


    /* ------------------ UTILITY ------------------ */

    undo() {
        this.history.undo();
    }

    redo() {
        this.history.redo();
    }

    canUndo() {
        return this.history.canUndo();
    }

    canRedo() {
        return this.history.canRedo();
    }

    /* ------------------ SERIALIZATION ------------------ */

    serialize() {
        return {
            annotationItems: this.annotationItems.map(obj => obj.serialize()),
        };
    }

    deserialize(jsonString) {
        const data = JSON.parse(jsonString);
        this.annotationItems = data.annotationItems.map(obj => {
            if (obj.type === "category") {
                return AnnotationCategory.deserialize(obj, this.history, this);
            } else if (obj.type === "annotation") {
                return Annotation.deserialize(obj, this.history, this);
            }
            return null;
        }).filter(Boolean);
        this._notify();
    }

    // Ajout d'une méthode pour récupérer toutes les annotations (qu'elles soient groupées ou non) (Ines)

    getAllAnnotations() {
        const annotations = [];

        for (const item of this.annotationItems) {
            if (item instanceof Annotation) {
                annotations.push(item);
            } else if (item instanceof AnnotationCategory) {
                annotations.push(...item.getAnnotations());
            }
        }

        return annotations;
    }


}

export default Application;