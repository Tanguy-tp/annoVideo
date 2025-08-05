const { contextBridge } = require('electron');
const Time = require('./model/Time');

contextBridge.exposeInMainWorld('electronAPI', {
  Time : Time
});