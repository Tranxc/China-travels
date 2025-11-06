// src/modules/mapMain.js
import { MapManager } from './map.js';
import { MapEvents } from './mapEvents.js';

document.addEventListener('DOMContentLoaded', async () => {
  const mapManager = new MapManager();
  await mapManager.initMap();
  const mapEvents = new MapEvents(mapManager);
  mapEvents.bindEvents();
});