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
  9: '#705340',  // Lederfetzen
  10: '#8B6B45',
  11: '#5C4633',
  12: '#A65F3A',
  13: '#2FA58A',
  14: '#5A4632',
  15: '#493A32',
  16: '#4A525C',
  17: '#355C9A',
  18: '#C59B62',
  19: '#70472E',
  20: '#78838C',
  21: '#30334D',
  22: '#D6C7A0',
  23: '#C87552',
  24: '#413A63',
  25: '#C5B358',
  26: '#7A543C',
  27: '#4D5B3A',
  28: '#3D8B69',
  29: '#B83D6D',
  30: '#69604F',
  31: '#6E4B3A',
  32: '#7A7445',
  33: '#35624A',
  34: '#D7D2B8',
  35: '#9A6B44',
  36: '#5B8A72',
  37: '#6F5A7E',
  38: '#9AB6A0',
  39: '#C98A3D',
  40: '#7B496B',
  41: '#A9B6C2',
  42: '#7B746A',
  43: '#5D524B',
  44: '#9B7B4D',
  45: '#7567B7',
  46: '#615A4C',
  47: '#6D6258',
  48: '#69737D',
  49: '#A0784D',
  50: '#7C5C46',
  51: '#66574E',
  52: '#8A7265',
  53: '#4F5358',
  54: '#B5AFA3',
  55: '#A06AAE',
  56: '#6A7D8C',
  57: '#4A6FA5',
  58: '#B8C7A7',
  59: '#D7C3B8',
  60: '#C77B8B',
  61: '#AAB7BF',
  62: '#C8B88A',
  63: '#D6C1A3',
  64: '#D29A55',
  65: '#6A73B5',
  66: '#9E8F6A',
  67: '#B9A27E',
  68: '#C5CBD4',
  69: '#D7B23E',
  70: '#8CB7B0',
  71: '#B9875A',
  72: '#91A8C4',
  73: '#2AA7C8',
  74: '#E0D9B3',
  75: '#8C6CB0',
  76: '#D47FA6',
  77: '#D2A84B',
}) as Readonly<Record<number, string>>;

export function getWeaponMaterialColorById(materialId: number | null | undefined): string | null {
  const resolved = Number(materialId);
  if (!Number.isInteger(resolved) || resolved <= 0) return null;
  return WEAPON_MATERIAL_COLORS_BY_ID[resolved] ?? null;
}
