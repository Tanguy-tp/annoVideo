const fs = require('fs');
const path = require('path');
const Application = require('../Application');

class StateManager {
    static save(app, filePath = path.join(__dirname, 'app_state.json')) {
        if (!(app instanceof Application)) {
            throw new TypeError("StateManager.save: app must be an instance of Application.");
        }

        /*if (typeof filePath === string) {
            filePath = path.join(__dirname, filePath);
        }*/

        const serialized = JSON.stringify(app.serialize(), null, 2);
        fs.writeFileSync(filePath, serialized, 'utf-8');
    }

    static load(filePath = path.join(__dirname, 'app_state.json')) {
        
        /*if (typeof filePath === string) {
            filePath = path.join(__dirname, filePath);
        }*/
        
        if (!fs.existsSync(filePath)) {
            console.warn("No previous state found at", filePath);
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const app = new Application();
        app.deserialize(content);
        return app;
    }
}

module.exports = StateManager;
