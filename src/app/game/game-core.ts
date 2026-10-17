import { clampArmorPercent, resolveArmor } from './armor-core.ts';

export type CharacterClassId = 'recruit' | 'fighter' | 'archer' | 'scholar';
export type MaterialCategory = 'Holz' | 'Metall' | 'Leder';
export type WeaponSlotId = 'baseMaterial' | 'workingPart' | 'back' | 'gripCore' | 'gripWrap' | 'special' | 'parry' | 'bowstring';
export type WeaponPartId = 'workingPart' | 'back' | 'gripCore' | 'gripWrap' | 'special' | 'parry' | 'bowstring';
export type WeaponCraftingSlotId = Exclude<WeaponSlotId, 'baseMaterial'>;
export type SpecialEffectStat = 'GES' | 'P' | 'DS';

export interface CharacterStatModifiers {
  hp: number;
  energy: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
  threat: number;
  critChance: number;
  critDamage: number;
  hpRegenPerMinute: number;
  energyRegenPerMinute: number;
  experienceFactor: number;
  lifeSteal: number;
  penetration: number;
}

export type CharacterModifierKey = keyof CharacterStatModifiers;

export interface CharacterClassDefinition {
  id: CharacterClassId;
  name: string;
  maxHp: number;
  maxEnergy: number;
  dodge: number;
  armor: number;
  strengthFactor: number;
  precision: number;
  threat: number;
  critChance: number;
  critDamage: number;
  hpRegenPerMinute: number;
  energyRegenPerMinute: number;
  experienceFactor: number;
  lifeSteal: number;
  penetration: number;
  /** Nur für alte Kompatibilitätsstellen. Die aktive Zielwahl verwendet threat. */
  distance?: number;
  role: string;
}

export interface SpecialEffectDefinition {
  stat: SpecialEffectStat;
  amount: number;
}

/**
 * Übergangsstruktur für alten Runtime-Code. Neue Waffenlogik liest ausschließlich
 * stats + specialEffect. Die alten Felder bleiben vorerst vorhanden, damit noch
 * nicht migrierte reine Darstellungs-/Kompatibilitätsstellen nicht brechen.
 */
export interface ReinforcementEffect {
  speedFactor?: number;
  hitChanceAdd?: number;
  penetrationAdd?: number;
}

export interface MaterialDefinition {
  materialId: number;
  dungeonDropWeight: number;
  category: MaterialCategory;
  rarity: number;
  stats: CharacterStatModifiers;
  specialEffect: SpecialEffectDefinition | null;
  baseDamage: number | null;
  baseSpeed: number | null;
  blade: number | null;
  penetration: number | null;
  gripSpeed: number | null;
  hitChance: number | null;
  reinforcement: ReinforcementEffect | null;
}

export interface DungeonEnemyDefinition {
  name: string;
  lootMaterialIds: readonly number[];
  xpDrop: number;
}

export interface WeaponPartRequirement {
  id: WeaponPartId;
  label: string;
  materialSlot: WeaponCraftingSlotId;
  categories: readonly MaterialCategory[];
  quantity: number;
  statKeys: readonly CharacterModifierKey[];
}

export interface WeaponFormDefinition {
  name: string;
  /** Metadatum aus Bau_Logik: true = eine Hand, false = beide Hände. Kein Bauslot. */
  oneHanded: boolean;
  timeFactor: number;
  baseDamage: number;
  baseSpeed: number;
  baseHitChance: number;
  basePenetration: number;
  characterModifiers: CharacterStatModifiers;
  parts: readonly WeaponPartRequirement[];
  /** Legacy compatibility only. */
  damageFactor?: number;
  /** Legacy compatibility only. */
  speedFactor?: number;
}

export interface WeaponSlot {
  slot?: WeaponSlotId | string;
  material?: string | null;
  [key: string]: unknown;
}

export interface WeaponStats {
  weaponBaseDamage: number;
  weaponBaseSpeed: number;
  weaponBaseHitChance: number;
  weaponBasePenetration: number;
  characterModifiers: CharacterStatModifiers;
  specialSpeedFactor: number;
  baseDamage: number;
  baseSpeed: number;
  bladeMultiplier: number;
  gripMultiplier: number;
  specialMaterial: string | null;
  reinforcementMaterial: string | null;
  reinforcementSpeedFactor: number;
  reinforcementHitChanceAdd: number;
  reinforcementPenetrationAdd: number;
  hitChance: number;
  penetration: number;
  damagePerHit: number;
  attackSpeed: number;
  expectedRaw: number;
  /** Transitional aliases for older Angular presentation code and persisted snapshots. */
  materialBaseDamage: number;
  materialBaseSpeed: number;
  formDamageFactor: number;
  formSpeedFactor: number;
}

