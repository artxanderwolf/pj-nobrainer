export const NAVIGATION_ITEMS = [
  { id: 'base', title: 'Übersicht', sectionId: 'base' },
  { id: 'character', title: 'Charakter', sectionId: 'character' },
  { id: 'storage', title: 'Lager', sectionId: 'storage' },
  { id: 'dungeon', title: 'Dungeon', sectionId: 'dungeon' }
] as const;

export type MainNavigationPageId = (typeof NAVIGATION_ITEMS)[number]['id'];
export type NavigationSectionId = (typeof NAVIGATION_ITEMS)[number]['sectionId'];

export interface NavigationPresentation {
  pageId: string;
  title: string;
  parentPageId: string | null;
  sectionId: NavigationSectionId;
}

const SCREEN_PRESENTATIONS: Record<string, NavigationPresentation> = {
  base: { pageId: 'base', title: 'Übersicht', parentPageId: null, sectionId: 'base' },
  activity: { pageId: 'activity', title: 'Aktive Vorgänge', parentPageId: 'base', sectionId: 'base' },
  index: { pageId: 'index', title: 'Hilfe', parentPageId: 'base', sectionId: 'base' },

  character: { pageId: 'character', title: 'Charakter', parentPageId: 'base', sectionId: 'character' },
  roster: { pageId: 'roster', title: 'Kader', parentPageId: 'character', sectionId: 'character' },
  tavern: { pageId: 'tavern', title: 'Rekrutieren', parentPageId: 'character', sectionId: 'character' },
  'character-capacity': { pageId: 'character-capacity', title: 'Unterkunft & Ausbau', parentPageId: 'character', sectionId: 'character' },

  storage: { pageId: 'storage', title: 'Lager', parentPageId: 'base', sectionId: 'storage' },
  'storage-materials': { pageId: 'storage-materials', title: 'Materiallager', parentPageId: 'storage', sectionId: 'storage' },
  'storage-weapons': { pageId: 'storage-weapons', title: 'Waffenlager', parentPageId: 'storage', sectionId: 'storage' },

  forge: { pageId: 'forge', title: 'Schmiede', parentPageId: 'storage', sectionId: 'storage' },
  'forge-form': { pageId: 'forge-form', title: 'Waffe herstellen', parentPageId: 'forge', sectionId: 'storage' },
  'forge-preview': { pageId: 'forge-preview', title: 'Waffenvorschau', parentPageId: 'forge-form', sectionId: 'storage' },
  'forge-jobs': { pageId: 'forge-jobs', title: 'Schmiedeaufträge', parentPageId: 'forge', sectionId: 'storage' },
  'forge-upgrade': { pageId: 'forge-upgrade', title: 'Schmiedeausbau', parentPageId: 'forge', sectionId: 'storage' },

  market: { pageId: 'market', title: 'Verkaufen', parentPageId: 'storage', sectionId: 'storage' },
  'market-materials': { pageId: 'market-materials', title: 'Materialien verkaufen', parentPageId: 'market', sectionId: 'storage' },
  'market-weapons': { pageId: 'market-weapons', title: 'Waffen verkaufen', parentPageId: 'market', sectionId: 'storage' },
  'market-jobs': { pageId: 'market-jobs', title: 'Aktive Verkäufe', parentPageId: 'market', sectionId: 'storage' },
  'market-upgrade': { pageId: 'market-upgrade', title: 'Verkaufsausbau', parentPageId: 'market', sectionId: 'storage' },

  dungeon: { pageId: 'dungeon', title: 'Dungeon', parentPageId: 'base', sectionId: 'dungeon' },
  'dungeon-select': { pageId: 'dungeon-select', title: 'Dungeon 1', parentPageId: 'dungeon', sectionId: 'dungeon' },
  'dungeon-team': { pageId: 'dungeon-team', title: 'Dungeon-Team', parentPageId: 'dungeon', sectionId: 'dungeon' },
  'dungeon-expedition': { pageId: 'dungeon-expedition', title: 'Aktuelle Expedition', parentPageId: 'dungeon', sectionId: 'dungeon' },
  'dungeon-loot': { pageId: 'dungeon-loot', title: 'Dungeon-Beute', parentPageId: 'dungeon', sectionId: 'dungeon' },
  'dungeon-log': { pageId: 'dungeon-log', title: 'Kampfprotokoll', parentPageId: 'dungeon-expedition', sectionId: 'dungeon' }
};

export const NAVIGATION_SCREEN_IDS = Object.freeze(Object.keys(SCREEN_PRESENTATIONS));

export function getNavigationPresentation(pageId: string): NavigationPresentation {
  return SCREEN_PRESENTATIONS[pageId] ?? SCREEN_PRESENTATIONS['base'];
}

export const NAVIGATION_PRESENTATION_CORE_BRIDGE = {
  getNavigationPresentation
};

export type NavigationPresentationCoreBridge = typeof NAVIGATION_PRESENTATION_CORE_BRIDGE;
