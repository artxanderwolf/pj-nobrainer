export type CharacterClassId = 'recruit' | 'fighter' | 'archer' | 'scholar';
export type MaterialCategory = 'Holz' | 'Metall' | 'Leder';
export type WeaponSlotId = 'baseMaterial' | 'blade' | 'back' | 'gripShape' | 'gripMaterial' | 'reinforcementMaterial';

export interface CharacterClassDefinition {
  id: CharacterClassId;
  name: string;
  maxHp: number;
  maxEnergy: number;
  dodge: number;
  armor: number;
  strengthFactor: number;
  precision: number;
  energyRegenPerMinute: number;
  distance: number;
  role: string;
}

export interface ReinforcementEffect {
  speedFactor?: number;
  hitChanceAdd?: number;
  penetrationAdd?: number;
}

export interface MaterialDefinition {
  category: MaterialCategory;
  rarity: number;
  baseDamage: number | null;
  baseSpeed: number | null;
  blade: number | null;
  penetration: number | null;
  gripSpeed: number | null;
  hitChance: number | null;
  reinforcement: ReinforcementEffect | null;
}

export interface WeaponFormDefinition {
  name: string;
  timeFactor: number;
  damageFactor: number;
  speedFactor: number;
}

export interface WeaponSlot {
  slot?: WeaponSlotId | string;
  material?: string | null;
  [key: string]: unknown;
}

export interface WeaponStats {
  materialBaseDamage: number;
  materialBaseSpeed: number;
  formDamageFactor: number;
  formSpeedFactor: number;
  baseDamage: number;
  baseSpeed: number;
  bladeMultiplier: number;
  gripMultiplier: number;
  reinforcementMaterial: string | null;
  reinforcementSpeedFactor: number;
  reinforcementHitChanceAdd: number;
  reinforcementPenetrationAdd: number;
  hitChance: number;
  penetration: number;
  damagePerHit: number;
  attackSpeed: number;
  expectedRaw: number;
}

export interface WeaponLike {
  stats?: Partial<WeaponStats> | null;
}

export interface CharacterOffenseLike {
  strengthFactor?: number | null;
  precision?: number | null;
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
      dagger: { name: 'Dolch', timeFactor: 0.5, damageFactor: 0.6, speedFactor: 1.4 },
      sword: { name: 'Einhänder', timeFactor: 1.0, damageFactor: 1.0, speedFactor: 1.0 }
    } as Record<string, WeaponFormDefinition>
  }
};

export const CHARACTER_CLASSES: Record<CharacterClassId, CharacterClassDefinition> = {
  recruit: { id: 'recruit', name: 'Rekrut', maxHp: 30, maxEnergy: 100, dodge: 0.10, armor: 2, strengthFactor: 1.00, precision: 1.00, energyRegenPerMinute: 5, distance: 2, role: 'Basis' },
  fighter: { id: 'fighter', name: 'Kämpfer', maxHp: 35, maxEnergy: 100, dodge: 0.08, armor: 3, strengthFactor: 1.10, precision: 0.95, energyRegenPerMinute: 5, distance: 1, role: 'Nahkampf' },
  archer: { id: 'archer', name: 'Bogner', maxHp: 26, maxEnergy: 100, dodge: 0.15, armor: 1, strengthFactor: 0.95, precision: 1.15, energyRegenPerMinute: 5, distance: 3, role: 'Fernkampf' },
  scholar: { id: 'scholar', name: 'Gelehrter', maxHp: 22, maxEnergy: 100, dodge: 0.05, armor: 0, strengthFactor: 1.15, precision: 1.10, energyRegenPerMinute: 5, distance: 4, role: 'Magie' }
};

export const MATERIAL_SALE_RARITY_BONUS: Record<number, number> = {
  1: 0,
  2: 0.1,
  3: 0.2,
  4: 0.4,
  5: 0.8,
  6: 1.6
};