export interface WeaponLike {
  id?: number | null;
  weaponForm?: string | null;
  stats?: Partial<WeaponStats> | null;
}

export interface ResolvedCharacterStats {
  maxHp: number;
  maxEnergy: number;
  armor: number;
  dodge: number;
  strengthFactor: number;
  precision: number;
  threat: number;
  critChance: number;
  critDamage: number;
  hpRegenPerMinute: number;
  energyRegenPerMinute: number;
  experienceFactor: number;
  lifeSteal: number;
  penetration: number;
}

export interface CharacterOffenseLike {
  strengthFactor?: number | null;
  precision?: number | null;
  critChance?: number | null;
  critDamage?: number | null;
  penetration?: number | null;
}

export interface WeaponDamageResult {
  raw: number;
  penetration: number;
  effectiveArmor: number | undefined;
  reduction: number;
  afterArmor: number;
  damagePerHit: number;
  attackSpeed: number;
  hitChance: number;
  critChance: number;
  critDamage: number;
}

export interface StatDefinition {
  id: 'HP' | 'E' | 'R' | 'AW' | 'SF' | 'P' | 'B' | 'K-C' | 'K-S' | 'HP-R' | 'E-R' | 'ERF' | 'LR' | 'DS';
  key: CharacterModifierKey | 'maxHp' | 'maxEnergy';
  name: string;
  position: string;
}

export const STAT_DEFINITIONS: readonly StatDefinition[] = [
  { id: 'HP', key: 'maxHp', name: 'Lebenspunkte', position: 'S1L1' },
  { id: 'E', key: 'maxEnergy', name: 'Energie', position: 'S1R1' },
  { id: 'R', key: 'armor', name: 'Rüstung (%)', position: 'S1L2' },
  { id: 'AW', key: 'dodge', name: 'Ausweichen', position: 'S1R2' },
  { id: 'SF', key: 'strengthFactor', name: 'Schadensfaktor', position: 'S1L3' },
  { id: 'P', key: 'precision', name: 'Präzision', position: 'S1L4' },
  { id: 'B', key: 'threat', name: 'Bedrohung', position: 'S2L1' },
  { id: 'K-C', key: 'critChance', name: 'Krit-Chance', position: 'S1R3' },
  { id: 'K-S', key: 'critDamage', name: 'Krit-Schaden', position: 'S1R4' },
  { id: 'HP-R', key: 'hpRegenPerMinute', name: 'Lebenregeneration', position: 'S2L2' },
  { id: 'E-R', key: 'energyRegenPerMinute', name: 'Energieregeneration', position: 'S2R2' },
  { id: 'ERF', key: 'experienceFactor', name: 'Erfahrung', position: 'S2R3' },
  { id: 'LR', key: 'lifeSteal', name: 'Lebensraub', position: 'S2L3' },
  { id: 'DS', key: 'penetration', name: 'Durchschlag', position: 'S2R1' }
];

export function createStatModifiers(overrides: Partial<CharacterStatModifiers> = {}): CharacterStatModifiers {
  return {
    hp: 0,
    energy: 0,
    armor: 0,
    dodge: 0,
    strengthFactor: 0,
    precision: 0,
    threat: 0,
    critChance: 0,
    critDamage: 0,
    hpRegenPerMinute: 0,
    energyRegenPerMinute: 0,
    experienceFactor: 0,
    lifeSteal: 0,
    penetration: 0,
    ...overrides
  };
}

function addModifiers(target: CharacterStatModifiers, source: Partial<CharacterStatModifiers>): void {
  (Object.keys(target) as CharacterModifierKey[]).forEach(key => {
    target[key] += Number(source[key]) || 0;
  });
}

const WEAPON_PART_ORDER: readonly WeaponPartId[] = [
  'workingPart',
  'back',
  'gripCore',
  'gripWrap',
  'special',
  'parry',
  'bowstring'
];

