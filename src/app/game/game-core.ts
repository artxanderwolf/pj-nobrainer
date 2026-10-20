import * as baseline from './game-core-v01310-baseline.ts';
import type {
  CharacterModifierKey,
  CharacterStatModifiers,
  MaterialDefinition,
  WeaponPartRequirement,
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
  /** Kanonische Materialreferenz. material wird nur beim Einlesen alter Saves akzeptiert. */
  materialId?: number | null;
}

const materialReferences: MaterialReference[] = GENERATED_MATERIAL_KEYS.map(key => {
  const definition = baseline.MATERIALS[key.displayName];
  if (!definition || definition.materialId !== key.materialId) {
    throw new Error(`Ungültige Materialreferenz: ID ${key.materialId} (${key.displayName}).`);
  }
  return { materialId: key.materialId, technicalKey: key.technicalKey, displayName: key.displayName, definition };
});

export const MATERIAL_REFERENCES = Object.freeze([...materialReferences].sort((a, b) => a.materialId - b.materialId)) as readonly MaterialReference[];
export const MATERIAL_REFERENCES_BY_ID = Object.freeze(Object.fromEntries(MATERIAL_REFERENCES.map(reference => [reference.materialId, reference]))) as Readonly<Record<number, MaterialReference>>;
export const MATERIAL_IDS_BY_NAME = Object.freeze(Object.fromEntries(MATERIAL_REFERENCES.map(reference => [reference.displayName, reference.materialId]))) as Readonly<Record<string, number>>;

export function getMaterialReferenceById(materialId: number | null | undefined): MaterialReference | null {
  const resolved = Number(materialId);
  if (!Number.isInteger(resolved)) return null;
  return MATERIAL_REFERENCES_BY_ID[resolved] ?? null;
}

export function getMaterialDefinitionById(materialId: number | null | undefined): MaterialDefinition | null {
  return getMaterialReferenceById(materialId)?.definition ?? null;
}

export function getMaterialById(materialId: number | null | undefined): [string, MaterialDefinition] | null {
  const reference = getMaterialReferenceById(materialId);
  return reference ? [reference.displayName, reference.definition] : null;
}

/** Ausschließlich für Save-/Legacy-Migration und Kompatibilitätsgrenzen. */
export function getMaterialIdByName(displayName: string | null | undefined): number | null {
  if (!displayName) return null;
  return MATERIAL_IDS_BY_NAME[String(displayName)] ?? null;
}

export function getMaterialDisplayNameById(materialId: number | null | undefined): string | null {
  return getMaterialReferenceById(materialId)?.displayName ?? null;
}

export function reinforcementEffectTextById(materialId: number | null | undefined): string {
  const effect = getMaterialDefinitionById(materialId)?.specialEffect;
  if (!effect) return 'Kein Spezialeffekt';
  const percent = Math.round(Math.abs(effect.amount) * 100);
  if (effect.stat === 'DS') return `${effect.amount >= 0 ? '+' : '−'}${percent} Prozentpunkte DS`;
  return `${effect.amount >= 0 ? '+' : '−'}${percent} % ${effect.stat}`;
}

/** Legacy-Grenze: sichtbaren Namen einmalig auf ID auflösen, danach ID-Pfad verwenden. */
export function reinforcementEffectText(materialName: string | null | undefined): string {
  return reinforcementEffectTextById(getMaterialIdByName(materialName));
}

export function getDungeonMaterialDropWeightById(dungeonId: number, materialId: number | null | undefined): number | null {
  const reference = getMaterialReferenceById(materialId);
  const dungeon = baseline.DUNGEON_ENEMY_DEFINITIONS[Number(dungeonId)];
  if (!reference || !dungeon) return null;
  const used = Object.values(dungeon).some(enemy => enemy.lootMaterialIds.includes(reference.materialId));
  return used ? reference.definition.dungeonDropWeight : null;
}

function resolveSlotMaterialId(slot: BaselineWeaponSlot & { materialId?: number | null }): number | null {
  const referenceById = getMaterialReferenceById(slot.materialId);
  const legacyName = typeof slot.material === 'string' && slot.material ? slot.material : null;
  const legacyId = getMaterialIdByName(legacyName);
  if (referenceById && legacyId !== null && legacyId !== referenceById.materialId) {
    throw new Error(`Widersprüchliche Materialreferenz an Waffenslot ${String(slot.slot ?? '?')}: ${legacyName} verweist auf ID ${legacyId}, der Slot auf ID ${referenceById.materialId}.`);
  }
  return referenceById?.materialId ?? legacyId;
}

/** Normalisiert alte Slotnamen und migriert Materialnamen auf die kanonische materialId. */
export function normalizeWeaponSlots(slots: readonly WeaponSlot[] | null | undefined): WeaponSlot[] {
  return baseline.normalizeWeaponSlots(slots as readonly BaselineWeaponSlot[] | null | undefined).map(slot => {
    const materialId = resolveSlotMaterialId(slot);
    const normalized: WeaponSlot = { ...slot, materialId };
    delete normalized.material;
    return normalized;
  });
}

export function isWeaponSelectionComplete(slots: readonly WeaponSlot[] | null | undefined, weaponForm: string): boolean {
  const selected = new Map(normalizeWeaponSlots(slots).map(entry => [entry.slot, entry.materialId]));
  return baseline.getWeaponCraftingSlots(weaponForm).every(slot => Number.isInteger(Number(selected.get(slot))));
}

