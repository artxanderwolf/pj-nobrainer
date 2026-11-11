/** Reihenfolge der Android-System-Zurueckaktion (ohne Browser-History und App-Beenden). */
export interface AndroidBackSnapshot {
  dialogOpen: boolean;
  characterDetailOpen: boolean;
  dungeonModalOpen: boolean;
  saveTabOpen: boolean;
  activePageId: string;
  pageBackAvailable: boolean;
}
export type AndroidBackAction = 'dialog' | 'character-detail' | 'dungeon-modal' | 'save-tab' | 'page' | 'stay';

export function chooseAndroidBackAction(state: AndroidBackSnapshot): AndroidBackAction {
  if (state.dialogOpen) return 'dialog';
  if (state.characterDetailOpen) return 'character-detail';
  if (state.dungeonModalOpen) return 'dungeon-modal';
  if (state.saveTabOpen && state.activePageId === 'index') return 'save-tab';
  if (state.activePageId !== 'base' && state.pageBackAvailable) return 'page';
  return 'stay';
}
