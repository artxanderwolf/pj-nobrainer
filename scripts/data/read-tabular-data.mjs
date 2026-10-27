import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const TABLE_DIR = resolve('balancing/tables');

export const REQUIRED_TABLES = [
  '_meta',
  'character_classes',
  'class_equipment_rules',
  'character_progression',
  'materials',
  'weapon_parts',
  'weapon_forms',
  'weapon_form_parts',
  'dungeons',
  'dungeon_enemy_weights',
  'dungeon_enemy_counts',
  'dungeon_enemies',
  'dungeon_enemy_loot',
  'dungeon_category_weights',
  'game_settings',
  'upgrades',
  'rarity_balance',
  'economy_balance'
];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (quoted) throw new Error('CSV endet innerhalb eines nicht geschlossenen Anführungszeichens.');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows.filter(candidate => candidate.some(cell => String(cell).trim() !== ''));
}

export function coerceCell(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return '';
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export async function readTable(name) {
  const path = resolve(TABLE_DIR, `${name}.csv`);
  const text = await readFile(path, 'utf8');
  const matrix = parseCsv(text);
  if (!matrix.length) throw new Error(`${name}.csv ist leer.`);
  const headers = matrix[0].map(cell => String(cell).trim());
  if (headers.some(header => !header)) throw new Error(`${name}.csv enthält eine leere Spaltenüberschrift.`);
  const duplicate = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicate) throw new Error(`${name}.csv enthält die Spalte ${duplicate} mehrfach.`);

  const rows = matrix.slice(1).map((cells, rowIndex) => {
    if (cells.length > headers.length) throw new Error(`${name}.csv Zeile ${rowIndex + 2} enthält zu viele Spalten.`);
    return Object.fromEntries(headers.map((header, index) => [header, coerceCell(cells[index] ?? '')]));
  });
  return { name, path, headers, rows };
}

export async function readAllTables() {
  const entries = await Promise.all(REQUIRED_TABLES.map(readTable));
  return Object.fromEntries(entries.map(table => [table.name, table]));
}