export const MATERIALS: Record<string, MaterialDefinition> = {
  'Morsche Fichte': {
    category: 'Holz', rarity: 1,
    baseDamage: 7, baseSpeed: 1.1,
    blade: null, penetration: null, gripSpeed: 1.0, hitChance: null,
    reinforcement: { penetrationAdd: -0.05 }
  },
  Fichte: {
    category: 'Holz', rarity: 1,
    baseDamage: 8, baseSpeed: 0.9,
    blade: null, penetration: null, gripSpeed: 1.2, hitChance: null,
    reinforcement: null
  },
  Tanne: {
    category: 'Holz', rarity: 2,
    baseDamage: 13, baseSpeed: 1.2,
    blade: null, penetration: null, gripSpeed: 1.4, hitChance: null,
    reinforcement: { speedFactor: 1.10 }
  },
  Zinn: {
    category: 'Metall', rarity: 1,
    baseDamage: 9, baseSpeed: 0.8,
    blade: 1.0, penetration: 0.10, gripSpeed: null, hitChance: null,
    reinforcement: null
  },
  Kupfer: {
    category: 'Metall', rarity: 1,
    baseDamage: 10, baseSpeed: 1.0,
    blade: 1.2, penetration: 0.20, gripSpeed: null, hitChance: null,
    reinforcement: { penetrationAdd: 0.10 }
  },
  Aluminium: {
    category: 'Metall', rarity: 2,
    baseDamage: 15, baseSpeed: 1.2,
    blade: 1.4, penetration: 0.30, gripSpeed: null, hitChance: null,
    reinforcement: { speedFactor: 1.10 }
  },
  'Hasen-Leder': {
    category: 'Leder', rarity: 2,
    baseDamage: null, baseSpeed: null,
    blade: null, penetration: null, gripSpeed: null, hitChance: 0.55,
    reinforcement: { hitChanceAdd: 0.05 }
  },
  'Fuchs-Leder': {
    category: 'Leder', rarity: 2,
    baseDamage: null, baseSpeed: null,
    blade: null, penetration: null, gripSpeed: null, hitChance: 0.60,
    reinforcement: { hitChanceAdd: 0.10 }
  },
  Lederfetzen: {
    category: 'Leder', rarity: 1,
    baseDamage: null, baseSpeed: null,
    blade: null, penetration: null, gripSpeed: null, hitChance: 0.50,
    reinforcement: null
  }
};

export const DUNGEON_LOOT_TABLES = {
  1: {
    categories: [
      { name: 'Holz', weight: 1, items: [
        { name: 'Morsche Fichte', chance: 81 },
        { name: 'Fichte', chance: 11 },
        { name: 'Tanne', chance: 8 }
      ] },
      { name: 'Metall', weight: 1, items: [
        { name: 'Zinn', chance: 81 },
        { name: 'Kupfer', chance: 11 },
        { name: 'Aluminium', chance: 8 }
      ] },
      { name: 'Leder', weight: 1, items: [
        { name: 'Lederfetzen', chance: 80 },
        { name: 'Hasen-Leder', chance: 12 },
        { name: 'Fuchs-Leder', chance: 8 }
      ] }
    ]
  }
};

const LEGACY_WEAPON_SLOT_IDS: Record<string, WeaponSlotId> = {
  Waffentyp: 'baseMaterial',
  Schneide: 'blade',
  Rückseite: 'back',
  Griffform: 'gripShape',
  Griffmaterial: 'gripMaterial',
  Verstärkungsmaterial: 'reinforcementMaterial',
  Hauptmaterial: 'reinforcementMaterial'
};

export function normalizeWeaponSlots(slots: readonly WeaponSlot[] | null | undefined): WeaponSlot[] {
  if (!Array.isArray(slots)) {
    return [];
  }
  return slots.map((entry) => ({
    ...entry,
    slot: LEGACY_WEAPON_SLOT_IDS[String(entry?.slot ?? '')] ?? entry?.slot
  }));
}

export function rarityFactor(slots: readonly WeaponSlot[] | null | undefined): number {
  const rarities = normalizeWeaponSlots(slots)
    .map((entry) => MATERIALS[entry.material ?? '']?.rarity)
    .filter((value): value is number => Number.isFinite(value));
  return rarities.length ? Math.min(...rarities) : 1;
}

export function reinforcementEffectText(materialName: string | null | undefined): string {
  const effect = MATERIALS[materialName ?? '']?.reinforcement;
  if (!effect) {
    return 'Kein Zusatzeffekt';
  }

  const parts: string[] = [];
  if (effect.speedFactor && Math.abs(effect.speedFactor - 1) > 1e-9) {
    parts.push(`${effect.speedFactor > 1 ? '+' : '−'}${Math.round(Math.abs(effect.speedFactor - 1) * 100)} % GES`);
  }
  if (effect.hitChanceAdd) {
    parts.push(`${effect.hitChanceAdd > 0 ? '+' : '−'}${Math.round(Math.abs(effect.hitChanceAdd) * 100)} Prozentpunkte TRF`);
  }
  if (effect.penetrationAdd) {
    parts.push(`${effect.penetrationAdd > 0 ? '+' : '−'}${Math.round(Math.abs(effect.penetrationAdd) * 100)} Prozentpunkte DS`);
  }
  return parts.length ? parts.join(' · ') : 'Kein Zusatzeffekt';
}

