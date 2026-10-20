import * as baseline from './game-core-v01310-baseline.ts';
import type {
  CharacterStatModifiers,
  MaterialDefinition,
  WeaponSlot as BaselineWeaponSlot,
  WeaponStats
} from './game-core-v01310-baseline.ts';
import {
  DATA_META,
  GENERATED_CHARACTER_CLASSES,
  GENERATED_CONFIG,
  GENERATED_DUNGEON_ENEMY_DEFINITIONS,
  GENERATED_DUNGEON_LOOT_TABLES,
  GENERATED_MATERIAL_KEYS,
  GENERATED_MATERIAL_SALE_RARITY_BONUS,
  GENERATED_MATERIALS
} from './data/generated/game-data.generated.ts';

function replaceData(target: object, source: object): void {
  const mutable = target as Record<string, unknown>;
  for (const key of Object.keys(mutable)) delete mutable[key];
  Object.assign(mutable, JSON.parse(JSON.stringify(source)) as Record<string, unknown>);
}

if (DATA_META.schemaVersion !== 1 || DATA_META.baselineVersion !== '0.13.10') {
  throw new Error(`Ungültige NoBrainer-Datenbasis: Schema ${DATA_META.schemaVersion}, Baseline ${DATA_META.baselineVersion}.`);
}

replaceData(baseline.CONFIG, GENERATED_CONFIG);
replaceData(baseline.CHARACTER_CLASSES, GENERATED_CHARACTER_CLASSES);
replaceData(baseline.MATERIAL_SALE_RARITY_BONUS, GENERATED_MATERIAL_SALE_RARITY_BONUS);
replaceData(baseline.MATERIALS, GENERATED_MATERIALS);
replaceData(baseline.DUNGEON_ENEMY_DEFINITIONS, GENERATED_DUNGEON_ENEMY_DEFINITIONS);
replaceData(baseline.DUNGEON_LOOT_TABLES, GENERATED_DUNGEON_LOOT_TABLES);

export interface MaterialReference {
  materialId: number;
  technicalKey: string;
  displayName: string;
  definition: MaterialDefinition;
}

export interface WeaponSlot extends BaselineWeaponSlot {
  /** Kanonische Materialreferenz. material bleibt nur für Anzeige und Altstände erhalten. */
  materialId?: number | null;
}

const materialReferences: MaterialReference[] = GENERATED_MATERIAL_KEYS.map(key => {
  const definition = baseline.MATERIALS[key.displayName];
  if (!definition || definition.materialId !== key.materialId) {
    throw new Error(`Ungültige Materialreferenz: ID ${key.materialId} (${key.displayName}).`);
  }
  return {
    materialId: key.materialId,
    technicalKey: key.technicalKey,
    displayName: key.displayName,
    definition
  };
});

export const MATERIAL_REFERENCES_BY_ID = Object.freeze(
  Object.fromEntries(materialReferences.map(reference => [reference.materialId, reference]))
) as Readonly<Record<number, MaterialReference>>;

export const MATERIAL_IDS_BY_NAME = Object.freeze(
  Object.fromEntries(materialReferences.map(reference => [reference.displayName, reference.materialId]))
) as Readonly<Record<string, number>>;

export function getMaterialReferenceById(materialId: number | null | undefined): MaterialReference | null {
  const resolved = Number(materialId);
  if (!Number.isInteger(resolved)) return null;
  return MATERIAL_REFERENCES_BY_ID[resolved] ?? null;
}

export function getMaterialById(materialId: number | null | undefined): [string, MaterialDefinition] | null {
  const reference = getMaterialReferenceById(materialId);
  return reference ? [reference.displayName, reference.definition] : null;
}

export function getMaterialIdByName(displayName: string | null | undefined): number | null {
  if (!displayName) return null;
  return MATERIAL_IDS_BY_NAME[String(displayName)] ?? null;
}

export function getMaterialDisplayNameById(materialId: number | null | undefined): string | null {
  return getMaterialReferenceById(materialId)?.displayName ?? null;
}

function normalizeWeaponMaterialReference(slot: BaselineWeaponSlot & { materialId?: number | null }): WeaponSlot {
  const referenceById = getMaterialReferenceById(slot.materialId);
  const materialName = typeof slot.material === 'string' && slot.material ? slot.material : null;
  const materialIdByName = getMaterialIdByName(materialName);

  if (referenceById && materialIdByName !== null && materialIdByName !== referenceById.materialId) {
    throw new Error(
      `Widersprüchliche Materialreferenz an Waffenslot ${String(slot.slot ?? '?')}: ` +
      `${materialName} verweist auf ID ${materialIdByName}, der Slot auf ID ${referenceById.materialId}.`
    );
  }

  const reference = referenceById ?? getMaterialReferenceById(materialIdByName);
  if (!reference) return { ...slot, materialId: null };
  return {
    ...slot,
    materialId: reference.materialId,
    material: reference.displayName
  };
}

/**
 * Normalisiert alte Slot-Bezeichner und ergänzt stabile Material-IDs.
 * Bei bekannten Materialien ist materialId die kanonische Referenz; material wird
 * nur als lesbarer Anzeige-/Kompatibilitätswert mitgeführt.
 */
export function normalizeWeaponSlots(slots: readonly WeaponSlot[] | null | undefined): WeaponSlot[] {
  return baseline
    .normalizeWeaponSlots(slots as readonly BaselineWeaponSlot[] | null | undefined)
    .map(slot => normalizeWeaponMaterialReference(slot));
}

export function isWeaponSelectionComplete(
  slots: readonly WeaponSlot[] | null | undefined,
  weaponForm: string
): boolean {
  return baseline.isWeaponSelectionComplete(normalizeWeaponSlots(slots), weaponForm);
}

export function rarityFactor(slots: readonly WeaponSlot[] | null | undefined): number {
  return baseline.rarityFactor(normalizeWeaponSlots(slots));
}

export function calculateWeaponCharacterModifiers(
  slots: readonly WeaponSlot[] | null | undefined,
  weaponForm: string
): CharacterStatModifiers {
  return baseline.calculateWeaponCharacterModifiers(normalizeWeaponSlots(slots), weaponForm);
}

export function calculateWeaponStats(
  slots: readonly WeaponSlot[] | null | undefined,
  weaponForm: string
): WeaponStats {
  return baseline.calculateWeaponStats(normalizeWeaponSlots(slots), weaponForm);
}

export { DATA_META, GENERATED_MATERIAL_KEYS as MATERIAL_KEYS };
export * from './game-core-v01310-baseline.ts';