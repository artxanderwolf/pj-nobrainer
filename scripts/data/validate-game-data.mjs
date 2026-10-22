import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readAllTables } from './read-tabular-data.mjs';

const CLASS_IDS = new Set(['recruit', 'fighter', 'archer', 'scholar']);
const CATEGORIES = new Set(['Holz', 'Metall', 'Leder']);
const PART_IDS = new Set(['workingPart', 'back', 'gripCore', 'gripWrap', 'special', 'parry', 'bowstring']);
const SPECIAL_STATS = new Set(['', 'GES', 'P', 'DS']);
const STAT_KEYS = new Set([
  'hp', 'energy', 'armor', 'dodge', 'strengthFactor', 'precision', 'threat', 'critChance', 'critDamage',
  'hpRegenPerMinute', 'energyRegenPerMinute', 'experienceFactor', 'lifeSteal', 'penetration'
]);

function fail(message) { throw new Error(`Datenvalidierung: ${message}`); }
function asNumber(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) fail(`${label} muss numerisch sein.`);
  return numeric;
}
function asInteger(value, label) {
  const numeric = asNumber(value, label);
  if (!Number.isInteger(numeric)) fail(`${label} muss ganzzahlig sein.`);
  return numeric;
}
function assertUnique(rows, key, tableName) {
  const seen = new Set();
  for (const row of rows) {
    const value = String(row[key]);
    if (seen.has(value)) fail(`${tableName}.${key} enthält ${value} mehrfach.`);
    seen.add(value);
  }
}
function assertRange(value, min, max, label) {
  const numeric = asNumber(value, label);
  if (numeric < min || numeric > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`);
}
function splitList(value) {
  return String(value ?? '').split('|').map(item => item.trim()).filter(Boolean);
}

export function validateGameData(tables) {
  const metaRows = tables._meta.rows;
  if (metaRows.length !== 1) fail('_meta muss genau eine Datenzeile enthalten.');
  const meta = metaRows[0];
  if (asInteger(meta.schema_version, '_meta.schema_version') !== 1) fail('schema_version muss für Data Architecture v1 gleich 1 sein.');
  if (String(meta.baseline_version) !== '0.13.10') fail('baseline_version muss für diese Migration 0.13.10 sein.');

  const classes = tables.character_classes.rows;
  assertUnique(classes, 'id', 'character_classes');
  if (classes.length !== CLASS_IDS.size) fail('Phase 1 muss die vier bestehenden Klassen unverändert enthalten.');
  for (const row of classes) {
    if (!CLASS_IDS.has(String(row.id))) fail(`Unbekannte Klasse ${row.id}.`);
    if (!String(row.display_name)) fail(`Klasse ${row.id} benötigt display_name.`);
    assertRange(row.dodge, 0, 0.95, `character_classes ${row.id}.dodge`);
    assertRange(row.crit_chance, 0, 1, `character_classes ${row.id}.crit_chance`);
    assertRange(row.life_steal, 0, 1, `character_classes ${row.id}.life_steal`);
    assertRange(row.penetration, 0, 1, `character_classes ${row.id}.penetration`);
  }

  const progression = tables.character_progression.rows;
  if (progression.length !== 1) fail('character_progression muss genau eine Zeile enthalten.');
  if (asInteger(progression[0].max_level, 'character_progression.max_level') < 1) fail('max_level muss mindestens 1 sein.');
  if (asNumber(progression[0].xp_base, 'character_progression.xp_base') <= 0) fail('xp_base muss größer 0 sein.');
  if (asNumber(progression[0].xp_growth, 'character_progression.xp_growth') <= 0) fail('xp_growth muss größer 0 sein.');
  if (asNumber(progression[0].stat_growth, 'character_progression.stat_growth') <= 0) fail('stat_growth muss größer 0 sein.');
  if (asNumber(progression[0].strength_factor_growth, 'character_progression.strength_factor_growth') <= 0) fail('strength_factor_growth muss größer 0 sein.');
  if (asNumber(progression[0].precision_growth, 'character_progression.precision_growth') <= 0) fail('precision_growth muss größer 0 sein.');
  if (asNumber(progression[0].crit_damage_growth, 'character_progression.crit_damage_growth') <= 0) fail('crit_damage_growth muss größer 0 sein.');
  if (asNumber(progression[0].experience_factor_growth, 'character_progression.experience_factor_growth') <= 0) fail('experience_factor_growth muss größer 0 sein.');

  const materials = tables.materials.rows;
  assertUnique(materials, 'material_id', 'materials');
  assertUnique(materials, 'technical_key', 'materials');
  assertUnique(materials, 'display_name', 'materials');
  const materialIds = new Set();
  for (const row of materials) {
    const id = asInteger(row.material_id, `materials ${row.display_name}.material_id`);
    if (id <= 0) fail(`Material-ID ${id} muss positiv sein.`);
    materialIds.add(id);
    if (!/^[a-z][a-z0-9_]*$/.test(String(row.technical_key))) fail(`technical_key ${row.technical_key} ist ungültig.`);
    if (!CATEGORIES.has(String(row.category))) fail(`Material ${row.display_name} hat unbekannte Kategorie ${row.category}.`);
    if (asInteger(row.rarity, `materials ${row.display_name}.rarity`) < 1) fail(`Material ${row.display_name} braucht rarity >= 1.`);
    if (asNumber(row.dungeon_drop_weight, `materials ${row.display_name}.dungeon_drop_weight`) < 0) fail(`Material ${row.display_name} hat negatives Dropgewicht.`);
    if (!SPECIAL_STATS.has(String(row.special_stat))) fail(`Material ${row.display_name} hat unbekannten Spezialwert ${row.special_stat}.`);
  }

  const parts = tables.weapon_parts.rows;
  assertUnique(parts, 'part_id', 'weapon_parts');
  const partIds = new Set(parts.map(row => String(row.part_id)));
  for (const row of parts) {
    const id = String(row.part_id);
    if (!PART_IDS.has(id)) fail(`Unbekannter Waffenteil-Typ ${id}.`);
    if (String(row.material_slot) !== id) fail(`weapon_parts ${id}: material_slot muss in Phase 1 der part_id entsprechen.`);
    for (const category of splitList(row.categories)) if (!CATEGORIES.has(category)) fail(`weapon_parts ${id}: unbekannte Kategorie ${category}.`);
    for (const statKey of splitList(row.stat_keys)) if (!STAT_KEYS.has(statKey)) fail(`weapon_parts ${id}: unbekannter Stat ${statKey}.`);
  }

  const forms = tables.weapon_forms.rows;
  assertUnique(forms, 'id', 'weapon_forms');
  const formIds = new Set(forms.map(row => String(row.id)));
  for (const row of forms) {
    if (!/^[a-z][a-z0-9]*$/.test(String(row.id))) fail(`weapon_forms.id ${row.id} ist ungültig.`);
    if (typeof row.one_handed !== 'boolean') fail(`weapon_forms ${row.id}.one_handed muss true oder false sein.`);
    if (asNumber(row.base_damage, `weapon_forms ${row.id}.base_damage`) < 0) fail(`weapon_forms ${row.id}: base_damage darf nicht negativ sein.`);
    if (asNumber(row.base_speed, `weapon_forms ${row.id}.base_speed`) <= 0) fail(`weapon_forms ${row.id}: base_speed muss > 0 sein.`);
    assertRange(row.base_hit_chance, 0, 1, `weapon_forms ${row.id}.base_hit_chance`);
    assertRange(row.base_penetration, 0, 1, `weapon_forms ${row.id}.base_penetration`);
  }

  const formParts = tables.weapon_form_parts.rows;
  const relationKeys = new Set();
  for (const row of formParts) {
    const formId = String(row.weapon_form_id);
    const partId = String(row.part_id);
    if (!formIds.has(formId)) fail(`weapon_form_parts referenziert unbekannte Waffenform ${formId}.`);
    if (!partIds.has(partId)) fail(`weapon_form_parts ${formId} referenziert unbekannten Waffenteil ${partId}.`);
    const key = `${formId}:${partId}`;
    if (relationKeys.has(key)) fail(`weapon_form_parts enthält ${key} mehrfach.`);
    relationKeys.add(key);
    if (asInteger(row.quantity, `weapon_form_parts ${key}.quantity`) <= 0) fail(`weapon_form_parts ${key}: quantity muss > 0 sein.`);
  }
  for (const formId of formIds) if (![...relationKeys].some(key => key.startsWith(`${formId}:`))) fail(`Waffenform ${formId} besitzt kein Rezept.`);

  const dungeons = tables.dungeons.rows;
  assertUnique(dungeons, 'dungeon_id', 'dungeons');
  if (dungeons.length !== 1) fail('Die aktuelle Runtime unterstützt in Phase 1 genau einen aktiven CONFIG.dungeon-Eintrag.');
  const dungeonIds = new Set(dungeons.map(row => asInteger(row.dungeon_id, 'dungeons.dungeon_id')));
  for (const row of dungeons) {
    if (asNumber(row.energy_cost, `dungeons ${row.dungeon_id}.energy_cost`) < 0) fail('energy_cost darf nicht negativ sein.');
    assertRange(row.enemy_base_hit_chance, 0, 1, `dungeons ${row.dungeon_id}.enemy_base_hit_chance`);
    assertRange(row.enemy_base_penetration, 0, 1, `dungeons ${row.dungeon_id}.enemy_base_penetration`);
    assertRange(row.encounter_chance, 0, 1, `dungeons ${row.dungeon_id}.encounter_chance`);
  }

  const classWeights = tables.dungeon_enemy_weights.rows;
  const weightKeys = new Set();
  for (const row of classWeights) {
    const dungeonId = asInteger(row.dungeon_id, 'dungeon_enemy_weights.dungeon_id');
    const classId = String(row.class_id);
    if (!dungeonIds.has(dungeonId)) fail(`dungeon_enemy_weights referenziert unbekannten Dungeon ${dungeonId}.`);
    if (!CLASS_IDS.has(classId)) fail(`dungeon_enemy_weights referenziert unbekannte Klasse ${classId}.`);
    const key = `${dungeonId}:${classId}`;
    if (weightKeys.has(key)) fail(`dungeon_enemy_weights enthält ${key} mehrfach.`);
    weightKeys.add(key);
    if (asNumber(row.weight, `dungeon_enemy_weights ${key}.weight`) < 0) fail(`dungeon_enemy_weights ${key}: weight darf nicht negativ sein.`);
  }

  const countRows = tables.dungeon_enemy_counts.rows;
  const countKeys = new Set();
  for (const row of countRows) {
    const dungeonId = asInteger(row.dungeon_id, 'dungeon_enemy_counts.dungeon_id');
    const teamSize = asInteger(row.team_size, 'dungeon_enemy_counts.team_size');
    const enemyCount = asInteger(row.enemy_count, 'dungeon_enemy_counts.enemy_count');
    if (!dungeonIds.has(dungeonId)) fail(`dungeon_enemy_counts referenziert unbekannten Dungeon ${dungeonId}.`);
    if (teamSize < 1 || teamSize > 4 || enemyCount < 1 || enemyCount > 4) fail('dungeon_enemy_counts unterstützt aktuell team_size/enemy_count 1..4.');
    const key = `${dungeonId}:${teamSize}:${enemyCount}`;
    if (countKeys.has(key)) fail(`dungeon_enemy_counts enthält ${key} mehrfach.`);
    countKeys.add(key);
    if (asNumber(row.weight, `dungeon_enemy_counts ${key}.weight`) < 0) fail(`dungeon_enemy_counts ${key}: weight darf nicht negativ sein.`);
  }
  for (const dungeonId of dungeonIds) for (let team = 1; team <= 4; team += 1) for (let enemy = 1; enemy <= 4; enemy += 1) {
    if (!countKeys.has(`${dungeonId}:${team}:${enemy}`)) fail(`dungeon_enemy_counts fehlt ${dungeonId}:${team}:${enemy}.`);
  }

  const enemies = tables.dungeon_enemies.rows;
  const enemyKeys = new Set();
  for (const row of enemies) {
    const dungeonId = asInteger(row.dungeon_id, 'dungeon_enemies.dungeon_id');
    const classId = String(row.class_id);
    if (!dungeonIds.has(dungeonId)) fail(`dungeon_enemies referenziert unbekannten Dungeon ${dungeonId}.`);
    if (!CLASS_IDS.has(classId)) fail(`dungeon_enemies referenziert unbekannte Klasse ${classId}.`);
    const key = `${dungeonId}:${classId}`;
    if (enemyKeys.has(key)) fail(`dungeon_enemies enthält ${key} mehrfach.`);
    enemyKeys.add(key);
    if (!String(row.display_name)) fail(`dungeon_enemies ${key} benötigt display_name.`);
    if (asNumber(row.xp_drop, `dungeon_enemies ${key}.xp_drop`) < 0) fail(`dungeon_enemies ${key}: xp_drop darf nicht negativ sein.`);
  }

  const lootKeys = new Set();
  for (const row of tables.dungeon_enemy_loot.rows) {
    const dungeonId = asInteger(row.dungeon_id, 'dungeon_enemy_loot.dungeon_id');
    const classId = String(row.class_id);
    const order = asInteger(row.order, 'dungeon_enemy_loot.order');
    const materialId = asInteger(row.material_id, 'dungeon_enemy_loot.material_id');
    const enemyKey = `${dungeonId}:${classId}`;
    if (!enemyKeys.has(enemyKey)) fail(`dungeon_enemy_loot referenziert unbekannten Gegner ${enemyKey}.`);
    if (!materialIds.has(materialId)) fail(`dungeon_enemy_loot ${enemyKey} referenziert unbekannte Material-ID ${materialId}.`);
    const key = `${enemyKey}:${order}`;
    if (lootKeys.has(key)) fail(`dungeon_enemy_loot enthält ${key} mehrfach.`);
    lootKeys.add(key);
  }

  const categoryKeys = new Set();
  for (const row of tables.dungeon_category_weights.rows) {
    const dungeonId = asInteger(row.dungeon_id, 'dungeon_category_weights.dungeon_id');
    const category = String(row.category);
    if (!dungeonIds.has(dungeonId)) fail(`dungeon_category_weights referenziert unbekannten Dungeon ${dungeonId}.`);
    if (!CATEGORIES.has(category)) fail(`dungeon_category_weights enthält unbekannte Kategorie ${category}.`);
    const key = `${dungeonId}:${category}`;
    if (categoryKeys.has(key)) fail(`dungeon_category_weights enthält ${key} mehrfach.`);
    categoryKeys.add(key);
    if (asNumber(row.weight, `dungeon_category_weights ${key}.weight`) < 0) fail(`dungeon_category_weights ${key}: weight darf nicht negativ sein.`);
  }

  const settings = tables.game_settings.rows;
  assertUnique(settings, 'key', 'game_settings');
  const requiredSettings = new Set(['energyRegenPerMinute','market.baseSeconds','market.materialBaseNickel','tavern.recruitBaseNickel','tavern.recruitGrowth','forge.baseSeconds']);
  for (const key of requiredSettings) if (!settings.some(row => row.key === key)) fail(`game_settings fehlt ${key}.`);

  const upgrades = tables.upgrades.rows;
  assertUnique(upgrades, 'id', 'upgrades');
  for (const row of upgrades) {
    if (!['start', 'startCapacity'].includes(String(row.start_property))) fail(`upgrades ${row.id}: start_property muss start oder startCapacity sein.`);
    if (asNumber(row.base_cost_nickel, `upgrades ${row.id}.base_cost_nickel`) < 0) fail(`upgrades ${row.id}: Kosten dürfen nicht negativ sein.`);
    if (asNumber(row.growth, `upgrades ${row.id}.growth`) <= 0) fail(`upgrades ${row.id}: growth muss > 0 sein.`);
    if (asNumber(row.max_value, `upgrades ${row.id}.max_value`) < asNumber(row.start_value, `upgrades ${row.id}.start_value`)) fail(`upgrades ${row.id}: max_value muss >= start_value sein.`);
  }

  const rarity = tables.rarity_balance.rows;
  assertUnique(rarity, 'rarity', 'rarity_balance');
  for (const row of rarity) {
    if (asInteger(row.rarity, 'rarity_balance.rarity') < 1) fail('rarity_balance.rarity muss >= 1 sein.');
    if (asNumber(row.sale_bonus, `rarity_balance ${row.rarity}.sale_bonus`) < 0) fail(`rarity_balance ${row.rarity}: sale_bonus darf nicht negativ sein.`);
  }

  const economy = tables.economy_balance.rows;
  assertUnique(economy, 'key', 'economy_balance');
  const benchmark = economy.find(row => row.key === 'weaponArmorBenchmarks');
  if (!benchmark) fail('economy_balance fehlt weaponArmorBenchmarks.');
  const armorBenchmarks = splitList(benchmark.value).map(value => asNumber(value, 'weaponArmorBenchmarks'));
  if (!armorBenchmarks.length) fail('weaponArmorBenchmarks darf nicht leer sein.');

  return { meta, classIds: CLASS_IDS, materialIds, formIds, dungeonIds };
}

export async function validateFromDisk() {
  const tables = await readAllTables();
  validateGameData(tables);
  return tables;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  await validateFromDisk();
  console.log('NoBrainer-Datentabellen: Validierung erfolgreich.');
}