export function calculateWeaponStats(slots: readonly WeaponSlot[] | null | undefined, weaponForm: string): WeaponStats {
  const normalized = normalizeWeaponSlots(slots);
  const bySlot = Object.fromEntries(normalized.map((entry) => [entry.slot, MATERIALS[entry.material ?? '']]));
  const materialBySlot = Object.fromEntries(normalized.map((entry) => [entry.slot, entry.material]));
  const baseMaterial = bySlot['baseMaterial'] ?? {};
  const blade = bySlot['blade'] ?? {};
  const back = bySlot['back'] ?? {};
  const gripShape = bySlot['gripShape'] ?? {};
  const gripMaterial = bySlot['gripMaterial'] ?? {};
  const reinforcementMaterial = bySlot['reinforcementMaterial'] ?? {};
  const reinforcementEffect = reinforcementMaterial.reinforcement ?? {};
  const form = CONFIG.forge.weaponForms[weaponForm] ?? CONFIG.forge.weaponForms['sword'];

  const materialBaseDamage = baseMaterial.baseDamage ?? 0;
  const materialBaseSpeed = baseMaterial.baseSpeed ?? 0;
  const baseDamage = materialBaseDamage * (form.damageFactor ?? 1);
  const baseSpeed = materialBaseSpeed * (form.speedFactor ?? 1);
  const bladeMultiplier = blade.blade ?? 1;
  const gripMultiplier = gripShape.gripSpeed ?? 1;
  const reinforcementSpeedFactor = reinforcementEffect.speedFactor ?? 1;
  const reinforcementHitChanceAdd = reinforcementEffect.hitChanceAdd ?? 0;
  const reinforcementPenetrationAdd = reinforcementEffect.penetrationAdd ?? 0;
  const damagePerHit = baseDamage * bladeMultiplier;
  const attackSpeed = baseSpeed * gripMultiplier * reinforcementSpeedFactor;
  const hitChance = Math.max(0, Math.min(1, (gripMaterial.hitChance ?? 0) + reinforcementHitChanceAdd));
  const penetration = Math.max(0, Math.min(1, (back.penetration ?? 0) + reinforcementPenetrationAdd));
  const expectedRaw = damagePerHit * attackSpeed * hitChance;

  return {
    materialBaseDamage,
    materialBaseSpeed,
    formDamageFactor: form.damageFactor ?? 1,
    formSpeedFactor: form.speedFactor ?? 1,
    baseDamage,
    baseSpeed,
    bladeMultiplier,
    gripMultiplier,
    reinforcementMaterial: typeof materialBySlot['reinforcementMaterial'] === 'string' ? materialBySlot['reinforcementMaterial'] : null,
    reinforcementSpeedFactor,
    reinforcementHitChanceAdd,
    reinforcementPenetrationAdd,
    hitChance,
    penetration,
    damagePerHit,
    attackSpeed,
    expectedRaw
  };
}

export function weaponDamageAfterArmor(
  weapon: WeaponLike | null | undefined,
  enemyArmor: number | undefined = (CONFIG.dungeon as { enemyArmor?: number }).enemyArmor,
  character: CharacterOffenseLike | null = null
): WeaponDamageResult {
  const numericArmor = Number(enemyArmor);
  if (!weapon) {
    return {
      raw: 0,
      penetration: 0,
      effectiveArmor: enemyArmor,
      reduction: numericArmor / (numericArmor + 100),
      afterArmor: 0,
      damagePerHit: 0,
      attackSpeed: 0,
      hitChance: 0
    };
  }

  const strength = character?.strengthFactor ?? 1;
  const precision = character?.precision ?? 1;
  const damagePerHit = (weapon.stats?.damagePerHit ?? 0) * strength;
  const attackSpeed = weapon.stats?.attackSpeed ?? 0;
  const hitChance = (weapon.stats?.hitChance ?? 0) * precision;
  const raw = damagePerHit * attackSpeed * hitChance;
  const penetration = weapon.stats?.penetration ?? 0;
  const effectiveArmor = numericArmor * (1 - penetration);
  const reduction = effectiveArmor / (effectiveArmor + 100);
  const afterArmor = raw * (1 - reduction);
  return { raw, penetration, effectiveArmor, reduction, afterArmor, damagePerHit, attackSpeed, hitChance };
}

export const GAME_CORE_BRIDGE = {
  CONFIG,
  CHARACTER_CLASSES,
  MATERIAL_SALE_RARITY_BONUS,
  MATERIALS,
  DUNGEON_LOOT_TABLES,
  normalizeWeaponSlots,
  rarityFactor,
  reinforcementEffectText,
  calculateWeaponStats,
  weaponDamageAfterArmor
};

export type GameCoreBridge = typeof GAME_CORE_BRIDGE;
