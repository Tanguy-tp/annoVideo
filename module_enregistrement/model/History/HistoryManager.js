class HistoryManager {
    constructor(maxHistory = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = maxHistory;
    }

    /*
    Function to call whenever the user executes an action
    redoFn : Function that could be re-executed
    undoFn : Function to cancel the last action
     */
    do(redoFn, undoFn) {
        if (typeof redoFn !== 'function' || typeof undoFn !== 'function') {
            throw new TypeError("redo and undo must be functions");
        }

        this.undoStack.push({ redo: redoFn, undo: undoFn });
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift(); // removes the last action if the stack is full
        }

        this.redoStack = []; // reinitialises the redo stack
    }

    /* Undoes the last action */
    undo() {
        const action = this.undoStack.pop();
        if (action) {
            action.undo();
            this.redoStack.push(action);
        }
    }

    /* Redoes the last action */
    redo() {
        const action = this.redoStack.pop();
        if (action) {
            action.redo();
            this.undoStack.push(action);
        }
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export default HistoryManager;