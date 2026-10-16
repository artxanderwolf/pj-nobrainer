import { Injectable } from '@angular/core';
import { getCombatLogEntryPresentation } from '../game/combat-log-presentation-core';

interface LegacyCombatLogCompatibilityBridge {
  add(text: string, className?: string): void;
}

declare global {
  interface Window {
    NoBrainerCombatLogCompatibility?: LegacyCombatLogCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameCombatLogService {
  add(text: string, className = ''): void {
    const log = document.getElementById('combatLog');
    if (!log) return;

    const first = log.firstElementChild;
    const presentation = getCombatLogEntryPresentation(text, className, {
      childCount: log.children.length,
      firstChildClassName: first?.className ?? '',
      firstChildText: first?.textContent ?? ''
    });

    if (presentation.clearPlaceholder) log.innerHTML = '';

    const row = document.createElement('div');
    row.className = presentation.className;
    row.textContent = presentation.text;
    log.prepend(row);
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerCombatLogCompatibility) {
      throw new Error('NoBrainer-Kampfprotokoll-Kompatibilitätsbrücke ist bereits geöffnet.');
    }

    window.NoBrainerCombatLogCompatibility = {
      add: (text, className) => this.add(text, className)
    };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerCombatLogCompatibility;
  }
}
