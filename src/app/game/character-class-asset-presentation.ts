export type CharacterAssetId = 'recruit' | 'fighter' | 'archer' | 'scholar';

const CHARACTER_ASSET_IDS: readonly CharacterAssetId[] = ['recruit', 'fighter', 'archer', 'scholar'];

export function resolveCharacterAssetId(classId: string): CharacterAssetId {
  if (classId === 'healer') return 'scholar';
  return CHARACTER_ASSET_IDS.includes(classId as CharacterAssetId) ? classId as CharacterAssetId : 'recruit';
}
