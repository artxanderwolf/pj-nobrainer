import { Injectable } from '@angular/core';
import { decodeSave } from '../game/save-codec';
import { SaveSnapshot } from './offline-progress.service';

const SAVE_KEY = 'nobrainer_save_v1';
const IMPORT_BACKUP_KEY = 'nobrainer_save_import_backup_v1';
const PENDING_REPLACEMENT_KEY = 'nobrainer_save_pending_replacement_v1';

interface SaveReplacementRecord {
  hadSave: boolean;
  raw: string | null;
}

@Injectable({ providedIn: 'root' })
export class SaveStorageService {
  read(): string | null {
    this.applyPendingReplacement();
    return localStorage.getItem(SAVE_KEY);
  }

  readSnapshot(): SaveSnapshot | null {
    const raw = this.read();
    if (!raw) return null;

    try {
      const decoded = decodeSave<any>(raw);
      return {
        state: decoded.state,
        savedAt: decoded.savedAt
      };
    } catch {
      return null;
    }
  }

  write(value: string): void {
    localStorage.setItem(SAVE_KEY, value);
  }

  remove(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  writeImportBackup(currentRaw: string | null): void {
    this.writeRecord(IMPORT_BACKUP_KEY, {
      hadSave: currentRaw !== null,
      raw: currentRaw
    });
  }

  hasImportBackup(): boolean {
    return this.readRecord(IMPORT_BACKUP_KEY) !== null;
  }

  stageImportedSave(raw: string): void {
    this.writeRecord(PENDING_REPLACEMENT_KEY, { hadSave: true, raw });
  }

  stageImportBackupRestore(): boolean {
    const backup = this.readRecord(IMPORT_BACKUP_KEY);
    if (!backup) return false;

    this.writeRecord(PENDING_REPLACEMENT_KEY, backup);
    localStorage.removeItem(IMPORT_BACKUP_KEY);
    return true;
  }

  applyPendingReplacement(): boolean {
    const pending = this.readRecord(PENDING_REPLACEMENT_KEY);
    if (!pending) return false;

    if (pending.hadSave && typeof pending.raw === 'string') this.write(pending.raw);
    else this.remove();

    localStorage.removeItem(PENDING_REPLACEMENT_KEY);
    return true;
  }

  private writeRecord(key: string, record: SaveReplacementRecord): void {
    localStorage.setItem(key, JSON.stringify(record));
  }

  private readRecord(key: string): SaveReplacementRecord | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<SaveReplacementRecord>;
      if (typeof parsed?.hadSave !== 'boolean') return null;
      if (parsed.hadSave && typeof parsed.raw !== 'string') return null;
      if (!parsed.hadSave && parsed.raw !== null) return null;
      return { hadSave: parsed.hadSave, raw: parsed.raw ?? null };
    } catch {
      return null;
    }
  }
}
