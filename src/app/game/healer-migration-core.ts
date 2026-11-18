import { HIGH_ELF_PERIODIC_INTERVAL_MS } from './high-elf-healing-core.ts';

/** Save24 -> Save25: preserve character IDs, stats, XP, equipped item IDs, team runs and loot. */
export function migrateLegacyHealers(state: Record<string, unknown>, now = Date.now()): boolean {
  let changed = false;
  const characters = Array.isArray(state['characters']) ? state['characters'] as Array<Record<string, unknown>> : [];
  for (const character of characters) {
    if (!character || typeof character !== 'object' || character['classId'] !== 'healer') continue;
    character['classId'] = 'scholar';
    character['raceId'] = 'high-elf';
    changed = true;
  }

  const teams = state['teams'];
  if (teams && typeof teams === 'object' && !Array.isArray(teams)) {
    for (const team of Object.values(teams as Record<string, Record<string, unknown>>)) {
      const run = team?.['dungeonRun'] as Record<string, unknown> | null;
      if (!run || typeof run !== 'object') continue;
      const enemies = Array.isArray(run['enemies']) ? run['enemies'] as Array<Record<string, unknown>> : [];
      for (const enemy of enemies) {
        if (!enemy || enemy['classId'] !== 'healer') continue;
        enemy['classId'] = 'scholar';
        if (typeof enemy['name'] === 'string') enemy['name'] = enemy['name'].replace(/Heiler/g, 'Gelehrter');
        // Preserve HP, stats, enemy ID, attack schedule, loot snapshot and XP on an active fight.
        changed = true;
      }
      const points = Array.isArray(run['attackPoints']) ? run['attackPoints'] as Array<Record<string, unknown>> : null;
      const participants = Array.isArray(run['participantIds']) ? run['participantIds'] as number[] : [];
      if (!points) continue;
      for (const id of participants) {
        const actor = characters.find(character => character['id'] === id);
        if (actor?.['raceId'] !== 'high-elf' || !['archer','scholar'].includes(String(actor['classId']))) continue;
        if (points.some(point => point['side'] === 'player' && point['ownerId'] === id && point['kind'] === 'race-heal')) continue;
        // Old ongoing encounters begin their new healing clock at load, not retroactively.
        points.push({side:'player',ownerId:id,kind:'race-heal',weaponId:null,label:'Hochelfen-Heilung',nextAt:now+HIGH_ELF_PERIODIC_INTERVAL_MS});
        changed = true;
      }
    }
  }

  const progress = state['releaseProgress'] as Record<string, unknown> | undefined;
  if (progress && Array.isArray(progress['notificationQueue'])) {
    const current = progress['notificationQueue'] as string[];
    const retained = current.filter(id => id !== 'healer');
    if (retained.length !== current.length) {
      progress['notificationQueue'] = retained;
      changed = true;
    }
  }
  // Keep legacy claimed.healer and healerDefeated as inert save history. They grant no unlocks.
  return changed;
}