const WEAPON_PART_TEMPLATES: Record<WeaponPartId, Omit<WeaponPartRequirement, 'quantity'>> = {
  workingPart: {
    id: 'workingPart', label: 'Schneide', materialSlot: 'workingPart', categories: ['Metall'], statKeys: ['strengthFactor']
  },
  back: {
    id: 'back', label: 'Kern', materialSlot: 'back', categories: ['Metall', 'Holz'], statKeys: ['armor']
  },
  gripCore: {
    id: 'gripCore', label: 'Griff', materialSlot: 'gripCore', categories: ['Holz'], statKeys: ['precision']
  },
  gripWrap: {
    id: 'gripWrap', label: 'Wicklung', materialSlot: 'gripWrap', categories: ['Leder'], statKeys: ['critChance']
  },
  special: {
    id: 'special', label: 'Spezial', materialSlot: 'special', categories: ['Metall', 'Holz', 'Leder'], statKeys: []
  },
  parry: {
    id: 'parry', label: 'Parierstange', materialSlot: 'parry', categories: ['Metall', 'Holz'], statKeys: ['armor', 'dodge']
  },
  bowstring: {
    id: 'bowstring', label: 'Sehne', materialSlot: 'bowstring', categories: ['Leder'], statKeys: ['strengthFactor', 'penetration']
  }
};

type WeaponRecipe = Partial<Record<WeaponPartId, number>>;

function buildWeaponParts(recipe: WeaponRecipe): readonly WeaponPartRequirement[] {
  return WEAPON_PART_ORDER
    .map(id => ({ ...WEAPON_PART_TEMPLATES[id], quantity: Math.max(0, Number(recipe[id]) || 0) }))
    .filter(part => part.quantity > 0);
}

export const CONFIG = {
  dungeon: {
    id: 1,
    energyCost: 4,
    enemyBase: { damage: 6, speed: 0.8, hitChance: 0.50, penetration: 0 },
    enemyMultipliers: { hp: 2.0, armor: 1, dodge: 1, damage: 1, speed: 1, hitChance: 1, penetration: 1 },
    encounterChance: 0.10,
    searchStepMs: 1000,
    lootCollectMs: 1000,
    enemyClassWeights: { recruit: 55, fighter: 20, archer: 15, scholar: 10 },
    enemyCountWeights: {
      1: [70, 20, 8, 2],
      2: [20, 60, 15, 5],
      3: [10, 20, 60, 10],
      4: [5, 10, 20, 65]
    }
  },
  energyRegenPerMinute: 5,
  market: { baseSeconds: 30, materialBaseNickel: 10 },
  tavern: { recruitBaseNickel: 200, recruitGrowth: 1.75 },
  upgrades: {
    inn: { baseCostNickel: 500, growth: 2.0, startCapacity: 2, maxCapacity: 10 },
    forgeSlots: { baseCostNickel: 1000, growth: 3.0, start: 1, max: 5 },
    forgeQueue: { baseCostNickel: 200, growth: 1.75, start: 1, max: 10 },
    marketSlots: { baseCostNickel: 1000, growth: 3.0, start: 1, max: 5 },
    marketQueue: { baseCostNickel: 200, growth: 1.75, start: 1, max: 10 }
  },
  forge: {
    baseSeconds: 30,
    weaponForms: {
      dagger: {
        name: 'Dolch', oneHanded: true, timeFactor: 0.5,
        baseDamage: 6, baseSpeed: 1.4, baseHitChance: 0.60, basePenetration: 0,
        characterModifiers: createStatModifiers({ dodge: 0.02, precision: 0.05, critChance: 0.03 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ workingPart: 1, back: 1, gripCore: 1, gripWrap: 1, special: 1 })
      },
      sword: {
        name: '1H Schwert', oneHanded: true, timeFactor: 1.0,
        baseDamage: 10, baseSpeed: 1.0, baseHitChance: 0.55, basePenetration: 0,
        characterModifiers: createStatModifiers({ armor: 1, strengthFactor: 0.05, critDamage: 0.10 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ workingPart: 2, back: 2, gripCore: 1, gripWrap: 1, special: 1, parry: 1 })
      },
      axe1h: {
        name: '1H Axt', oneHanded: true, timeFactor: 1.0,
        baseDamage: 12, baseSpeed: 0.85, baseHitChance: 0.52, basePenetration: 0,
        characterModifiers: createStatModifiers({ strengthFactor: 0.08, critDamage: 0.15, penetration: 0.05 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ workingPart: 1, back: 1, gripCore: 3, gripWrap: 2, special: 1 })
      },
      sword2h: {
        name: '2H Schwert', oneHanded: false, timeFactor: 1.75,
        baseDamage: 16, baseSpeed: 0.80, baseHitChance: 0.55, basePenetration: 0,
        characterModifiers: createStatModifiers({ armor: 2, strengthFactor: 0.10, critDamage: 0.15 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ workingPart: 4, back: 4, gripCore: 2, gripWrap: 1, special: 1, parry: 2 })
      },
      axe2h: {
        name: '2H Axt', oneHanded: false, timeFactor: 1.75,
        baseDamage: 20, baseSpeed: 0.70, baseHitChance: 0.50, basePenetration: 0,
        characterModifiers: createStatModifiers({ strengthFactor: 0.15, precision: -0.05, critDamage: 0.25, penetration: 0.10 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ workingPart: 2, back: 2, gripCore: 6, gripWrap: 3, special: 1 })
      },
      bow: {
        name: 'Bogen', oneHanded: false, timeFactor: 2.0,
        baseDamage: 11, baseSpeed: 0.90, baseHitChance: 0.65, basePenetration: 0,
        characterModifiers: createStatModifiers({ dodge: 0.02, precision: 0.10, critChance: 0.08 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ back: 1, gripCore: 5, gripWrap: 6, special: 1, bowstring: 3 })
      },
      staff: {
        name: 'Stab', oneHanded: false, timeFactor: 1.10,
        baseDamage: 10, baseSpeed: 1.00, baseHitChance: 0.60, basePenetration: 0,
        characterModifiers: createStatModifiers({ energy: 10, strengthFactor: 0.05, precision: 0.10, critDamage: 0.15 }),
        damageFactor: 1, speedFactor: 1,
        parts: buildWeaponParts({ back: 1, gripCore: 5, gripWrap: 2, special: 1 })
      }
    } as Record<string, WeaponFormDefinition>
  }
};

