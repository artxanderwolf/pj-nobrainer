export interface DungeonPresentationEnemyLike {
  name: string;
  hp: number;
  maxHp: number;
  alive?: boolean;
}

export interface DungeonPresentationRunLike {
  enemies: DungeonPresentationEnemyLike[];
  participantIds: number[];
  energyShare: number;
}

export interface DungeonPresentationLootCollectLike {
  enemyCount: number;
}

export interface DungeonStatusPresentationInput {
  auto: boolean;
  selectedCharacterCount: number;
  run: DungeonPresentationRunLike | null;
  lootCollect: DungeonPresentationLootCollectLike | null;
  lootTotal: number;
}

export interface DungeonStatusEnemyPresentation {
  name: string;
  hpText: string;
}

export type DungeonStatusCardPresentation =
  | {
      mode: 'active';
      className: '';
      title: string;
      aliveText: string;
      metaText: string;
      enemies: DungeonStatusEnemyPresentation[];
    }
  | {
      mode: 'collecting' | 'searching';
      className: 'empty';
      title: string;
      detailText: string;
    }
  | {
      mode: 'idle';
      className: 'empty';
      text: string;
    };

export interface DungeonStatusPresentation {
  autoButtonText: string;
  autoButtonDisabled: boolean;
  collectButtonText: string;
  collectButtonDisabled: boolean;
  card: DungeonStatusCardPresentation;
}

export interface DungeonLootEntryLike {
  qty: number;
}

export interface DungeonLootEntryPresentation {
  name: string;
  quantityText: string;
}

export interface DungeonLootPresentation {
  empty: boolean;
  entries: DungeonLootEntryPresentation[];
}

export function getDungeonStatusPresentation(input: DungeonStatusPresentationInput): DungeonStatusPresentation {
  const selectedCharacterCount = Math.max(0, Number(input.selectedCharacterCount) || 0);
  const lootTotal = Math.max(0, Number(input.lootTotal) || 0);

  let card: DungeonStatusCardPresentation;
  if (input.run) {
    const enemies = Array.isArray(input.run.enemies) ? input.run.enemies : [];
    const aliveCount = enemies.filter(enemy => enemy.alive !== false && Number(enemy.hp) > 0).length;
    const participantCount = Array.isArray(input.run.participantIds) ? input.run.participantIds.length : 0;
    card = {
      mode: 'active',
      className: '',
      title: 'Welle aktiv',
      aliveText: `${aliveCount} / ${enemies.length} Gegner leben`,
      metaText: `${participantCount} Charakter${participantCount === 1 ? '' : 'e'} · ${input.run.energyShare} EN je Charakter · ${input.auto ? 'Automatik aktiv' : 'Automatik angehalten – diese Welle wird noch beendet'}`,
      enemies: enemies.map(enemy => ({
        name: enemy.name,
        hpText: `${Number(enemy.hp).toFixed(1)} / ${enemy.maxHp} HP`
      }))
    };
  } else if (input.lootCollect) {
    const enemyCount = Math.max(0, Number(input.lootCollect.enemyCount) || 0);
    card = {
      mode: 'collecting',
      className: 'empty',
      title: 'Beute wird eingesammelt …',
      detailText: `${enemyCount} Materialwurf${enemyCount === 1 ? '' : 'würfe'}`
    };
  } else if (input.auto) {
    card = {
      mode: 'searching',
      className: 'empty',
      title: 'Dungeon wird durchsucht …',
      detailText: '10 % Begegnungschance pro Sekunde · Energie erst bei Kampfbeginn'
    };
  } else {
    card = {
      mode: 'idle',
      className: 'empty',
      text: selectedCharacterCount > 0 ? 'Automatik angehalten.' : 'Kein Charakter zugewiesen.'
    };
  }

  return {
    autoButtonText: input.auto ? 'Automatik anhalten' : 'Automatik starten',
    autoButtonDisabled: !input.auto && selectedCharacterCount <= 0,
    collectButtonText: lootTotal > 0 ? `Einsammeln (${lootTotal})` : 'Einsammeln',
    collectButtonDisabled: lootTotal <= 0,
    card
  };
}

export function getDungeonLootPresentation(
  loot: Record<string, DungeonLootEntryLike | null | undefined>
): DungeonLootPresentation {
  const entries = Object.entries(loot ?? {})
    .filter(([, entry]) => Number(entry?.qty) > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, entry]) => ({
      name,
      quantityText: `×${Number(entry?.qty) || 0}`
    }));

  return {
    empty: entries.length === 0,
    entries
  };
}

export const DUNGEON_PRESENTATION_CORE_BRIDGE = {
  getDungeonStatusPresentation,
  getDungeonLootPresentation
};

export type DungeonPresentationCoreBridge = typeof DUNGEON_PRESENTATION_CORE_BRIDGE;
