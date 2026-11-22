// Ersetzt window.prompt (in Electron nicht vorhanden) durch das Eingabefenster aus main.js
const { ipcRenderer } = require('electron');
window.prompt = (text = '', vorgabe = '') => ipcRenderer.sendSync('prompt', String(text), String(vorgabe ?? ''));