export const CHARACTER_CLASSES: Record<CharacterClassId, CharacterClassDefinition> = {
  recruit: {
    id: 'recruit', name: 'Rekrut', maxHp: 30, maxEnergy: 100, armor: 2, dodge: 0.10,
    strengthFactor: 1.00, precision: 1.00, threat: 50, critChance: 0.05, critDamage: 1.50,
    hpRegenPerMinute: 0, energyRegenPerMinute: 5, experienceFactor: 1.00, lifeSteal: 0, penetration: 0,
    distance: 2, role: 'Basis'
  },
  fighter: {
    id: 'fighter', name: 'Kämpfer', maxHp: 35, maxEnergy: 100, armor: 3, dodge: 0.08,
    strengthFactor: 1.10, precision: 0.95, threat: 100, critChance: 0.04, critDamage: 1.60,
    hpRegenPerMinute: 0, energyRegenPerMinute: 5, experienceFactor: 1.00, lifeSteal: 0, penetration: 0,
    distance: 1, role: 'Nahkampf'
  },
  archer: {
    id: 'archer', name: 'Bogner', maxHp: 26, maxEnergy: 100, armor: 1, dodge: 0.15,
    strengthFactor: 0.95, precision: 1.15, threat: 33, critChance: 0.10, critDamage: 1.50,
    hpRegenPerMinute: 0, energyRegenPerMinute: 5, experienceFactor: 1.00, lifeSteal: 0, penetration: 0,
    distance: 3, role: 'Fernkampf'
  },
  scholar: {
    id: 'scholar', name: 'Gelehrter', maxHp: 22, maxEnergy: 100, armor: 0, dodge: 0.05,
    strengthFactor: 1.15, precision: 1.10, threat: 25, critChance: 0.05, critDamage: 1.75,
    hpRegenPerMinute: 0, energyRegenPerMinute: 5, experienceFactor: 1.00, lifeSteal: 0, penetration: 0,
    distance: 4, role: 'Magie'
  }
};

export const MATERIAL_SALE_RARITY_BONUS: Record<number, number> = {
  1: 0,
  2: 0.1,
  3: 0.2,
  4: 0.4,
  5: 0.8,
  6: 1.6
};

function legacyReinforcement(effect: SpecialEffectDefinition | null): ReinforcementEffect | null {
  if (!effect) return null;
  if (effect.stat === 'GES') return { speedFactor: 1 + effect.amount };
  if (effect.stat === 'DS') return { penetrationAdd: effect.amount };
  if (effect.stat === 'P') return { hitChanceAdd: effect.amount };
  return null;
}

