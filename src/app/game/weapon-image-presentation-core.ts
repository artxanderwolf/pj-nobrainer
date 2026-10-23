import {
  WEAPON_FALLBACK_COLOR,
  WEAPON_OUTLINE_COLOR,
  getWeaponMaterialColorById
} from './weapon-material-colors.ts';

export type WeaponImageForm = 'dagger' | 'sword' | 'axe1h' | 'sword2h' | 'axe2h' | 'bow' | 'staff';
export type WeaponImageSlot = 'workingPart' | 'back' | 'gripCore' | 'gripWrap' | 'parry' | 'bowstring';
export type WeaponImageRenderMode = 'complete' | 'preview';
export type WeaponImageRenderKind = 'materials' | 'form-fallback' | 'generic-fallback';

export interface WeaponImageSlotLike {
  slot?: string | null;
  materialId?: number | null;
}

export interface WeaponImageLike {
  weaponForm?: string | null;
  slots?: readonly WeaponImageSlotLike[] | null;
  starter?: boolean | null;
}

export interface WeaponImageLayerPresentation {
  slot: WeaponImageSlot;
  materialId: number | null;
  color: string;
  atlasCell: number;
  fallback: boolean;
}

export interface WeaponImageRenderPlan {
  kind: WeaponImageRenderKind;
  weaponForm: WeaponImageForm | null;
  outlineColor: string;
  outlineAtlasCell: 1;
  silhouetteColor: string | null;
  silhouetteAtlasCell: 0;
  layers: readonly WeaponImageLayerPresentation[];
  fallbackReason: 'starter' | 'unknown-form' | 'invalid-slots' | null;
}

export const WEAPON_MASK_ATLAS_CELL_INDEX = Object.freeze({
  silhouette: 0,
  outline: 1,
  workingPart: 2,
  back: 3,
  gripCore: 4,
  gripWrap: 5,
  parry: 6,
  bowstring: 7
}) as const;

export const VISIBLE_WEAPON_IMAGE_SLOTS_BY_FORM = Object.freeze({
  dagger: Object.freeze(['workingPart', 'back', 'gripCore', 'gripWrap']),
  sword: Object.freeze(['workingPart', 'back', 'gripCore', 'gripWrap', 'parry']),
  axe1h: Object.freeze(['workingPart', 'back', 'gripCore', 'gripWrap']),
  sword2h: Object.freeze(['workingPart', 'back', 'gripCore', 'gripWrap', 'parry']),
  axe2h: Object.freeze(['workingPart', 'back', 'gripCore', 'gripWrap']),
  bow: Object.freeze(['back', 'gripCore', 'gripWrap', 'bowstring']),
  staff: Object.freeze(['back', 'gripCore', 'gripWrap'])
}) as Readonly<Record<WeaponImageForm, readonly WeaponImageSlot[]>>;

const WEAPON_IMAGE_FORMS = new Set<WeaponImageForm>(Object.keys(VISIBLE_WEAPON_IMAGE_SLOTS_BY_FORM) as WeaponImageForm[]);

export function resolveWeaponImageForm(weaponForm: string | null | undefined): WeaponImageForm | null {
  const resolved = String(weaponForm ?? '') as WeaponImageForm;
  return WEAPON_IMAGE_FORMS.has(resolved) ? resolved : null;
}

export function getVisibleWeaponImageSlots(weaponForm: string | null | undefined): readonly WeaponImageSlot[] {
  const resolved = resolveWeaponImageForm(weaponForm);
  return resolved ? VISIBLE_WEAPON_IMAGE_SLOTS_BY_FORM[resolved] : [];
}

function formFallback(weaponForm: WeaponImageForm, reason: 'starter' | 'invalid-slots'): WeaponImageRenderPlan {
  return {
    kind: 'form-fallback',
    weaponForm,
    outlineColor: WEAPON_OUTLINE_COLOR,
    outlineAtlasCell: WEAPON_MASK_ATLAS_CELL_INDEX.outline,
    silhouetteColor: WEAPON_FALLBACK_COLOR,
    silhouetteAtlasCell: WEAPON_MASK_ATLAS_CELL_INDEX.silhouette,
    layers: [],
    fallbackReason: reason
  };
}

function genericFallback(): WeaponImageRenderPlan {
  return {
    kind: 'generic-fallback',
    weaponForm: null,
    outlineColor: WEAPON_OUTLINE_COLOR,
    outlineAtlasCell: WEAPON_MASK_ATLAS_CELL_INDEX.outline,
    silhouetteColor: WEAPON_FALLBACK_COLOR,
    silhouetteAtlasCell: WEAPON_MASK_ATLAS_CELL_INDEX.silhouette,
    layers: [],
    fallbackReason: 'unknown-form'
  };
}

function collectVisibleSlotMaterials(
  slots: readonly WeaponImageSlotLike[] | null | undefined,
  visibleSlots: readonly WeaponImageSlot[]
): { materials: Map<WeaponImageSlot, number | null>; valid: boolean } {
  const visible = new Set<WeaponImageSlot>(visibleSlots);
  const materials = new Map<WeaponImageSlot, number | null>();
  let valid = true;

  for (const entry of slots ?? []) {
    if (!visible.has(entry.slot as WeaponImageSlot)) continue;
    const slot = entry.slot as WeaponImageSlot;
    if (materials.has(slot)) {
      valid = false;
      continue;
    }
    const materialId = Number(entry.materialId);
    materials.set(slot, Number.isInteger(materialId) && materialId > 0 ? materialId : null);
  }

  return { materials, valid };
}

export function getWeaponImageRenderPlan(
  weapon: WeaponImageLike,
  mode: WeaponImageRenderMode = 'complete'
): WeaponImageRenderPlan {
  const weaponForm = resolveWeaponImageForm(weapon.weaponForm);
  if (!weaponForm) return genericFallback();
  if (weapon.starter) return formFallback(weaponForm, 'starter');

  const visibleSlots = VISIBLE_WEAPON_IMAGE_SLOTS_BY_FORM[weaponForm];
  const { materials, valid } = collectVisibleSlotMaterials(weapon.slots, visibleSlots);
  if (!valid) return formFallback(weaponForm, 'invalid-slots');

  const layers: WeaponImageLayerPresentation[] = [];
  let complete = true;

  for (const slot of visibleSlots) {
    const materialId = materials.get(slot) ?? null;
    const materialColor = getWeaponMaterialColorById(materialId);
    if (!materialColor) complete = false;
    layers.push({
      slot,
      materialId,
      color: materialColor ?? WEAPON_FALLBACK_COLOR,
      atlasCell: WEAPON_MASK_ATLAS_CELL_INDEX[slot],
      fallback: materialColor === null
    });
  }

  if (mode === 'complete' && !complete) return formFallback(weaponForm, 'invalid-slots');

  return {
    kind: 'materials',
    weaponForm,
    outlineColor: WEAPON_OUTLINE_COLOR,
    outlineAtlasCell: WEAPON_MASK_ATLAS_CELL_INDEX.outline,
    silhouetteColor: null,
    silhouetteAtlasCell: WEAPON_MASK_ATLAS_CELL_INDEX.silhouette,
    layers,
    fallbackReason: null
  };
}
