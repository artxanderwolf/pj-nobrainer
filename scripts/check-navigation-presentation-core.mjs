import assert from 'node:assert/strict';
import {
  NAVIGATION_ITEMS,
  NAVIGATION_SCREEN_IDS,
  getNavigationPresentation
} from '../src/app/game/navigation-presentation-core.ts';

assert.deepEqual(
  NAVIGATION_ITEMS.map(({ id, title, sectionId }) => [id, title, sectionId]),
  [
    ['base', 'Übersicht', 'base'],
    ['character', 'Charakter', 'character'],
    ['storage', 'Lager', 'storage'],
    ['dungeon', 'Dungeon', 'dungeon']
  ]
);

assert.deepEqual(getNavigationPresentation('base'), {
  pageId: 'base', title: 'Übersicht', parentPageId: null, sectionId: 'base'
});
assert.deepEqual(getNavigationPresentation('forge-form'), {
  pageId: 'forge-form', title: 'Waffe herstellen', parentPageId: 'forge', sectionId: 'storage'
});
assert.deepEqual(getNavigationPresentation('forge-preview'), {
  pageId: 'forge-preview', title: 'Waffenvorschau', parentPageId: 'forge-form', sectionId: 'storage'
});
assert.deepEqual(getNavigationPresentation('dungeon-log'), {
  pageId: 'dungeon-log', title: 'Kampfprotokoll', parentPageId: 'dungeon-expedition', sectionId: 'dungeon'
});
assert.ok(NAVIGATION_SCREEN_IDS.includes('character-capacity'));
assert.ok(NAVIGATION_SCREEN_IDS.includes('market-upgrade'));
assert.equal(NAVIGATION_SCREEN_IDS.includes('forge-materials'), false);
assert.deepEqual(getNavigationPresentation('unknown'), getNavigationPresentation('base'));

console.log('Navigation-Presentation-Core: vier Hauptbereiche, kombinierter Schmiedebau und Zurück-Hierarchie sind konsistent.');