function material(
  materialId: number,
  category: MaterialCategory,
  rarity: number,
  stats: Partial<CharacterStatModifiers>,
  specialEffect: SpecialEffectDefinition | null,
  dungeonDropWeight: number
): MaterialDefinition {
  return {
    materialId,
    dungeonDropWeight,
    category,
    rarity,
    stats: createStatModifiers(stats),
    specialEffect,
    baseDamage: null,
    baseSpeed: null,
    blade: null,
    penetration: null,
    gripSpeed: null,
    hitChance: null,
    reinforcement: legacyReinforcement(specialEffect)
  };
}

export const MATERIALS: Record<string, MaterialDefinition> = {
  'Morsche Fichte': material(1, 'Holz', 1, { hp: 4 }, { stat: 'GES', amount: 0.05 }, 81),
  Fichte: material(2, 'Holz', 1, { hp: 5, armor: 1, dodge: 0.01, precision: 0.05 }, null, 8),
  Tanne: material(3, 'Holz', 2, { hp: 7, armor: 1, dodge: 0.02, precision: 0.10 }, { stat: 'GES', amount: 0.15 }, 2),
  Zinn: material(4, 'Metall', 1, { hp: 6, armor: 1 }, null, 81),
  Kupfer: material(5, 'Metall', 1, { hp: 8, armor: 2, strengthFactor: 0.05 }, { stat: 'DS', amount: 0.10 }, 8),
  Aluminium: material(6, 'Metall', 2, { hp: 9, armor: 2, dodge: 0.02, strengthFactor: 0.10 }, { stat: 'GES', amount: 0.10 }, 2),
  'Hasen-Leder': material(7, 'Leder', 1, { hp: 1, strengthFactor: 0.03, critChance: 0.02, penetration: 0.02 }, { stat: 'P', amount: 0.05 }, 8),
  'Fuchs-Leder': material(8, 'Leder', 2, { hp: 2, strengthFactor: 0.05, critChance: 0.04, penetration: 0.04 }, { stat: 'P', amount: 0.10 }, 2),
  Lederfetzen: material(9, 'Leder', 1, { hp: 3, strengthFactor: 0.01, critChance: 0.01, penetration: 0.01 }, null, 81)
};

export const DUNGEON_ENEMY_DEFINITIONS: Record<number, Record<CharacterClassId, DungeonEnemyDefinition>> = {
  1: {
    recruit: { name: 'Neuling', lootMaterialIds: [9, 5, 3], xpDrop: 10 },
    fighter: { name: 'Tank', lootMaterialIds: [9, 4, 6], xpDrop: 10 },
    archer: { name: 'Jäger', lootMaterialIds: [9, 8, 7], xpDrop: 10 },
    scholar: { name: 'Lehrling', lootMaterialIds: [9, 2, 1], xpDrop: 10 }
  }
};

/** Legacy-kompatible Übersicht. Aktive Dungeon-Drops verwenden die gegnerspezifischen Material-IDs. */
export const DUNGEON_LOOT_TABLES = {
  1: {
    categories: [
      { name: 'Holz', weight: 1, items: [
        { name: 'Morsche Fichte', chance: 81 },
        { name: 'Fichte', chance: 8 },
        { name: 'Tanne', chance: 2 }
      ] },
      { name: 'Metall', weight: 1, items: [
        { name: 'Zinn', chance: 81 },
        { name: 'Kupfer', chance: 8 },
        { name: 'Aluminium', chance: 2 }
      ] },
      { name: 'Leder', weight: 1, items: [
        { name: 'Lederfetzen', chance: 81 },
        { name: 'Hasen-Leder', chance: 8 },
        { name: 'Fuchs-Leder', chance: 2 }
      ] }
    ]
  }
};

export function getMaterialById(materialId: number | null | undefined): [string, MaterialDefinition] | null {
  const resolved = Number(materialId);
  if (!Number.isFinite(resolved)) return null;
  return Object.entries(MATERIALS).find(([, definition]) => definition.materialId === resolved) ?? null;
}

export function getDungeonEnemyDefinition(
  dungeonId: number,
  classId: CharacterClassId
): DungeonEnemyDefinition | null {
  return DUNGEON_ENEMY_DEFINITIONS[Number(dungeonId)]?.[classId] ?? null;
}

