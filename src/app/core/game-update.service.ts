import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';
import {
  AndroidUpdateReleaseManifest,
  isAndroidUpdateNewer,
  parseAndroidUpdateManifest
} from '../game/android-update-core';
import {
  AndroidUpdater,
  AndroidUpdaterCurrentInfo,
  AndroidUpdaterDownloadProgress,
  AndroidUpdaterVerificationOptions
} from './android-updater.plugin';

const UPDATE_MANIFEST_URL = 'https://artxanderwolf.github.io/pj-nobrainer/android-update/stable.json';
const LAST_CHECK_KEY = 'smiths_of_eldravar_android_update_last_check_v1';
const AUTO_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const MANIFEST_TIMEOUT_MS = 10_000;

type UpdatePhase =
  | 'unsupported'
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'error';

interface UpdateState {
  phase: UpdatePhase;
  release: AndroidUpdateReleaseManifest | null;
  current: AndroidUpdaterCurrentInfo | null;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  message: string;
  retry: 'none' | 'check' | 'download' | 'save';
}

const INITIAL_STATE: UpdateState = {
  phase: 'unsupported',
  release: null,
  current: null,
  progress: 0,
  bytesDownloaded: 0,
  totalBytes: 0,
  message: '',
  retry: 'none'
};

@Injectable({ providedIn: 'root' })
export class GameUpdateService {
  private readonly stateSubject = new BehaviorSubject<UpdateState>(INITIAL_STATE);
  private downloadListener: PluginListenerHandle | null = null;
  private dismissedVersionCode: number | null = null;
  private updateCard: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;

  async initialize(): Promise<void> {
    if (!this.isAndroidNative()) return;

    this.stateSubject.next({ ...INITIAL_STATE, phase: 'idle' });
    this.ensurePresentation();
    this.downloadListener = await AndroidUpdater.addListener('downloadProgress', event => this.onDownloadProgress(event));

    try {
      const current = await AndroidUpdater.getCurrentInfo();
      this.patchState({ current });
    } catch (error: unknown) {
      console.warn('Android-Versionsinformationen konnten nicht gelesen werden.', error);
      return;
    }

    if (this.shouldAutoCheck()) void this.checkForUpdates(false);
  }

  async destroy(): Promise<void> {
    await this.downloadListener?.remove();
    this.downloadListener = null;
  }

  async checkForUpdates(manual = true): Promise<void> {
    if (!this.isAndroidNative()) return;
    const current = this.stateSubject.value.current;
    if (!current) return;

    if (manual) this.patchState({ phase: 'checking', message: 'Suche nach freigegebenen Android-Updates …', retry: 'none' });

    try {
      const manifest = await this.fetchManifest();
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

      if (!isAndroidUpdateNewer(manifest, current.versionCode)) {
        this.patchState({
          phase: manual ? 'up-to-date' : 'idle',
          release: null,
          message: manual ? `Version ${current.versionName} ist aktuell.` : '',
          retry: 'none'
        });
        return;
      }

      this.dismissedVersionCode = null;
      this.patchState({
        phase: 'available',
        release: manifest,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: manifest.apkSize,
        message: `Version ${manifest.versionName} ist verfügbar.`,
        retry: 'none'
      });
    } catch (error: unknown) {
      if (manual) {
        this.patchState({
          phase: 'error',
          message: `Updateprüfung fehlgeschlagen: ${this.errorMessage(error)}`,
          retry: 'check'
        });
      } else {
        console.warn('Automatische Android-Updateprüfung fehlgeschlagen; das Spiel läuft normal weiter.', error);
        this.patchState({ phase: 'idle', message: '', retry: 'none' });
      }
    }
  }

