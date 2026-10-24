import { Injectable } from '@angular/core';
import { APP_UI_VERSION } from '../game/app-shell-presentation-core';
import { decodeSave } from '../game/save-codec';
import {
  buildSaveExportFilename,
  MAX_IMPORT_FILE_BYTES,
  validateImportedSave
} from '../game/save-transfer-core';
import { SaveStorageService } from './save-storage.service';

@Injectable({ providedIn: 'root' })
export class GameSaveTransferService {
  private boundPage: HTMLElement | null = null;
  private boundInput: HTMLInputElement | null = null;
  private saveNow: (() => boolean) | null = null;

  constructor(private readonly saveStorage: SaveStorageService) {}

  bindActions(saveNow: () => boolean): void {
    this.saveNow = saveNow;
    const page = this.ensureUi();
    if (!page) return;

    if (this.boundPage !== page) {
      this.boundPage?.removeEventListener('click', this.handleClick);
      page.addEventListener('click', this.handleClick);
      this.boundPage = page;
    }

    const input = page.querySelector<HTMLInputElement>('#saveTransferImportInput');
    if (input && this.boundInput !== input) {
      this.boundInput?.removeEventListener('change', this.handleFileChange);
      input.addEventListener('change', this.handleFileChange);
      this.boundInput = input;
    }

    this.renderStorageState();
  }

  private ensureUi(): HTMLElement | null {
    const page = document.getElementById('index');
    if (!page) return null;
    if (page.querySelector('#indexInfoTabs')) return page;

    const infoPanel = Array.from(page.children).find(
      child => child instanceof HTMLElement && child.classList.contains('grid')
    ) as HTMLElement | undefined;
    if (!infoPanel) return page;

    infoPanel.id = 'indexInfoPanel';
    infoPanel.setAttribute('role', 'tabpanel');
    infoPanel.setAttribute('aria-labelledby', 'indexInfoTab');

    const tabs = document.createElement('div');
    tabs.id = 'indexInfoTabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Info-Bereich');
    tabs.setAttribute('style', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px');
    tabs.innerHTML = `
      <button id="indexInfoTab" class="btn primary" type="button" role="tab" aria-selected="true" aria-controls="indexInfoPanel" data-save-transfer-tab="info">Info</button>
      <button id="indexSaveTab" class="btn" type="button" role="tab" aria-selected="false" aria-controls="indexSavePanel" data-save-transfer-tab="save">Spielstand</button>`;

    const savePanel = document.createElement('div');
    savePanel.id = 'indexSavePanel';
    savePanel.className = 'grid';
    savePanel.hidden = true;
    savePanel.setAttribute('role', 'tabpanel');
    savePanel.setAttribute('aria-labelledby', 'indexSaveTab');
    savePanel.innerHTML = `
      <div class="card span-12">
        <h2>Spielstand</h2>
        <p class="index-note">NoBrainer speichert automatisch lokal. Hier kannst du zusätzlich sofort speichern, den aktuellen vollständigen Spielstand als JSON-Datei sichern oder eine zuvor exportierte JSON-Datei laden.</p>
        <p class="index-note">Beim Laden wird der aktuelle lokale Spielstand ersetzt. Vorher legt NoBrainer automatisch eine Sicherung des bisherigen Stands an. Danach wird das Spiel neu geladen, damit derselbe normale Lade-, Migrations- und Offline-Fortschrittspfad verwendet wird.</p>
        <p id="saveTransferStatus" class="status-line">Spielstand wird geprüft …</p>
        <div class="actions">
          <button id="saveTransferSaveBtn" class="btn primary" type="button" data-save-transfer-action="save">Jetzt speichern</button>
          <button id="saveTransferExportBtn" class="btn" type="button" data-save-transfer-action="export">JSON exportieren</button>
          <button id="saveTransferImportBtn" class="btn" type="button" data-save-transfer-action="import">JSON laden</button>
        </div>
        <input id="saveTransferImportInput" type="file" accept="application/json,.json" hidden>
        <div class="actions">
          <button id="saveTransferUndoBtn" class="btn danger" type="button" data-save-transfer-action="undo" disabled>Letzten Import rückgängig machen</button>
        </div>
      </div>`;

    page.insertBefore(tabs, infoPanel);
    page.appendChild(savePanel);
    return page;
  }

  private readonly handleClick = (event: Event): void => {
    if (!(event.target instanceof Element) || !this.boundPage) return;

    const tab = event.target.closest<HTMLButtonElement>('button[data-save-transfer-tab]');
    if (tab) {
      this.showTab(tab.dataset['saveTransferTab'] === 'save' ? 'save' : 'info');
      return;
    }

    const button = event.target.closest<HTMLButtonElement>('button[data-save-transfer-action]');
    if (!button || button.disabled) return;
    const action = button.dataset['saveTransferAction'];

    if (action === 'save') this.saveCurrent();
    else if (action === 'export') this.exportCurrent();
    else if (action === 'import') this.openImportPicker();
    else if (action === 'undo') this.undoLastImport();
  };

  private readonly handleFileChange = (): void => {
    const input = this.boundInput;
    const file = input?.files?.[0];
    if (input) input.value = '';
    if (!file) return;
    void this.importFile(file);
  };

