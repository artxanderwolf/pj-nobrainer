import { Injectable } from '@angular/core';
import {
  DUNGEON_LOOT_TABLES,
  MATERIALS,
  reinforcementEffectText
} from '../game/game-core';
import { getMaterialIndexRowPresentation } from '../game/material-presentation-core';

interface MaterialIndexPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerMaterialIndexPresentationCompatibility?: MaterialIndexPresentationCompatibilityBridge;
  }
}

interface DungeonLootTableLike {
  categories: Array<{
    items: Array<{ name: string; chance: number }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class GameMaterialIndexPresentationService {
  render(): void {
    const body = document.getElementById('materialIndexRows');
    if (!(body instanceof HTMLTableSectionElement)) return;

    body.innerHTML = '';
    body.dataset['materialIndexPresentationOwner'] = 'angular';

    for (const [name, material] of Object.entries(MATERIALS)) {
      const presentation = getMaterialIndexRowPresentation(
        name,
        material,
        reinforcementEffectText(name),
        this.getDungeonMaterialChance(1, name)
      );
      const row = document.createElement('tr');
      row.innerHTML = `<td>${presentation.category}</td><td><strong>${presentation.name}</strong></td><td class="rarity">${presentation.rarityText}</td><td>${presentation.baseDamageText}</td><td>${presentation.baseSpeedText}</td><td>${presentation.bladeText}</td><td>${presentation.penetrationText}</td><td>${presentation.gripSpeedText}</td><td>${presentation.hitChanceText}</td><td>${presentation.reinforcementText}</td><td>${presentation.dungeonChanceText}</td>`;
      this.applyMobileLabels(body, row);
      body.appendChild(row);
    }
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerMaterialIndexPresentationCompatibility) {
      throw new Error('NoBrainer-Materialindex-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerMaterialIndexPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerMaterialIndexPresentationCompatibility;
  }

  private getDungeonMaterialChance(dungeonId: number, name: string): number | null {
    const tables = DUNGEON_LOOT_TABLES as Record<number, DungeonLootTableLike | undefined>;
    const table = tables[dungeonId];
    if (!table) return null;
    for (const category of table.categories) {
      const item = category.items.find(entry => entry.name === name);
      if (item) return item.chance;
    }
    return null;
  }

  private applyMobileLabels(body: HTMLTableSectionElement, row: HTMLTableRowElement): void {
    const headers = Array.from(body.closest('table')?.querySelectorAll('thead th') ?? [])
      .map(header => header.textContent ?? '');
    Array.from(row.cells).forEach((cell, index) => {
      const label = headers[index];
      if (label) cell.dataset['label'] = label;
    });
  }
}
