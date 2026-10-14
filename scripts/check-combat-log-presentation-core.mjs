import assert from 'node:assert/strict';
import { getCombatLogEntryPresentation } from '../src/app/game/combat-log-presentation-core.ts';

const basic = getCombatLogEntryPresentation('Treffer', 'good');
assert.deepEqual(basic, {
  text: 'Treffer',
  className: 'good',
  clearPlaceholder: false,
  placement: 'prepend'
});

const clearsLegacyPlaceholder = getCombatLogEntryPresentation('Start', 'muted', {
  childCount: 1,
  firstChildClassName: 'muted',
  firstChildText: 'Noch kein Kampfprotokoll vorhanden.'
});
assert.equal(clearsLegacyPlaceholder.clearPlaceholder, true);

const keepsExistingHistory = getCombatLogEntryPresentation('Weiter', 'bad', {
  childCount: 2,
  firstChildClassName: 'muted',
  firstChildText: 'Noch kein Kampfprotokoll vorhanden.'
});
assert.equal(keepsExistingHistory.clearPlaceholder, false);

const keepsDifferentMutedText = getCombatLogEntryPresentation('Weiter', '', {
  childCount: 1,
  firstChildClassName: 'muted extra',
  firstChildText: 'Automatik noch nicht gestartet.'
});
assert.equal(keepsDifferentMutedText.clearPlaceholder, false);

console.log('Combat-Log-Presentation-Core: Text, Klasse, Reihenfolge und Legacy-Platzhalterverhalten geprüft.');
