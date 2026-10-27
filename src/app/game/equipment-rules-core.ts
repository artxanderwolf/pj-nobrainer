import { GENERATED_CLASS_EQUIPMENT_RULES } from './data/generated/equipment-rules.generated.ts';
import { GENERATED_CONFIG } from './data/generated/game-data.generated.ts';

export interface EquipmentClassRule {
  weaponAllowed: boolean;
  dualWieldAllowed: boolean;
  weaponAndShieldAllowed: boolean;
  allowedWeaponForms: readonly string[];
  preferredWeaponForms: readonly string[];
  preferredPairForms: readonly string[];
  dualWieldDamageFactor: number;
  preferredDamageFactor: number;
}
export interface RulesWeapon { id: number; name?: string | null; weaponForm?: string | null; }
export interface RulesSlots { leftHand: number | null; rightHand: number | null; }
export interface RulesCharacter { id: number; name?: string; classId?: string | null; equipment: RulesSlots; }
export type EquipmentRestriction = 'weapon-not-found' | 'unknown-class' | 'unknown-weapon-form' | 'class-weapon-forbidden' | 'dual-wield-forbidden' | 'invalid-loadout';
export interface EquipmentRepair { characterId: number; characterName: string; weaponId: number | null; weaponName: string; reason: string; }

/** The still-active starter boundary has a known technical identity, never a name lookup. */
export function cloneStarterWeaponForEquipment(record: Record<string, unknown>): Record<string, unknown> {
  if (record['id'] !== 0 || record['starter'] !== true || record['weaponForm'] !== 'starter') throw new Error('Unbekannte Startwaffenreferenz.');
  return { ...JSON.parse(JSON.stringify(record)), weaponForm: 'sword' };
}

const RULES = GENERATED_CLASS_EQUIPMENT_RULES as unknown as Readonly<Record<string, EquipmentClassRule>>;
const FORMS = GENERATED_CONFIG.forge.weaponForms as Readonly<Record<string, { oneHanded: boolean }>>;

export function getClassEquipmentRule(classId: string | null | undefined): EquipmentClassRule | null {
  return classId && Object.prototype.hasOwnProperty.call(RULES, classId) ? RULES[classId] : null;
}
export function getKnownWeaponHandCount(form: string | null | undefined): 1 | 2 | null {
  if (!form || !Object.prototype.hasOwnProperty.call(FORMS, form)) return null;
  return FORMS[form].oneHanded ? 1 : 2;
}
export function getWeaponClassRestriction(classId: string | null | undefined, form: string | null | undefined): EquipmentRestriction | null {
  const rule = getClassEquipmentRule(classId);
  if (!rule) return 'unknown-class';
  if (getKnownWeaponHandCount(form) === null) return 'unknown-weapon-form';
  return rule.weaponAllowed && rule.allowedWeaponForms.includes(form!) ? null : 'class-weapon-forbidden';
}
export function getLoadoutRestriction(classId: string | null | undefined, weapons: readonly RulesWeapon[]): EquipmentRestriction | null {
  const rule = getClassEquipmentRule(classId);
  if (!rule) return 'unknown-class';
  for (const weapon of weapons) {
    const restriction = getWeaponClassRestriction(classId, weapon.weaponForm);
    if (restriction) return restriction;
  }
  const unique = [...new Map(weapons.map(weapon => [weapon.id, weapon])).values()];
  if (unique.length > 2) return 'invalid-loadout';
  if (unique.length === 2) {
    if (unique.some(weapon => getKnownWeaponHandCount(weapon.weaponForm) !== 1)) return 'invalid-loadout';
    if (!rule.dualWieldAllowed) return 'dual-wield-forbidden';
  }
  return null;
}
export function getCharacterWeaponDamageFactor(classId: string | null | undefined, weapons: readonly RulesWeapon[]): number {
  if (getLoadoutRestriction(classId, weapons)) return 0;
  const rule = getClassEquipmentRule(classId)!;
  const unique = [...new Map(weapons.map(weapon => [weapon.id, weapon])).values()];
  if (!unique.length) return 1;
  const dual = unique.length === 2;
  const pair = unique.map(weapon => weapon.weaponForm).sort().join('|');
  const preferred = dual
    ? rule.preferredPairForms.length === 2 && pair === [...rule.preferredPairForms].sort().join('|')
    : rule.preferredWeaponForms.includes(unique[0].weaponForm!);
  return (dual ? rule.dualWieldDamageFactor : 1) * (preferred ? rule.preferredDamageFactor : 1);
}
export function equipmentRestrictionText(reason: string): string {
  const messages: Record<string, string> = {
    'weapon-not-found': 'Diese konkrete Waffe ist nicht eindeutig im Lager vorhanden.',
    'unknown-class': 'Die Charakterklasse ist unbekannt.',
    'unknown-weapon-form': 'Die Waffenform ist unbekannt.',
    'class-weapon-forbidden': 'Diese Klasse darf diese Waffenart nicht tragen.',
    'dual-wield-forbidden': 'Nur Rekruten dürfen zwei Einhandwaffen tragen.',
    'invalid-loadout': 'Diese Ausrüstungskombination ist nicht erlaubt.',
    'weapon-in-use': 'Diese konkrete Waffe ist bereits bei einem anderen Charakter ausgerüstet.',
    'invalid-hand': 'Dieser Handplatz ist ungültig.',
    'character-not-found': 'Dieser Charakter ist nicht vorhanden.'
  };
  return messages[reason] ?? 'Diese Ausrüstung ist nicht möglich.';
}

