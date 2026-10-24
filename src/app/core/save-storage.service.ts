import { Injectable } from '@angular/core';
import { decodeSave } from '../game/save-codec';
import { SaveSnapshot } from './offline-progress.service';

const SAVE_KEY = 'nobrainer_save_v1';
const IMPORT_BACKUP_KEY = 'nobrainer_save_import_backup_v1';

interface ImportBackupRecord {
  hadSave: boolean;
  raw: string | null;
}

@Injectable({ providedIn: 'root' })
export class SaveStorageService {
  read(): string | null {
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
    const record: ImportBackupRecord = {
      hadSave: currentRaw !== null,
      raw: currentRaw
    };
    localStorage.setItem(IMPORT_BACKUP_KEY, JSON.stringify(record));
  }

  hasImportBackup(): boolean {
    return this.readImportBackup() !== null;
  }

  restoreImportBackup(): boolean {
    const backup = this.readImportBackup();
    if (!backup) return false;

    if (backup.hadSave && typeof backup.raw === 'string') this.write(backup.raw);
    else this.remove();

    localStorage.removeItem(IMPORT_BACKUP_KEY);
    return true;
  }

  private readImportBackup(): ImportBackupRecord | null {
    const raw = localStorage.getItem(IMPORT_BACKUP_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<ImportBackupRecord>;
      if (typeof parsed?.hadSave !== 'boolean') return null;
      if (parsed.hadSave && typeof parsed.raw !== 'string') return null;
      if (!parsed.hadSave && parsed.raw !== null) return null;
      return { hadSave: parsed.hadSave, raw: parsed.raw ?? null };
    } catch {
      return null;
    }
  }
}
