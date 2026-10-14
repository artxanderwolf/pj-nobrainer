import assert from 'node:assert/strict';
import {
  NAVIGATION_ITEMS,
  getNavigationPresentation
} from '../src/app/game/navigation-presentation-core.ts';

const expected = [
  ['base', 'Stützpunkt'],
  ['dungeon', 'Dungeon'],
  ['tavern', 'Taverne'],
  ['roster', 'Kader'],
  ['storage', 'Lager'],
  ['forge', 'Schmiede'],
  ['market', 'Markt'],
  ['index', 'Index']
];

assert.deepEqual(NAVIGATION_ITEMS.map(({ id, title }) => [id, title]), expected);
for (const [pageId, title] of expected) {
  assert.deepEqual(getNavigationPresentation(pageId), { pageId, title });
}
assert.deepEqual(getNavigationPresentation('unknown'), { pageId: 'unknown', title: '' });

console.log('Navigation-Presentation-Core: Seitenkennungen und Titel sind konsistent.');