/** Validate exact item identities before any mutation; both UIs use this policy. */
export function checkProjectedEquipment(character: RulesCharacter, weaponId: number, slots: RulesSlots, inventory: readonly RulesWeapon[]): EquipmentRestriction | null {
  if (!Number.isInteger(weaponId) || weaponId < 0 || inventory.filter(weapon => weapon.id === weaponId).length !== 1) return 'weapon-not-found';
  const ids = [...new Set([slots.leftHand, slots.rightHand].filter((id): id is number => id !== null))];
  const weapons: RulesWeapon[] = [];
  for (const id of ids) {
    const matches = inventory.filter(weapon => weapon.id === id);
    if (matches.length !== 1) return 'weapon-not-found';
    weapons.push(matches[0]);
  }
  return getLoadoutRestriction(character.classId, weapons);
}

/** Idempotent load/import repair. Inventory objects are never removed or cloned. */
export function sanitizeEquipmentLoadouts(characters: RulesCharacter[], inventory: readonly RulesWeapon[]): EquipmentRepair[] {
  const repairs: EquipmentRepair[] = [];
  const claimed = new Set<number>();
  for (const character of characters) {
    const before = { ...character.equipment };
    const next: RulesSlots = { leftHand: before.leftHand ?? null, rightHand: before.rightHand ?? null };
    const noted = new Set<number | null>();
    const note = (id: number | null, reason: string) => {
      if (noted.has(id)) return;
      noted.add(id);
      repairs.push({ characterId: character.id, characterName: character.name || 'Charakter', weaponId: id, weaponName: inventory.find(weapon => weapon.id === id)?.name || `Waffe #${id ?? '?'}`, reason });
    };
    const remove = (id: number, reason: string) => {
      if (next.leftHand === id) next.leftHand = null;
      if (next.rightHand === id) next.rightHand = null;
      note(id, reason);
    };
    for (const id of [...new Set([next.leftHand, next.rightHand].filter((value): value is number => value !== null))]) {
      const matches = inventory.filter(weapon => weapon.id === id);
      if (!Number.isInteger(id) || id < 0 || matches.length !== 1) { remove(id, equipmentRestrictionText('weapon-not-found')); continue; }
      const reason = getWeaponClassRestriction(character.classId, matches[0].weaponForm);
      if (reason) { remove(id, equipmentRestrictionText(reason)); continue; }
      if (claimed.has(id)) remove(id, equipmentRestrictionText('weapon-in-use'));
    }
    const ids = [...new Set([next.leftHand, next.rightHand].filter((id): id is number => id !== null))];
    const weapons = ids.map(id => inventory.find(weapon => weapon.id === id)!);
    const restriction = getLoadoutRestriction(character.classId, weapons);
    if (restriction && weapons.length) {
      for (const id of ids) remove(id, equipmentRestrictionText(restriction));
    } else if (weapons.length === 1) {
      const weapon = weapons[0];
      if (getKnownWeaponHandCount(weapon.weaponForm) === 2) {
        if (next.leftHand !== weapon.id || next.rightHand !== weapon.id) note(weapon.id, 'Die Zweihandwaffe wurde beiden Handplätzen zugeordnet.');
        next.leftHand = weapon.id; next.rightHand = weapon.id;
      } else if (next.leftHand === weapon.id && next.rightHand === weapon.id) {
        next.rightHand = null;
        note(weapon.id, 'Die doppelte Zuordnung derselben Einhandwaffe wurde bereinigt.');
      }
    }
    for (const id of [next.leftHand, next.rightHand]) if (id !== null) claimed.add(id);
    character.equipment = next;
  }
  return repairs;
}
