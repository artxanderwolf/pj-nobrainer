export const WEAPON_FALLBACK_COLOR = '#8A8A8A';
export const WEAPON_OUTLINE_COLOR = '#000000';

/**
 * Verbindliche Waffen-Darstellungsfarben nach stabiler materialId.
 * Anzeigenamen sind bewusst keine technischen Schlüssel.
 */
export const WEAPON_MATERIAL_COLORS_BY_ID = Object.freeze({
  1: '#6A4B31', // Morsche Fichte
  2: '#7E5835', // Fichte
  3: '#946038', // Tanne
  4: '#9AA3B0', // Zinn
  5: '#B66A47', // Kupfer
  6: '#AAB6C2', // Aluminium
  7: '#7D5B43', // Hasen-Leder
  8: '#9B5A32', // Fuchs-Leder
  9: '#705340'  // Lederfetzen
}) as Readonly<Record<number, string>>;

export function getWeaponMaterialColorById(materialId: number | null | undefined): string | null {
  const resolved = Number(materialId);
  if (!Number.isInteger(resolved) || resolved <= 0) return null;
  return WEAPON_MATERIAL_COLORS_BY_ID[resolved] ?? null;
}