export function getDungeonMaterialDropWeight(dungeonId: number, materialName: string): number | null {
  const materialDefinition = MATERIALS[materialName];
  const dungeon = DUNGEON_ENEMY_DEFINITIONS[Number(dungeonId)];
  if (!materialDefinition || !dungeon) return null;
  const used = Object.values(dungeon).some(enemy => enemy.lootMaterialIds.includes(materialDefinition.materialId));
  return used ? materialDefinition.dungeonDropWeight : null;
}

const LEGACY_WEAPON_SLOT_IDS: Record<string, WeaponSlotId> = {
  Waffentyp: 'baseMaterial',
  baseMaterial: 'baseMaterial',
  Schneide: 'workingPart',
  blade: 'workingPart',
  workingPart: 'workingPart',
  Rückseite: 'back',
  Kern: 'back',
  back: 'back',
  Griffform: 'gripCore',
  Griff: 'gripCore',
  gripShape: 'gripCore',
  gripCore: 'gripCore',
  Griffmaterial: 'gripWrap',
  Wicklung: 'gripWrap',
  gripMaterial: 'gripWrap',
  gripWrap: 'gripWrap',
  Verstärkungsmaterial: 'special',
  Hauptmaterial: 'special',
  Spezial: 'special',
  reinforcementMaterial: 'special',
  special: 'special',
  Parierstange: 'parry',
  parry: 'parry',
  Sehne: 'bowstring',
  bowstring: 'bowstring'
};

export function normalizeWeaponSlots(slots: readonly WeaponSlot[] | null | undefined): WeaponSlot[] {
  if (!Array.isArray(slots)) return [];
  return slots.map((entry) => ({
    ...entry,
    slot: LEGACY_WEAPON_SLOT_IDS[String(entry?.slot ?? '')] ?? entry?.slot
  }));
}

export function getWeaponForm(weaponForm: string | null | undefined): WeaponFormDefinition {
  return CONFIG.forge.weaponForms[weaponForm ?? ''] ?? CONFIG.forge.weaponForms['sword'];
}

export function getWeaponHandCount(weaponForm: string | null | undefined): 1 | 2 {
  return getWeaponForm(weaponForm).oneHanded ? 1 : 2;
}

export function getWeaponCraftingSlots(weaponForm: string): WeaponCraftingSlotId[] {
  const slots: WeaponCraftingSlotId[] = [];
  for (const part of getWeaponForm(weaponForm).parts) {
    if (part.quantity > 0 && !slots.includes(part.materialSlot)) slots.push(part.materialSlot);
  }
  return slots;
}

export function getWeaponSelectionQuantity(weaponForm: string, slot: WeaponCraftingSlotId): number {
  return getWeaponForm(weaponForm).parts
    .filter((part) => part.materialSlot === slot)
    .reduce((sum, part) => sum + Math.max(0, Number(part.quantity) || 0), 0);
}

export function isWeaponSelectionComplete(slots: readonly WeaponSlot[] | null | undefined, weaponForm: string): boolean {
  const bySlot = new Map(normalizeWeaponSlots(slots).map((entry) => [entry.slot, entry.material]));
  return getWeaponCraftingSlots(weaponForm).every((slot) => Boolean(bySlot.get(slot)));
}

export function rarityFactor(slots: readonly WeaponSlot[] | null | undefined): number {
  const rarities = normalizeWeaponSlots(slots)
    .filter((entry) => entry.slot !== 'baseMaterial')
    .map((entry) => MATERIALS[entry.material ?? '']?.rarity)
    .filter((value): value is number => Number.isFinite(value));
  return rarities.length ? Math.min(...rarities) : 1;
}

export function reinforcementEffectText(materialName: string | null | undefined): string {
  const effect = MATERIALS[materialName ?? '']?.specialEffect;
  if (!effect) return 'Kein Spezialeffekt';
  const percent = Math.round(Math.abs(effect.amount) * 100);
  if (effect.stat === 'DS') return `${effect.amount >= 0 ? '+' : '−'}${percent} Prozentpunkte DS`;
  return `${effect.amount >= 0 ? '+' : '−'}${percent} % ${effect.stat}`;
}

function getSelectedMaterial(slots: readonly WeaponSlot[], slot: WeaponCraftingSlotId): MaterialDefinition | null {
  const entry = slots.find(candidate => candidate.slot === slot);
  return MATERIALS[entry?.material ?? ''] ?? null;
}

