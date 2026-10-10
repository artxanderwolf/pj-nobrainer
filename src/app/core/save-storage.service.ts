import { Injectable } from '@angular/core';

const SAVE_KEY = 'nobrainer_save_v1';

@Injectable({ providedIn: 'root' })
export class SaveStorageService {
  read(): string | null {
    return localStorage.getItem(SAVE_KEY);
  }

  write(value: string): void {
    localStorage.setItem(SAVE_KEY, value);
  }

  remove(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
