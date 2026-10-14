import assert from 'node:assert/strict';
import {
  getMobileTableLabelPresentation
} from '../src/app/game/mobile-table-presentation-core.ts';

assert.deepEqual(
  getMobileTableLabelPresentation([' Material ', 'Kategorie', ' Menge '], 3),
  { labels: ['Material', 'Kategorie', 'Menge'] }
);

assert.deepEqual(
  getMobileTableLabelPresentation(['Material'], 3),
  { labels: ['Material', '', ''] }
);

assert.deepEqual(
  getMobileTableLabelPresentation(['A', 'B'], 0),
  { labels: [] }
);

assert.deepEqual(
  getMobileTableLabelPresentation(['A', 'B'], Number.NaN),
  { labels: [] }
);

assert.deepEqual(
  getMobileTableLabelPresentation(['A', 'B', 'C'], 2.9),
  { labels: ['A', 'B'] }
);

console.log('Mobile-Table-Presentation-Core: Header werden stabil auf Tabellenzellen abgebildet.');