export function rarityFactor(slots: readonly WeaponSlot[] | null | undefined): number {
  const rarities = normalizeWeaponSlots(slots)
    .filter(entry => entry.slot !== 'baseMaterial')
    .map(entry => getMaterialDefinitionById(entry.materialId)?.rarity)
    .filter((value): value is number => Number.isFinite(value));
  return rarities.length ? Math.min(...rarities) : 1;
}

function createModifiers(overrides: Partial<CharacterStatModifiers> = {}): CharacterStatModifiers {
  return baseline.createStatModifiers(overrides);
}

function addModifiers(target: CharacterStatModifiers, source: Partial<CharacterStatModifiers>): void {
  (Object.keys(target) as CharacterModifierKey[]).forEach(key => { target[key] += Number(source[key]) || 0; });
}

function selectedMaterial(slots: readonly WeaponSlot[], slotId: string): MaterialDefinition | null {
  return getMaterialDefinitionById(slots.find(entry => entry.slot === slotId)?.materialId);
}

function partModifiers(part: WeaponPartRequirement, material: MaterialDefinition | null): CharacterStatModifiers {
  const modifiers = createModifiers();
  if (!material) return modifiers;
  for (const key of part.statKeys) modifiers[key] += Number(material.stats[key]) || 0;
  if (part.id === 'special' && material.specialEffect) {
    if (material.specialEffect.stat === 'P') modifiers.precision += material.specialEffect.amount;
    if (material.specialEffect.stat === 'DS') modifiers.penetration += material.specialEffect.amount;
  }
  return modifiers;
}

/** Waffenmodifikatoren werden ausschließlich über materialId aufgelöst. */
export function calculateWeaponCharacterModifiers(slots: readonly WeaponSlot[] | null | undefined, weaponForm: string): CharacterStatModifiers {
  const normalized = normalizeWeaponSlots(slots);
  const form = baseline.getWeaponForm(weaponForm);
  const modifiers = createModifiers(form.characterModifiers);
  for (const part of form.parts) addModifiers(modifiers, partModifiers(part, selectedMaterial(normalized, part.materialSlot)));
  modifiers.threat = 0;
  return modifiers;
}

/** Waffenwerte sind ID-nativ; Materialnamen werden weder gelesen noch in den Snapshot geschrieben. */
export function calculateWeaponStats(slots: readonly WeaponSlot[] | null | undefined, weaponForm: string): WeaponStats {
  const normalized = normalizeWeaponSlots(slots);
  const form = baseline.getWeaponForm(weaponForm);
  const modifiers = calculateWeaponCharacterModifiers(normalized, weaponForm);
  const workingPart = selectedMaterial(normalized, 'workingPart');
  const special = selectedMaterial(normalized, 'special');
  const specialEffect = special?.specialEffect ?? null;
  const specialSpeedFactor = specialEffect?.stat === 'GES' ? 1 + specialEffect.amount : 1;
  const reinforcementHitChanceAdd = specialEffect?.stat === 'P' ? specialEffect.amount : 0;
  const reinforcementPenetrationAdd = specialEffect?.stat === 'DS' ? specialEffect.amount : 0;
  const damagePerHit = form.baseDamage * Math.max(0, 1 + modifiers.strengthFactor);
  const attackSpeed = form.baseSpeed * Math.max(0.01, specialSpeedFactor);
  const hitChance = Math.max(0, Math.min(1, form.baseHitChance * Math.max(0, 1 + modifiers.precision)));
  const penetration = Math.max(0, Math.min(1, form.basePenetration + modifiers.penetration));
  return {
    weaponBaseDamage: form.baseDamage,
    weaponBaseSpeed: form.baseSpeed,
    weaponBaseHitChance: form.baseHitChance,
    weaponBasePenetration: form.basePenetration,
    characterModifiers: modifiers,
    specialSpeedFactor,
    baseDamage: form.baseDamage,
    baseSpeed: form.baseSpeed,
    bladeMultiplier: 1 + (workingPart?.stats.strengthFactor ?? 0),
    gripMultiplier: 1,
    specialMaterial: null,
    reinforcementMaterial: null,
    reinforcementSpeedFactor: specialSpeedFactor,
    reinforcementHitChanceAdd,
    reinforcementPenetrationAdd,
    hitChance,
    penetration,
    damagePerHit,
    attackSpeed,
    expectedRaw: damagePerHit * attackSpeed * hitChance,
    materialBaseDamage: form.baseDamage,
    materialBaseSpeed: form.baseSpeed,
    formDamageFactor: 1,
    formSpeedFactor: 1
  };
}

export const GAME_CORE_BRIDGE = {
  ...baseline.GAME_CORE_BRIDGE,
  getMaterialById,
  normalizeWeaponSlots,
  isWeaponSelectionComplete,
  rarityFactor,
  reinforcementEffectText,
  reinforcementEffectTextById,
  calculateWeaponCharacterModifiers,
  calculateWeaponStats
};

export { DATA_META, GENERATED_MATERIAL_KEYS as MATERIAL_KEYS };
export * from './game-core-v01310-baseline.ts';