  private showTab(tab: 'info' | 'save'): void {
    if (!this.boundPage) return;
    const infoPanel = this.boundPage.querySelector<HTMLElement>('#indexInfoPanel');
    const savePanel = this.boundPage.querySelector<HTMLElement>('#indexSavePanel');
    const infoTab = this.boundPage.querySelector<HTMLButtonElement>('#indexInfoTab');
    const saveTab = this.boundPage.querySelector<HTMLButtonElement>('#indexSaveTab');
    const saveActive = tab === 'save';

    if (infoPanel) infoPanel.hidden = saveActive;
    if (savePanel) savePanel.hidden = !saveActive;
    if (infoTab) {
      infoTab.classList.toggle('primary', !saveActive);
      infoTab.setAttribute('aria-selected', String(!saveActive));
    }
    if (saveTab) {
      saveTab.classList.toggle('primary', saveActive);
      saveTab.setAttribute('aria-selected', String(saveActive));
    }
    if (saveActive) this.renderStorageState();
  }

  private saveCurrent(): void {
    if (!this.saveNow?.()) {
      this.setStatus('Der lokale Spielstand konnte nicht gespeichert werden.', true);
      return;
    }
    this.renderStorageState('Spielstand wurde jetzt gespeichert.');
  }

  private exportCurrent(): void {
    if (!this.saveNow?.()) {
      this.setStatus('Der Spielstand konnte vor dem Export nicht gespeichert werden.', true);
      return;
    }

    const raw = this.saveStorage.read();
    if (!raw) {
      this.setStatus('Es ist kein lokaler Spielstand zum Exportieren vorhanden.', true);
      return;
    }
    const validation = validateImportedSave(raw);
    if (!validation.ok) {
      this.setStatus('Der aktuelle lokale Spielstand konnte nicht als gültige JSON-Datei bestätigt werden.', true);
      return;
    }

    const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildSaveExportFilename(APP_UI_VERSION, validation.savedAt);
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    this.renderStorageState(`JSON-Datei exportiert: ${anchor.download}`);
  }

  private openImportPicker(): void {
    const input = this.boundInput ?? document.getElementById('saveTransferImportInput') as HTMLInputElement | null;
    if (!input) {
      this.setStatus('Die Dateiauswahl ist nicht verfügbar.', true);
      return;
    }
    input.value = '';
    input.click();
  }

  private async importFile(file: File): Promise<void> {
    if (!/\.json$/i.test(file.name)) {
      this.setStatus('Bitte eine JSON-Datei auswählen.', true);
      return;
    }
    if (file.size <= 0 || file.size > MAX_IMPORT_FILE_BYTES) {
      this.setStatus('Die ausgewählte JSON-Datei ist leer oder ungewöhnlich groß.', true);
      return;
    }

    let raw: string;
    try {
      raw = await file.text();
    } catch {
      this.setStatus('Die ausgewählte Datei konnte nicht gelesen werden.', true);
      return;
    }

    const validation = validateImportedSave(raw);
    if (!validation.ok) {
      this.setStatus(validation.message, true);
      return;
    }

    const when = new Date(validation.savedAt).toLocaleString('de-DE');
    const confirmed = window.confirm(
      `Spielstand laden?\n\nSave-Version: v${validation.saveVersion}\nGespeichert: ${when}\n\nDer aktuelle Spielstand wird ersetzt. Vorher wird automatisch eine Sicherung angelegt.`
    );
    if (!confirmed) {
      this.setStatus('Laden wurde abgebrochen.');
      return;
    }

    try {
      this.saveStorage.writeImportBackup(this.saveStorage.read());
      this.saveStorage.write(raw);
    } catch {
      this.setStatus('Der importierte Spielstand konnte nicht lokal gespeichert werden.', true);
      return;
    }

    window.location.reload();
  }

  private undoLastImport(): void {
    if (!this.saveStorage.hasImportBackup()) {
      this.renderStorageState('Es ist keine Import-Sicherung vorhanden.');
      return;
    }
    if (!window.confirm('Letzten Import rückgängig machen? Der aktuelle Spielstand wird durch die automatische Sicherung vor diesem Import ersetzt.')) {
      this.setStatus('Wiederherstellung wurde abgebrochen.');
      return;
    }

    try {
      if (!this.saveStorage.restoreImportBackup()) {
        this.setStatus('Die Import-Sicherung ist nicht mehr verfügbar.', true);
        return;
      }
    } catch {
      this.setStatus('Die Import-Sicherung konnte nicht wiederhergestellt werden.', true);
      return;
    }
    window.location.reload();
  }

  private renderStorageState(prefix?: string): void {
    const raw = this.saveStorage.read();
    let detail = 'Noch kein lokaler Spielstand vorhanden.';
    if (raw) {
      try {
        const decoded = decodeSave(raw);
        const version = decoded.saveVersion === null ? 'Legacy' : `v${decoded.saveVersion}`;
        const when = decoded.savedAt ? new Date(decoded.savedAt).toLocaleString('de-DE') : 'Zeitpunkt unbekannt';
        detail = `Lokaler Spielstand · Save ${version} · ${when}`;
      } catch {
        detail = 'Der lokale Spielstand ist derzeit nicht lesbar.';
      }
    }
    this.setStatus(prefix ? `${prefix} ${detail}` : detail);

    const undo = this.boundPage?.querySelector<HTMLButtonElement>('#saveTransferUndoBtn');
    if (undo) undo.disabled = !this.saveStorage.hasImportBackup();
  }

  private setStatus(message: string, isError = false): void {
    const status = this.boundPage?.querySelector<HTMLElement>('#saveTransferStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('bad', isError);
    status.classList.toggle('muted', !isError);
  }
}