  async downloadUpdate(): Promise<void> {
    const release = this.stateSubject.value.release;
    if (!release) return;

    this.patchState({
      phase: 'downloading',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: release.apkSize,
      message: 'Update wird geladen und geprüft …',
      retry: 'none'
    });

    try {
      const result = await AndroidUpdater.downloadAndVerify(this.nativeOptions(release));
      if (result.status !== 'ready') throw new Error('Der native Download wurde nicht als bereit bestätigt.');
      this.patchState({
        phase: 'ready',
        progress: 100,
        bytesDownloaded: result.bytesDownloaded,
        totalBytes: release.apkSize,
        message: 'Update geprüft. Speichere die APK jetzt in „Downloads“ oder einem anderen Ordner.',
        retry: 'none'
      });
    } catch (error: unknown) {
      this.patchState({
        phase: 'error',
        message: `Update konnte nicht vorbereitet werden: ${this.errorMessage(error)}`,
        retry: 'download'
      });
    }
  }

  async saveUpdateApk(): Promise<void> {
    const release = this.stateSubject.value.release;
    if (!release) return;

    this.patchState({
      phase: 'saving',
      message: 'Geprüfte APK wird zum Speichern vorbereitet …',
      retry: 'none'
    });

    try {
      const result = await AndroidUpdater.saveVerifiedUpdate(this.saveOptions(release));
      if (result.status === 'cancelled') {
        this.patchState({
          phase: 'ready',
          message: 'Speichern abgebrochen. Die geprüfte APK liegt weiterhin bereit.',
          retry: 'none'
        });
        return;
      }

      const fileText = result.fileName ? ` (${result.fileName})` : '';
      this.dismissedVersionCode = release.versionCode;
      this.patchState({
        phase: 'saved',
        progress: 100,
        message: `APK gespeichert${fileText}. Öffne sie außerhalb von Smiths of Eldravar über „Downloads“ oder „Eigene Dateien“ und bestätige dort das Android-Update.`,
        retry: 'none'
      });
    } catch (error: unknown) {
      this.patchState({
        phase: 'error',
        message: `APK konnte nicht gespeichert werden: ${this.errorMessage(error)}`,
        retry: 'save'
      });
    }
  }

  dismissAvailableUpdate(): void {
    const release = this.stateSubject.value.release;
    if (release) this.dismissedVersionCode = release.versionCode;
    this.renderPresentation();
  }

  private isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  private shouldAutoCheck(): boolean {
    const previous = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    return !Number.isFinite(previous) || previous <= 0 || Date.now() - previous >= AUTO_CHECK_INTERVAL_MS;
  }

