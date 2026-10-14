import assert from 'node:assert/strict';
import { getSaveStatusPresentation } from '../src/app/game/save-status-presentation-core.ts';

const formatTime = timestamp => `T${timestamp}`;

assert.equal(getSaveStatusPresentation('new').text, 'Neuer Spielstand');
assert.equal(getSaveStatusPresentation('loaded').text, 'Spielstand geladen');
assert.equal(
  getSaveStatusPresentation('loaded', { timestamp: 123, formatTime }).text,
  'Geladen · T123'
);
assert.equal(
  getSaveStatusPresentation('saved', { timestamp: 456, formatTime }).text,
  'Gespeichert · T456'
);
assert.equal(
  getSaveStatusPresentation('saved', { timestamp: 789, manual: true, formatTime }).text,
  'Manuell gespeichert · T789'
);
assert.equal(getSaveStatusPresentation('saved', { manual: true }).text, 'Manuell gespeichert');
assert.equal(getSaveStatusPresentation('unavailable').text, 'Lokaler Save nicht verfügbar');
assert.equal(getSaveStatusPresentation('reset').text, 'Spielstand zurückgesetzt');
assert.equal(
  getSaveStatusPresentation('loaded', { timestamp: Number.NaN, formatTime }).text,
  'Spielstand geladen'
);

console.log('Save-Status-Presentation-Core: alle Statusvarianten und Zeitformat-Fallbacks sind konsistent.');