function getPartModifiers(part: WeaponPartRequirement, materialDefinition: MaterialDefinition | null): CharacterStatModifiers {
  const modifiers = createStatModifiers();
  if (!materialDefinition) return modifiers;
  for (const key of part.statKeys) modifiers[key] += Number(materialDefinition.stats[key]) || 0;
  if (part.id === 'special' && materialDefinition.specialEffect) {
    const effect = materialDefinition.specialEffect;
    if (effect.stat === 'P') modifiers.precision += effect.amount;
    if (effect.stat === 'DS') modifiers.penetration += effect.amount;
  }
  return modifiers;
}

export function calculateWeaponCharacterModifiers(
  slots: readonly WeaponSlot[] | null | undefined,
  weaponForm: string
): CharacterStatModifiers {
  const normalized = normalizeWeaponSlots(slots);
  const form = getWeaponForm(weaponForm);
  const modifiers = createStatModifiers(form.characterModifiers);
  for (const part of form.parts) {
    const materialDefinition = getSelectedMaterial(normalized, part.materialSlot);
    addModifiers(modifiers, getPartModifiers(part, materialDefinition));
  }
  // Bedrohung ist absichtlich ausschließlich eine Klasseneigenschaft.
  modifiers.threat = 0;
  return modifiers;
}

export function calculateWeaponStats(slots: readonly WeaponSlot[] | null | undefined, weaponForm: string): WeaponStats {
  const normalized = normalizeWeaponSlots(slots);
  const form = getWeaponForm(weaponForm);
  const modifiers = calculateWeaponCharacterModifiers(normalized, weaponForm);
  const workingPart = getSelectedMaterial(normalized, 'workingPart');
  const special = getSelectedMaterial(normalized, 'special');
  const specialEffect = special?.specialEffect ?? null;
  const specialSpeedFactor = specialEffect?.stat === 'GES' ? 1 + specialEffect.amount : 1;
  const reinforcementHitChanceAdd = specialEffect?.stat === 'P' ? specialEffect.amount : 0;
  const reinforcementPenetrationAdd = specialEffect?.stat === 'DS' ? specialEffect.amount : 0;
  const damagePerHit = form.baseDamage * Math.max(0, 1 + modifiers.strengthFactor);
  const attackSpeed = form.baseSpeed * Math.max(0.01, specialSpeedFactor);
  const hitChance = Math.max(0, Math.min(1, form.baseHitChance * Math.max(0, 1 + modifiers.precision)));
  const penetration = Math.max(0, Math.min(1, form.basePenetration + modifiers.penetration));
  const expectedRaw = damagePerHit * attackSpeed * hitChance;
  const specialEntry = normalized.find(entry => entry.slot === 'special');
  const specialMaterial = typeof specialEntry?.material === 'string' ? specialEntry.material : null;

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
    specialMaterial,
    reinforcementMaterial: specialMaterial,
    reinforcementSpeedFactor: specialSpeedFactor,
    reinforcementHitChanceAdd,
    reinforcementPenetrationAdd,
    hitChance,
    penetration,
    damagePerHit,
    attackSpeed,
    expectedRaw,
    materialBaseDamage: form.baseDamage,
    materialBaseSpeed: form.baseSpeed,
    formDamageFactor: 1,
    formSpeedFactor: 1
  };
}