  private async fetchManifest() {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), MANIFEST_TIMEOUT_MS);
    try {
      const separator = UPDATE_MANIFEST_URL.includes('?') ? '&' : '?';
      const response = await fetch(`${UPDATE_MANIFEST_URL}${separator}t=${Date.now()}`, {
        cache: 'no-store',
        signal: abort.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Update-Server antwortet mit HTTP ${response.status}.`);
      return parseAndroidUpdateManifest(await response.json());
    } finally {
      window.clearTimeout(timer);
    }
  }

  private nativeOptions(release: AndroidUpdateReleaseManifest): AndroidUpdaterVerificationOptions {
    return {
      apkUrl: release.apkUrl,
      apkSize: release.apkSize,
      sha256: release.sha256,
      versionName: release.versionName,
      versionCode: release.versionCode
    };
  }

  private saveOptions(release: AndroidUpdateReleaseManifest): Omit<AndroidUpdaterVerificationOptions, 'apkUrl'> {
    return {
      apkSize: release.apkSize,
      sha256: release.sha256,
      versionName: release.versionName,
      versionCode: release.versionCode
    };
  }

  private onDownloadProgress(event: AndroidUpdaterDownloadProgress): void {
    if (this.stateSubject.value.phase !== 'downloading') return;
    this.patchState({
      progress: Math.max(0, Math.min(100, Number(event.percent) || 0)),
      bytesDownloaded: Math.max(0, Number(event.bytesDownloaded) || 0),
      totalBytes: Math.max(0, Number(event.totalBytes) || this.stateSubject.value.totalBytes)
    });
  }

  private patchState(patch: Partial<UpdateState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
    this.renderPresentation();
  }

  private ensurePresentation(): void {
    if (!this.isAndroidNative()) return;

    if (!this.updateCard?.isConnected) {
      const grid = document.querySelector<HTMLElement>('#index .grid');
      if (grid) {
        const card = document.createElement('div');
        card.className = 'card span-12 android-update-card';
        card.dataset['androidUpdateCard'] = 'true';
        card.innerHTML = `
          <h2>Android-Updates</h2>
          <p class="index-note">Die App prüft nur den ausdrücklich freigegebenen Android-Kanal. Die APK wird im Spiel heruntergeladen und geprüft. Die Installation startest du anschließend außerhalb der App über „Downloads“ oder „Eigene Dateien“.</p>
          <p class="android-update-status" data-update-status></p>
          <div class="android-update-progress" data-update-progress-wrap hidden><div data-update-progress-bar></div></div>
          <div class="android-update-actions">
            <button class="btn" type="button" data-update-check>Nach Update suchen</button>
            <button class="btn primary" type="button" data-update-primary hidden></button>
          </div>`;
        card.querySelector<HTMLButtonElement>('[data-update-check]')?.addEventListener('click', () => void this.checkForUpdates(true));
        card.querySelector<HTMLButtonElement>('[data-update-primary]')?.addEventListener('click', () => void this.runPrimaryAction());
        grid.appendChild(card);
        this.updateCard = card;
      }
    }

    if (!this.overlay?.isConnected) {
      const overlay = document.createElement('div');
      overlay.className = 'android-update-overlay';
      overlay.hidden = true;
      overlay.innerHTML = `
        <div class="android-update-dialog" role="dialog" aria-modal="true" aria-labelledby="androidUpdateTitle">
          <h2 id="androidUpdateTitle">Neue Version verfügbar</h2>
          <p data-update-overlay-version></p>
          <ul data-update-release-notes></ul>
          <p class="index-note">Nach dem geprüften Download speicherst du die APK. Öffne sie danach außerhalb des Spiels über „Downloads“ oder „Eigene Dateien“, um das Android-Update zu installieren.</p>
          <p class="android-update-status" data-update-overlay-status></p>
          <div class="android-update-progress" data-update-overlay-progress-wrap hidden><div data-update-overlay-progress-bar></div></div>
          <div class="android-update-actions">
            <button class="btn primary" type="button" data-update-overlay-primary></button>
            <button class="btn" type="button" data-update-later>Später</button>
          </div>
        </div>`;
      overlay.querySelector<HTMLButtonElement>('[data-update-overlay-primary]')?.addEventListener('click', () => void this.runPrimaryAction());
      overlay.querySelector<HTMLButtonElement>('[data-update-later]')?.addEventListener('click', () => this.dismissAvailableUpdate());
      document.body.appendChild(overlay);
      this.overlay = overlay;
    }

    this.renderPresentation();
  }

  private async runPrimaryAction(): Promise<void> {
    const state = this.stateSubject.value;
    if (state.phase === 'available' || (state.phase === 'error' && state.retry === 'download')) {
      await this.downloadUpdate();
      return;
    }
    if (state.phase === 'ready' || (state.phase === 'error' && state.retry === 'save')) {
      await this.saveUpdateApk();
      return;
    }
    if (state.phase === 'error' && state.retry === 'check') await this.checkForUpdates(true);
  }

  private renderPresentation(): void {
    const card = this.updateCard;
    const overlay = this.overlay;
    if (!card || !overlay) return;

    const state = this.stateSubject.value;
    const status = card.querySelector<HTMLElement>('[data-update-status]');
    const check = card.querySelector<HTMLButtonElement>('[data-update-check]');
    const primary = card.querySelector<HTMLButtonElement>('[data-update-primary]');
    const progressWrap = card.querySelector<HTMLElement>('[data-update-progress-wrap]');
    const progressBar = card.querySelector<HTMLElement>('[data-update-progress-bar]');
    if (status) status.textContent = state.message || this.defaultStatus(state);
    if (check) check.disabled = ['checking', 'downloading', 'saving'].includes(state.phase);

    const primaryLabel = this.primaryLabel(state);
    if (primary) {
      primary.hidden = !primaryLabel;
      primary.textContent = primaryLabel;
      primary.disabled = ['downloading', 'saving'].includes(state.phase);
    }
    this.renderProgress(progressWrap, progressBar, state);

    const release = state.release;
    const overlayVersion = overlay.querySelector<HTMLElement>('[data-update-overlay-version]');
    const overlayStatus = overlay.querySelector<HTMLElement>('[data-update-overlay-status]');
    const overlayPrimary = overlay.querySelector<HTMLButtonElement>('[data-update-overlay-primary]');
    const later = overlay.querySelector<HTMLButtonElement>('[data-update-later]');
    const notes = overlay.querySelector<HTMLUListElement>('[data-update-release-notes]');
    const overlayProgressWrap = overlay.querySelector<HTMLElement>('[data-update-overlay-progress-wrap]');
    const overlayProgressBar = overlay.querySelector<HTMLElement>('[data-update-overlay-progress-bar]');

    if (overlayVersion) overlayVersion.textContent = release ? `Smiths of Eldravar v${release.versionName}` : '';
    if (overlayStatus) overlayStatus.textContent = state.message;
    if (overlayPrimary) {
      overlayPrimary.textContent = primaryLabel || 'Schließen';
      overlayPrimary.disabled = ['downloading', 'saving'].includes(state.phase);
    }
    if (later) later.disabled = state.phase === 'saving';
    if (notes) {
      notes.replaceChildren();
      for (const note of release?.releaseNotes ?? []) {
        const item = document.createElement('li');
        item.textContent = note;
        notes.appendChild(item);
      }
    }
    this.renderProgress(overlayProgressWrap, overlayProgressBar, state);

    const updateFlowVisible = Boolean(release) && ['available', 'downloading', 'ready', 'saving', 'error'].includes(state.phase);
    overlay.hidden = !updateFlowVisible || this.dismissedVersionCode === release?.versionCode;
  }

  private renderProgress(wrap: HTMLElement | null, bar: HTMLElement | null, state: UpdateState): void {
    if (!wrap || !bar) return;
    const visible = state.phase === 'downloading' || state.phase === 'ready' || state.phase === 'saving';
    wrap.hidden = !visible;
    bar.style.width = `${Math.round(state.progress)}%`;
    bar.setAttribute('aria-label', `${Math.round(state.progress)} Prozent`);
  }

  private primaryLabel(state: UpdateState): string {
    if (state.phase === 'available') return 'Update herunterladen';
    if (state.phase === 'ready') return 'APK speichern';
    if (state.phase === 'error' && state.retry === 'download') return 'Download erneut versuchen';
    if (state.phase === 'error' && state.retry === 'save') return 'Speichern erneut versuchen';
    if (state.phase === 'error' && state.retry === 'check') return 'Erneut prüfen';
    return '';
  }

  private defaultStatus(state: UpdateState): string {
    if (state.phase === 'idle') return 'Updateprüfung bereit.';
    if (state.phase === 'checking') return 'Suche nach Updates …';
    if (state.phase === 'up-to-date') return 'Diese Android-Version ist aktuell.';
    if (state.phase === 'downloading') return `${this.formatBytes(state.bytesDownloaded)} / ${this.formatBytes(state.totalBytes)} · ${Math.round(state.progress)} %`;
    if (state.phase === 'saved') return 'APK gespeichert. Installation erfolgt außerhalb der App.';
    return '';
  }

  private formatBytes(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return '0 MB';
    return `${(value / 1_048_576).toFixed(1).replace('.', ',')} MB`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'object' && error && 'message' in error) return String((error as { message?: unknown }).message || 'Unbekannter Fehler');
    return String(error || 'Unbekannter Fehler');
  }
}
