import { Injectable } from '@angular/core';
import { decodeSave } from '../game/save-codec';
import { SaveSnapshot } from './offline-progress.service';

const SAVE_KEY = 'nobrainer_save_v1';

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
}
