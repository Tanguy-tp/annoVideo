import Annotation from './Annotation.js';

class AnnotationCategory {

    constructor(name, isActive = true, history = null, app = null) {
        if (typeof name !== 'string') {
            throw new TypeError("AnnotationCategory name must be a string.");
        }
        //front-end
        this.name = name;
        //this.color = color;
        this.annotations = [];
        this.isActive = isActive;

        //back-end
        this.history = history;
        this.isActiveHistory = new Array();
        this.app = app;
    }

    /* ------------------ SETTERS ------------------ */

    setName(newName) {
        if (typeof newName !== 'string') {
            throw new TypeError("AnnotationCategory name must be a string.");
        }

        uniqueName = newName;
        if(this.app != null) {
            uniqueName = this.app._makeUniqueName(uniqueName);
        }

        const oldName = this.name;

        const apply = () => this.name = uniqueName;
        const revert = () => this.name = oldName;

        apply();
        if (this.app) this.app._notify();


        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    /*setColor(newColor) {
        this.color = newColor;
    }*/

    setIsActive(newIsActive) {
        
        const oldIsActive = this.isActive;
        this._setIsActiveInternal(newIsActive);
        const localIsActiveHistory = [...this.isActiveHistory];
        
        const apply = () => {
            this.isActiveHistory = localIsActiveHistory;
            this._setIsActiveInternal(newIsActive);
        };
        const revert = () => {
            this.isActiveHistory = localIsActiveHistory;
            this._setIsActiveInternal(oldIsActive);
        }
        if (this.history) {
            this.history.do(apply, revert);
        }
        if (this.app) this.app._notify();

    }
    
    _setIsActiveInternal(newIsActive) {
        const hasChanged = newIsActive != this.isActive;
        this.isActive = newIsActive;
        
        if(!this.isActive&&hasChanged) {
            this.annotations.forEach((annotation, index) => {
                this.isActiveHistory[index] = annotation.getIsActive();
                annotation.setIsActive(false);
            });
        }
        else if (this.isActive&&hasChanged) {
            this.annotations.forEach((annotation, index) => {
                annotation.setIsActive(this.isActiveHistory[index]);
            });
        }
    }

    /* Back-end Setters - semi-private */
    setHistory(newHistory) {
        this.history = newHistory;
        this.annotations.forEach(annotation => annotation.setHistory(newHistory));
    }

    setApp(app) {
        this.app =app;
        this.annotations.forEach(annotation => annotation.setHistory(app));
    }
    /* */


    /* ------------------ ADD ------------------ */

    addAnnotation(annotation) {
        if (!(annotation instanceof Annotation)) {
            throw new Error("addAnnotation: argument must be an instance of Annotation.");
        }

        annotation.name = this._makeUniqueName(annotation.name); //checking wether the name is unique and if not making it unique
        annotation.setIsActive(this.isActive);

        annotation.setHistory(this.history);
        annotation.times.forEach(time => {
            time.setHistory(this.history);
        });
        annotation.setApp(this.app);

        const apply = () => {
            this.annotations.push(annotation);
            this.isActiveHistory.push(this.isActive);
        };

        const revert = () => {
            const index = this.annotations.indexOf(annotation);
            if (index !== -1) {
                this.annotations.splice(index, 1);
                this.isActiveHistory.splice(index, 1);
            }
        };

        apply();
        if (this.app) this.app._notify();


        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    addAnnotationByParams(name, color, key, isDiscrete) {
        if (typeof name !== 'string') {
            throw new TypeError("AnnotationCategory name must be a string.");
        }

        const uniqueName = this._makeUniqueName(name);

        const annotation = new Annotation(uniqueName, color, key, isDiscrete, this.isActive, this.history, this.app);
        
        const apply = () => {
            this.annotations.push(annotation);
            this.isActiveHistory.push(this.isActive);
        };

        const revert = () => {
            const index = this.annotations.indexOf(annotation);
            if (index !== -1) {
                this.annotations.splice(index, 1);
                this.isActiveHistory.splice(index, 1);
            }
        };

        apply();
        if (this.app) this.app._notify();


        if (this.history) {
            this.history.do(apply, revert);
        }

        return annotation;
    }


    /* ------------------ REMOVE ------------------ */

    removeAnnotationByIndex(index) {
        if (index >= 0 && index < this.annotations.length) {
            const removed = this.annotations[index];

            const apply = () => {
                this.annotations.splice(index, 1);
                this.isActiveHistory.splice(index, 1);
            };

            const revert = () => {
                this.annotations.splice(index, 0, removed);
                this.isActiveHistory.splice(index, 0, removed.getIsActive());
            };

            apply();
            if (this.app) this.app._notify();

            if (this.history) {
                this.history.do(apply, revert);
            }

            return true;
        }
        return false;
    }

    removeAnnotationByName(name) {
        if (typeof name !== 'string') return false;

        const index = this.annotations.findIndex(a => a.name === name);
        return this.removeAnnotationByIndex(index);
    }

    clearAnnotations() {
        const oldAnnotations = this.annotations;
        const oldIsActiveHistory = this.isActiveHistory;

        const apply = () => {
            this.annotations = [];
            this.isActiveHistory = [];
        };

        const revert = () => {
            this.annotations = oldAnnotations;
            this.isActiveHistory = oldIsActiveHistory;
        };

        apply();
        if (this.app) this.app._notify();


        if (this.history) {
            this.history.do(apply, revert);
        }
    }


    /* ------------------ GETTERS ------------------ */

    getName() {
        return this.name;
    }

    /*getColor() {
        return this.color;
    }*/

    getIsActive() {
        return this.isActive;
    }

    getAnnotations() {
        return this.annotations;
    }

    getAnnotation(index) {
        return this.annotations[index];
    }

    getAnnotationByName(name) {
        if (typeof name !== 'string') return undefined;
        return this.annotations.find(a => a.name === name);
    }

    getAnnotationCount() {
        return this.annotations.length;
    }


    /* ------------------ AUTRES MÉTHODES ------------------ */

    toString() {
        return `Category "${this.name}" [${this.color}] - ${this.annotations.length} annotation(s)\n` +
               this.annotations.map((a, i) => `  [${i}] ${a.toString()}`).join('\n');
    }

    clone() {
        const copy = new AnnotationCategory(this.name, this.color);
        this.annotations.forEach(a => copy.addAnnotation(a.clone()));
        return copy;
    }


    /* ------------------ PRIVATE METHODS ------------------ */

    _makeUniqueName(baseName) {
        const existing = this.annotations.map(a => a.name);

        if (!existing.includes(baseName)) return baseName;

        let i = 1;
        let newName;
        do {
            newName = `${baseName}(${i})`;
            i++;
        } while (existing.includes(newName));

        return newName;
    }


    /* ------------------ SERIALIZATION ------------------ */

    /* Convertit cette catégorie en un objet JSON sérialisable. */
    serialize() {
        return {
            type: "category",
            name: this.name,
            //color: this.color,
            isActive: this.isActive,
            annotations: this.annotations.map(a => a.serialize())
        };
    }

    /* Reconstruit une catégorie depuis un objet JSON. */
    static deserialize(data, history = null, app = null) {
        const category = new AnnotationCategory(data.name, data.isActive, history, app);
        category.annotations = data.annotations.map(a => Annotation.deserialize(a, history));
        category.annotations.forEach((annotation, index) => {
            category.isActiveHistory[index] = annotation.getIsActive();
        });
        if (app) app._notify();
        return category;
    }
}

export default AnnotationCategory;


