import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { chooseAndroidBackAction, type AndroidBackSnapshot } from '../game/android-back-navigation-core';

/** S04: Android-Systemnavigation benutzt die vorhandenen Angular-UI-Aktionen. */
@Injectable({ providedIn: 'root' })
export class GameAndroidBackService {
  private bound = false;
  private browserHistoryArmed = false;
  private browserHistoryRemovalPending = false;

  bind(): void {
    if (this.bound) return;
    this.bound = true;

    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        window.addEventListener('soe:android-back', this.handleBack);
      }
      return;
    }

    // S04b: Android-Browser-Zurueckgeste und Desktop-Browser-Zurueck greifen
    // ueber popstate auf genau die gleiche UI-Hierarchie wie die native App zu.
    // Kein History-Schutz auf der Stadtseite: der Browser darf sie normal verlassen.
    this.browserHistoryArmed = Boolean(window.history.state?.__soeInGameBack);
    window.addEventListener('popstate', this.handleBrowserPopState);
    document.addEventListener('click', this.handleBrowserInteraction, true);
    document.addEventListener('change', this.handleBrowserInteraction, true);
    this.syncBrowserHistory();
  }

  private readonly handleBrowserInteraction = (): void => {
    // Element-Click-Handler duerfen zuerst die Angular-Oberflaeche aktualisieren.
    window.setTimeout(() => this.syncBrowserHistory(), 0);
  };

  private readonly handleBrowserPopState = (): void => {
    if (this.browserHistoryRemovalPending) {
      this.browserHistoryRemovalPending = false;
      this.syncBrowserHistory();
      return;
    }
    if (!this.browserHistoryArmed) return;
    this.browserHistoryArmed = false;
    this.handleBack();
    this.syncBrowserHistory();
  };

  private syncBrowserHistory(): void {
    if (this.browserHistoryRemovalPending) return;
    const needsInGameBack = chooseAndroidBackAction(this.readSnapshot()) !== 'stay';

    if (needsInGameBack && !this.browserHistoryArmed) {
      // Nur ein zusaetzlicher History-Eintrag, auch bei tief verschachtelten Seiten.
      // Nach popstate wird er nur neu gesetzt, wenn noch eine Ingame-Ebene offen ist.
      const existing = window.history.state;
      const previous = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
      try {
        window.history.pushState({ ...previous, __soeInGameBack: true }, '');
        this.browserHistoryArmed = true;
      } catch {
        // Browser ohne erlaubte History-Manipulation behalten ihr Standardverhalten.
      }
    } else if (!needsInGameBack && this.browserHistoryArmed) {
      // Die sichtbare Zurueck-Schaltflaeche hat schon zur Stadt gefuehrt.
      // Den letzten Schutz-Eintrag wieder entfernen, damit Browser-Zurueck
      // auf der Stadtkarte nicht doppelt gedrueckt werden muss.
      this.browserHistoryArmed = false;
      this.browserHistoryRemovalPending = true;
      try {
        window.history.back();
      } catch {
        this.browserHistoryRemovalPending = false;
      }
    }
  }

  private readSnapshot(): AndroidBackSnapshot {
    const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? null;
    const characterModal = document.querySelector<HTMLElement>('.character-modal:not([hidden])');
    const dungeonModal = document.getElementById('dungeon-select');
    const activePage = document.querySelector<HTMLElement>('.page.active');
    const backButton = document.getElementById('backBtn') as HTMLButtonElement | null;
    return {
      dialogOpen: Boolean(dialog),
      characterDetailOpen: Boolean(characterModal),
      dungeonModalOpen: Boolean(dungeonModal && !dungeonModal.hidden && dungeonModal.classList.contains('dungeon-modal-open')),
      saveTabOpen: document.getElementById('indexSaveTab')?.getAttribute('aria-selected') === 'true',
      activePageId: activePage?.id ?? 'base',
      pageBackAvailable: Boolean(backButton && !backButton.hidden && !backButton.disabled)
    };
  }

  private readonly handleBack = (): void => {
    const state = this.readSnapshot();
    const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? null;
    const characterModal = document.querySelector<HTMLElement>('.character-modal:not([hidden])');
    const backButton = document.getElementById('backBtn') as HTMLButtonElement | null;
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
