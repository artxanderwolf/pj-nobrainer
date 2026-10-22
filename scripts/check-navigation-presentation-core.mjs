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
assert.deepEqual(getNavigationPresentation('dungeon'), {
  pageId: 'dungeon', title: 'Dungeon', parentPageId: 'base', sectionId: 'dungeon'
});
assert.deepEqual(
  getNavigationPresentation('dungeon-select'),
  getNavigationPresentation('base'),
  'Dungeon 1 darf nicht mehr als normale Unterseite erreichbar sein.'
);
assert.deepEqual(
  getNavigationPresentation('dungeon-log'),
  getNavigationPresentation('base'),
  'Das alte Dungeon-Protokoll darf nicht mehr als eigene Seite erreichbar sein.'
);
assert.ok(NAVIGATION_SCREEN_IDS.includes('character-capacity'));
assert.ok(NAVIGATION_SCREEN_IDS.includes('market-upgrade'));
assert.equal(NAVIGATION_SCREEN_IDS.includes('forge-materials'), false);
for (const obsoleteDungeonPage of ['dungeon-select', 'dungeon-team', 'dungeon-expedition', 'dungeon-loot', 'dungeon-log']) {
  assert.equal(NAVIGATION_SCREEN_IDS.includes(obsoleteDungeonPage), false, `${obsoleteDungeonPage} ist weiterhin Teil der Navigationshierarchie.`);
}
assert.deepEqual(getNavigationPresentation('unknown'), getNavigationPresentation('base'));

console.log('Navigation-Presentation-Core: vier Hauptbereiche bleiben erhalten; Dungeon 1 ist ausschließlich Popup-Inhalt und keine navigierbare Unterseite mehr.');
