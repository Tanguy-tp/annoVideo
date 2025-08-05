import Time from './Time.js';


class Annotation {

    #tolerance = 0.0001;

    constructor(name, color, key, isDiscrete, isActive = true, history = null, app = null) {
        if (typeof name !== 'string') {
            throw new TypeError("AnnotationCategory name must be a string.");
        }
        //front-end
        this.name = name;
        this.color = color;
        this.key = key;
        this.isDiscrete = isDiscrete;
        this.isActive = isActive;
        this.times = [];

        //back-end
        this.history = history;
        this.app = app;
    }


    /* ------------------ ADD ------------------ */

    addTime(start, end = undefined) {
        const time = new Time(start, end, this.isDiscrete, this.history, this); 

        const apply = () => {
            this.times.push(time);
        };

        const revert = () => {
            const index = this.times.indexOf(time);
            if (index !== -1) {
                this.times.splice(index, 1);
            }
        };

        apply();
        if (this.app) this.app._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }

        return time;
    }

    duplicateTime(index) {
        const original = this.times[index];
        if (!original) return;

        const offset = original.getIsDiscrete() ? 0.2 : original.duration() + 0.2;
        const newStart = original.getStart() + offset;
        const newEnd = original.getIsDiscrete() ? undefined : original.getEnd() + offset;

        this.addTime(newStart, newEnd);
    }

    
    /* ------------------ REMOVE ------------------ */

    removeTime(index) {
        if (index >= 0 && index < this.times.length) {
            const removed = this.times[index];

            const apply = () => {
                this.times.splice(index, 1);
            };

            const revert = () => {
                this.times.splice(index, 0, removed);
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

    removeTimeByStart(start) {
        const index = this.getTimeIndexByStart(start, this.#tolerance);
        this.removeTime(index);
    }

    clearTimes() {

        const oldTimes = this.times;

        const apply = () => {
            this.times = [];
        };

        const revert = () => {
            this.times = oldTimes;
        };

        apply();
        if (this.app) this.app._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }


    /* ------------------ SETTERS ------------------ */

    setName(newName) {
        if (typeof newName !== 'string') {
            throw new TypeError("AnnotationCategory name must be a string.");
        }

        const oldName = this.name;

        const apply = () => this.name = newName;
        const revert = () => this.name = oldName;

        apply();
        if (this.app) this.app._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    setColor(newColor) {
        const oldColor = this.color;

        const apply = () => this.color = newColor;
        const revert = () => this.color = oldColor;

        apply();
        if (this.app) this.app._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    setKey(newKey) {
        const oldKey = this.key;

        const apply = () => this.key = newKey;
        const revert = () => this.key = oldKey;

        apply();
        if (this.app) this.app._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    setIsActive(newIsActive) {
        if (typeof newIsActive !== 'boolean') {
            throw new TypeError("AnnotationCategory isActive must be a boolean.");
        }

        const apply = () => this._setIsActiveInternal(newIsActive);
        const revert = () => this._setIsActiveInternal(!newIsActive);

        apply();
        if (this.app) this.app._notify();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    setIsActiveWithoutHistory(newIsActive) {
        if (typeof newIsActive !== 'boolean') {
            throw new TypeError("AnnotationCategory isActive must be a boolean.");
        }

        this._setIsActiveInternal;
    }

    _setIsActiveInternal(newIsActive) {
        this.isActive = newIsActive;
        if (newIsActive && this.app) {
            this.app._deactivateAnnotations(this.key, this);
        }
        if (this.app) this.app._notify();
    }
    
    switchDiscrete() {

        const apply = () => this._switchDiscreteInternal();
        const revert = () => this._switchDiscreteInternal();

        if (this.history) {
            this.history.do(apply, revert);
        }
        
        apply();
        if (this.app) this.app._notify();
    }
    
    _switchDiscreteInternal() {
        this.isDiscrete = !this.isDiscrete;

        this.times.forEach(time => {
            if (this.isDiscrete == !time.getIsDiscrete()) {
                time.switchDiscrete();
            }
        });

        return this.isDiscrete;
    }

    slideTimes(offset) {

        const apply = () => {
            this.times.forEach(time => {
            time.slideWithoutHistory(time.getStart() + offset);
        })};

        const revert = () => {
            this.times.forEach(time => {
            time.slideWithoutHistory(time.getStart() - offset);
        })};

        apply();

        if (this.history) {
            this.history.do(apply, revert);
        }
        if (this.app) this.app._notify();
        
    }

    setHistory(newHistory){
        this.history = newHistory;
        this.times.forEach(time => time.setHistory(newHistory));
    }

    setApp(app) {
        this.app = app;
    }

    /* ------------------ GETTERS ------------------ */

    getName() {
        return this.name;
    }

    getColor() {
        return this.color;
    }

    getKey() {
        return this.key;
    }

    getIsDiscrete() {
        return this.isDiscrete;
    }

    getIsActive() {
        return this.isActive;
    }

    getAllTimes() {
        return this.times;
    }

    getTime(index) {
        return this.times[index];
    }

    getTimeByStart(start) {
        return this.times.find(t => Math.abs(t.start - start) < this.#tolerance);
    }

    getTimeIndexByStart(start) {
        return this.times.findIndex(t => Math.abs(t.start - start) < this.#tolerance);
    }

    getDurationSum() {
        return this.times.reduce((sum, t) => sum + t.duration(), 0);
    }

    getTimeCount() {
        return this.times.length;
    }


    /* ------------------ UTILITY ------------------ */

    toString() {
        return `Annotation "${this.name}" [${this.color}, ${this.key}] (${this.isDiscrete ? 'discrete' : 'continuous'})\n` +
               `Times:\n${this.times.map((t, i) => `  [${i}] ${t.toString()}`).join('\n')}`;
    }

    clone() {
        const copy = new Annotation(this.name, this.color, this.key, this.isDiscrete);
        this.times.forEach(t => {
            const time = new Time(t.start, t.end, t.isDiscrete, null, copy);
            copy.times.push(time);
        });
        return copy;
    }



    /* ------------------ SERIALIZATION ------------------ */

    /* Convertit cette annotation en un objet JSON sérialisable. */
    serialize() {
        return {
            type: "annotation",
            name: this.name,
            color: this.color,
            key: this.key,
            isDiscrete: this.isDiscrete,
            isActive: this.isActive,
            times: this.times.map(t => t.serialize())
        };
    }

    /* Reconstruit une Annotation depuis un objet JSON. */
    static deserialize(data, history = null, app = null) {
        const annotation = new Annotation(
            data.name,
            data.color,
            data.key,
            data.isDiscrete,
            data.isActive,
            history,
            app
        );

        annotation.times = data.times.map(t => Time.deserialize(t, history, annotation));
        return annotation;
    }
}

export default Annotation;