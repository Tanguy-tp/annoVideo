
class Time {
    
    #tolerance = 0.0001;

    constructor(start, end, isDiscrete, history = null, annotation = null) {
        
        if (start > end) {
            this.start = end;
            this.end = start;
            console.log("WARNING : start > end (values were automatically swapped)");
        } else {
            this.start = start;
            this.end = end;
        }
        this.annotation = annotation;
        this.isDiscrete = isDiscrete;
        this.history = history;
    }


    /* ------------------ SETTERS ------------------ */


    /* SET START METHODS */
    // should be called by the user
    setStart(newStart) {
        const oldStart = this.start;

        const apply = () => this._setStartInternal(newStart);
        const revert = () => this._setStartInternal(oldStart);

        apply();
        this._notifyApp();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    // should be called by Annotation
    /*setStartWithoutHistory(newStart) {
        this._setStartInternal(newStart);
    }*/ //useless for now

    // internal
    _setStartInternal(newStart) {
        this.start = newStart;
    }

    setAnnotation(annotation) {
    this.annotation = annotation;
    }

    _notifyApp() {
        if (this.annotation && this.annotation.app) {
            this.annotation.app._notify();
        }
    }


    
    /* SET END METHODS */
    //should be called by the user
    setEnd(newEnd) {
        const oldEnd = this.end;

        const apply = () => this._setEndInternal(newEnd);
        const revert = () => this._setEndInternal(oldEnd);

        apply();
        this._notifyApp();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    //should be called by Annotation
    /*setEndWithoutHistory(newEnd) {
        this._setEndInternal(newEnd)
    }*/ //useless for now

    //internal
    _setEndInternal(newEnd) {
        if (!this.isDiscrete) {
            this.end = newEnd;
        }
    }


    //shouldn't be called by the user 
    switchDiscrete() {
        if (this.isDiscrete && typeof this.end === "undefined") {
            this.end = this.start + 2 * this.#tolerance;
        }

        this.isDiscrete = !this.isDiscrete;
        //console.log(`isDiscrete == ${this.isDiscrete}`);
        return this.isDiscrete;
    }


    /* SLIDE METHODS */
    //should be called by the user
    slide(newStart) {
        const oldStart = this.start;

        const apply = () => this._slideInternal(newStart);
        const revert = () => this._slideInternal(oldStart);

        apply();
        this._notifyApp();

        if (this.history) {
            this.history.do(apply, revert);
        }
    }

    //should be called by Annotation
    slideWithoutHistory(newStart) {
        this._slideInternal(newStart);
    }

    //internal
    _slideInternal(newStart) {
        const offset = newStart - this.start;
        this.start = newStart;
        if (!this.isDiscrete && typeof this.end !== "undefined") {
            this.end += offset;
        }
    }

    setHistory(newHistory) {
        this.history = newHistory;
    }

    /* ------------------ GETTERS ------------------ */

    duration() {
        return this.isDiscrete ? 0 : this.end - this.start;
    }

    getStart() {
        return this.start;
    }

    getEnd() {
        if (this.isDiscrete) {
            console.log("WARNING : trying to get the end value of a discrete Time");
            return this.start;
        }

        return this.end;
    }

    getIsDiscrete() {
        return this.isDiscrete;
    }


    /* ------------------ UTILITY ------------------ */

    toString() {
        return `Time:\nstart: ${this.start}\nend: ${this.end}\nisDiscrete: ${this.isDiscrete}`;
    }


    /* ------------------ SERIALIZATION ------------------ */

    /* Convertit l'objet Time en un objet JSON sérialisable. */
    serialize() {
        return {
            start: this.start,
            end: this.end,
            isDiscrete: this.isDiscrete
        };
    }

    /* Reconstruit une instance de Time depuis un objet JSON. */
    static deserialize(data, history = null, annotation = null) {
        const time = new Time(data.start, data.end, data.isDiscrete, history, annotation);
        return time;
    }

}

export default Time;