export function calculateCharacterStats(
  classId: string | null | undefined,
  weapons: readonly WeaponLike[] = [],
  baseStatMultiplier = 1
): ResolvedCharacterStats {
  const resolvedId = classId && Object.prototype.hasOwnProperty.call(CHARACTER_CLASSES, classId)
    ? classId as CharacterClassId
    : 'recruit';
  const base = CHARACTER_CLASSES[resolvedId];
  const numericMultiplier = Number(baseStatMultiplier);
  const multiplier = Number.isFinite(numericMultiplier) && numericMultiplier > 0 ? numericMultiplier : 1;
  const scaled = (value: number): number => value === 0 ? 0 : value * multiplier;
  const equipment = createStatModifiers();
  const seenIds = new Set<number>();
  const seenWeapons = new Set<WeaponLike>();
  for (const weapon of weapons) {
    const id = Number(weapon.id);
    if (Number.isFinite(id)) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    } else {
      if (seenWeapons.has(weapon)) continue;
      seenWeapons.add(weapon);
    }
    addModifiers(equipment, weapon.stats?.characterModifiers ?? {});
  }

  return {
    maxHp: Math.max(1, scaled(base.maxHp) + equipment.hp),
    maxEnergy: Math.max(0, scaled(base.maxEnergy) + equipment.energy),
    armor: clampArmorPercent(scaled(base.armor) + equipment.armor),
    dodge: Math.max(0, Math.min(0.95, scaled(base.dodge) + equipment.dodge)),
    strengthFactor: Math.max(0, scaled(base.strengthFactor) + equipment.strengthFactor),
    precision: Math.max(0, scaled(base.precision) + equipment.precision),
    threat: Math.max(0.01, base.threat),
    critChance: Math.max(0, Math.min(1, scaled(base.critChance) + equipment.critChance)),
    critDamage: Math.max(1, scaled(base.critDamage) + equipment.critDamage),
    hpRegenPerMinute: Math.max(0, scaled(base.hpRegenPerMinute) + equipment.hpRegenPerMinute),
    energyRegenPerMinute: Math.max(0, scaled(base.energyRegenPerMinute) + equipment.energyRegenPerMinute),
    experienceFactor: Math.max(0, scaled(base.experienceFactor) + equipment.experienceFactor),
    lifeSteal: Math.max(0, Math.min(1, scaled(base.lifeSteal) + equipment.lifeSteal)),
    penetration: Math.max(0, Math.min(1, scaled(base.penetration) + equipment.penetration))
  };
}

export function weaponDamageAfterArmor(
  weapon: WeaponLike | null | undefined,
  enemyArmor: number | undefined = (CONFIG.dungeon as { enemyArmor?: number }).enemyArmor,
  character: CharacterOffenseLike | null = null
): WeaponDamageResult {
  const numericArmor = Number(enemyArmor);
  if (!weapon) {
    const armorResolution = resolveArmor(numericArmor, 0);
    return {
      raw: 0,
      penetration: 0,
      effectiveArmor: armorResolution.effectiveArmor,
      reduction: armorResolution.reduction,
      afterArmor: 0,
      damagePerHit: 0,
      attackSpeed: 0,
      hitChance: 0,
      critChance: 0,
      critDamage: 1
    };
  }

  const strength = Number(character?.strengthFactor) || 1;
  const precision = Number(character?.precision) || 1;
  const critChance = Math.max(0, Math.min(1, Number(character?.critChance) || 0));
  const critDamage = Math.max(1, Number(character?.critDamage) || 1);
  const baseDamage = Number(weapon.stats?.weaponBaseDamage ?? weapon.stats?.damagePerHit) || 0;
  const baseHitChance = Number(weapon.stats?.weaponBaseHitChance ?? weapon.stats?.hitChance) || 0;
  const damagePerHit = baseDamage * strength;
  const attackSpeed = Number(weapon.stats?.attackSpeed) || 0;
  const hitChance = Math.max(0, Math.min(1, baseHitChance * precision));
  const rawWithoutCrit = damagePerHit * attackSpeed * hitChance;
  const raw = rawWithoutCrit * (1 + critChance * (critDamage - 1));
  const penetration = Math.max(0, Math.min(1, Number(character?.penetration ?? weapon.stats?.penetration) || 0));
  const armorResolution = resolveArmor(numericArmor, penetration);
  const effectiveArmor = armorResolution.effectiveArmor;
  const reduction = armorResolution.reduction;
  const afterArmor = raw * (1 - reduction);
  return { raw, penetration, effectiveArmor, reduction, afterArmor, damagePerHit, attackSpeed, hitChance, critChance, critDamage };
}

export const GAME_CORE_BRIDGE = {
  CONFIG,
  CHARACTER_CLASSES,
  STAT_DEFINITIONS,
  MATERIAL_SALE_RARITY_BONUS,
  MATERIALS,
  DUNGEON_ENEMY_DEFINITIONS,
  DUNGEON_LOOT_TABLES,
  createStatModifiers,
  getMaterialById,
  getDungeonEnemyDefinition,
  getDungeonMaterialDropWeight,
  normalizeWeaponSlots,
  getWeaponForm,
  getWeaponHandCount,
  getWeaponCraftingSlots,
  getWeaponSelectionQuantity,
  isWeaponSelectionComplete,
  rarityFactor,
  reinforcementEffectText,
  calculateWeaponCharacterModifiers,
  calculateWeaponStats,
  calculateCharacterStats,
  weaponDamageAfterArmor
};

export type GameCoreBridge = typeof GAME_CORE_BRIDGE;
