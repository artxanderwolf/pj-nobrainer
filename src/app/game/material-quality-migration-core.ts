import { normalizeMarketMaterialJob, type MarketJob } from './market-core.ts';
import { canonicalWeaponSlots, getMaterialIdByName, getMaterialReferenceById, getWeaponCraftingSlots, calculateWeaponStats, type WeaponSlot, type WeaponStats } from './game-core.ts';
import { normalizeMaterialInventory, type MaterialStorageInventory } from './material-storage-core.ts';
import { resolveMaterialQuality, type MaterialQuality } from './material-quality-core.ts';
import { summarizeRuneBonuses } from './rune-core.ts';

type ObjectData = Record<string, unknown>;
function object(value: unknown): value is ObjectData { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** Canonical blueprint boundary for the actually released named/ID saves. */
export function normalizeQualityBlueprint(slots: readonly WeaponSlot[], form: string): WeaponSlot[] {
  for (const slot of slots ?? []) {
    if (slot.materialId != null && !getMaterialReferenceById(slot.materialId)) throw new Error('Unbekannte Material-ID im Waffenbauteil.');
    if (slot.quality != null) resolveMaterialQuality(slot.quality, 1);
  }
  const normalized = canonicalWeaponSlots(slots ?? []);
  const result = getWeaponCraftingSlots(form).map(slot => {
    const source = normalized.find(item => item.slot === slot) ?? (slot === 'parry' ? normalized.find(item => item.slot === 'back') : undefined);
    return { slot, materialId: source?.materialId ?? null, quality: source?.quality ?? null };
  }) as WeaponSlot[];
  const special = normalized.find(item => item.slot === 'special');
  if (special) result.push(special);
  return result;
}

export function normalizeQualityWeapon<T extends ObjectData>(item: T): T {
  if (!item || !Array.isArray(item['slots'])) return item;
  const form = String(item['weaponForm'] ?? item['weaponType'] ?? 'sword');
  const result: ObjectData = { ...item, weaponForm: form, slots: normalizeQualityBlueprint(item['slots'] as WeaponSlot[], form) };
  delete result['weaponType'];
  // Existing snapshots are authoritative. Missing snapshots in old real saves are derived once.
  if (!result['stats'] && !result['starter']) result['stats'] = calculateWeaponStats(result['slots'] as WeaponSlot[], form);
  return result as T;
}
export function normalizeQualityMarketJob<T extends ObjectData>(job: T): T {
  return object(job?.['weaponSnapshot']) ? { ...job, weaponSnapshot: normalizeQualityWeapon(job['weaponSnapshot']) } : job;
}

/** Validate/migrate a detached save before legacy normalization or offline advancement. */
export function migrateMaterialQualityWorld(state: ObjectData): boolean {
  const old = state['materialQualitySchema'] !== 1;
  if (state['materialQualitySchema'] !== undefined && state['materialQualitySchema'] !== 1) throw new Error('Unbekanntes Materialqualitaetsformat.');
  const runes = new Map((Array.isArray(state['runeInventory']) ? state['runeInventory'] : []).filter(object).map(item => [item['runeItemId'], String(item['runeDefinitionId'])]));
  function preserve(weapon: ObjectData): void {
    if (!old || weapon['starter'] || weapon['id'] === 0 || !object(weapon['stats'])) return;
    const stats = structuredClone(weapon['stats']) as unknown as WeaponStats;
    const ids = [...(Array.isArray(weapon['runeSockets']) ? weapon['runeSockets'] : []), weapon['legacyRuneItemId']].filter(id => typeof id === 'string');
    const definitions = ids.map(id => runes.get(id)).filter((id): id is string => !!id);
    const bonus = summarizeRuneBonuses(definitions);
    if (stats.characterModifiers) {
      stats.characterModifiers.precision -= bonus.precision;
      stats.characterModifiers.penetration -= bonus.penetration;
    }
    weapon['preservedMaterialBaseStats'] = stats;
    weapon['preservedRuneSignature'] = JSON.stringify(ids);
  }
  function visit(node: ObjectData): void {
    if (node['type'] === 'material') {
      if (node['materialId'] != null && !getMaterialReferenceById(node['materialId'] as number)) throw new Error('Unbekannte Marktmaterial-ID.');
      normalizeMarketMaterialJob(node as unknown as MarketJob);
      if (!getMaterialReferenceById(node['materialId'] as number)) throw new Error('Unbekanntes Marktmaterial.');
      if (node['quantity'] !== undefined && (!Number.isSafeInteger(node['quantity']) || Number(node['quantity']) <= 0)) throw new Error('Ungueltige Marktmaterialmenge.');
    }
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'inventory' || key === 'dungeonLoot') && object(value)) normalizeMaterialInventory(value as MaterialStorageInventory);
      else if (key === 'weaponInventory' && Array.isArray(value)) node[key] = value.filter(object).map(weapon => { const result = normalizeQualityWeapon(weapon); preserve(result); return result; });
      else if (key === 'weaponSnapshot' && object(value)) { const result = normalizeQualityWeapon(value); preserve(result); node[key] = result; }
      else if (['forgeJobs', 'forgeQueue', 'forgeReadyJobs'].includes(key) && Array.isArray(value)) node[key] = value.filter(object).map(job => ({ ...normalizeQualityWeapon(job), ...(old && job['stats'] ? { preservedMaterialSnapshot: true } : {}) }));
      else if (key === 'forgeJob' && object(value)) node[key] = { ...normalizeQualityWeapon(value), ...(old && value['stats'] ? { preservedMaterialSnapshot: true } : {}) };
      else if (key === 'drops' && Array.isArray(value)) {
        node[key] = value.map(drop => {
          if (!object(drop) || drop['runeDefinitionId']) return drop;
          const byId = getMaterialReferenceById(drop['materialId'] as number);
          const byName = getMaterialReferenceById(getMaterialIdByName(String(drop['name'] ?? '')));
          if (drop['materialId'] != null && !byId) throw new Error('Unbekannte Material-ID in Dungeonbeute.');
          if (byId && byName && byId.materialId !== byName.materialId) throw new Error('Widerspruechliche Materialreferenz in Dungeonbeute.');
          const ref = byId ?? byName;
          if (!ref) throw new Error('Unbekanntes Material in ausstehender Dungeonbeute.');
          const result: ObjectData = { ...drop, materialId: ref.materialId, quality: resolveMaterialQuality(drop['quality'], ref.definition.rarity as MaterialQuality) };
          delete result['name']; delete result['category'];
          return result;
        });
      }
      else if (node['type'] === 'material' && key === 'materialId') {
        const ref = getMaterialReferenceById(value as number);
        if (!ref) throw new Error('Unbekanntes Marktmaterial.');
        node['quality'] = resolveMaterialQuality(node['quality'], ref.definition.rarity as MaterialQuality);
      }
      const next = node[key];
      if (object(next)) visit(next);
      else if (Array.isArray(next)) next.filter(object).forEach(visit);
    }
  }
  visit(state);
  state['materialQualitySchema'] = 1;
  return old;
}

export const MATERIAL_QUALITY_MIGRATION_BRIDGE = {
  blueprint: normalizeQualityBlueprint,
  weapon: normalizeQualityWeapon,
  forgeJob: normalizeQualityWeapon,
  marketJob: normalizeQualityMarketJob
};
