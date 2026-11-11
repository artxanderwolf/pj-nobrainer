import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { chooseAndroidBackAction, type AndroidBackSnapshot } from '../game/android-back-navigation-core';

/** S04: Android-Systemnavigation benutzt die vorhandenen Angular-UI-Aktionen. */
@Injectable({ providedIn: 'root' })
export class GameAndroidBackService {
  private bound = false;

  bind(): void {
    if (this.bound || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    window.addEventListener('soe:android-back', this.handleBack);
    this.bound = true;
  }

  private readonly handleBack = (): void => {
    const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? null;
    const characterModal = document.querySelector<HTMLElement>('.character-modal:not([hidden])');
    const dungeonModal = document.getElementById('dungeon-select');
    const activePage = document.querySelector<HTMLElement>('.page.active');
    const backButton = document.getElementById('backBtn') as HTMLButtonElement | null;
    const state: AndroidBackSnapshot = {
      dialogOpen: Boolean(dialog),
      characterDetailOpen: Boolean(characterModal),
      dungeonModalOpen: Boolean(dungeonModal && !dungeonModal.hidden && dungeonModal.classList.contains('dungeon-modal-open')),
      saveTabOpen: document.getElementById('indexSaveTab')?.getAttribute('aria-selected') === 'true',
      activePageId: activePage?.id ?? 'base',
      pageBackAvailable: Boolean(backButton && !backButton.hidden && !backButton.disabled)
    };
    switch (chooseAndroidBackAction(state)) {
      case 'dialog':
        dialog?.close();
        return;
      case 'character-detail': {
        // Den Angular-Click-Handler verwenden, damit interne Detail-States korrekt geschlossen werden.
        const closeButton = characterModal?.querySelector<HTMLButtonElement>(
          '[data-roster-action="close-detail"],[data-tavern-action="close-detail"]'
        );
        closeButton?.click();
        return;
      }
      case 'dungeon-modal':
        document.getElementById('dungeonModalCloseBtn')?.click();
        return;
      case 'save-tab':
        document.getElementById('indexInfoTab')?.click();
        return;
      case 'page':
        // Derselbe normale Hierarchiepfad wie die sichtbare Zurueck-Schaltflaeche.
        backButton?.click();
        return;
      case 'stay':
        // An der Startansicht nicht ohne ausdruecklichen Wunsch die App beenden.
        return;
    }
  };
}
