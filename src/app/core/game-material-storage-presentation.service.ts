import { Injectable } from '@angular/core';
import { formatCurrencyNickel, materialSellDataById } from '../game/economy-core';
import {
  getMaterialStorageRowPresentation
} from '../game/material-presentation-core';
import {
  getMaterialStorageEntries,
  type MaterialStorageInventory
} from '../game/material-storage-core';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeMaterialStorageState = MutableGameState & {
  inventory: MaterialStorageInventory;
};

interface MaterialStoragePresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerMaterialStoragePresentationCompatibility?: MaterialStoragePresentationCompatibilityBridge;
  }
}

@Injectable({ providedIn: 'root' })
export class GameMaterialStoragePresentationService {
  constructor(private readonly gameState: GameStateService) {}

  render(): void {
    const body = document.getElementById('inventoryRows');
    const empty = document.getElementById('inventoryEmpty');
    if (!(body instanceof HTMLTableSectionElement) || !empty) return;

    const entries = getMaterialStorageEntries(this.state().inventory)
      .filter(entry => entry.qty > 0)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    body.innerHTML = '';
    body.dataset['materialStoragePresentationOwner'] = 'angular';
    empty.style.display = entries.length ? 'none' : 'block';

    for (const materialEntry of entries) {
      const sell = materialSellDataById(materialEntry.materialId);
      if (!sell) throw new Error(`Material-Verkaufsdaten fehlen: ID ${materialEntry.materialId}.`);
      const presentation = getMaterialStorageRowPresentation(
        materialEntry.displayName,
        {
          materialId: materialEntry.materialId,
          category: materialEntry.category,
          qty: materialEntry.qty
        },
        sell.valueNickel,
        formatCurrencyNickel
      );
      const row = document.createElement('tr');
      row.innerHTML = `<td title="${presentation.tooltip}">${presentation.name}</td><td>${presentation.category}</td><td>${presentation.quantityText}</td><td>${presentation.valueText}</td>`;
      this.applyMobileLabels(body, row);
      body.appendChild(row);
    }
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerMaterialStoragePresentationCompatibility) {
      throw new Error('NoBrainer-Materiallager-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerMaterialStoragePresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerMaterialStoragePresentationCompatibility;
  }

  private applyMobileLabels(body: HTMLTableSectionElement, row: HTMLTableRowElement): void {
    const headers = Array.from(body.closest('table')?.querySelectorAll('thead th') ?? [])
      .map(header => header.textContent ?? '');
    Array.from(row.cells).forEach((cell, index) => {
      const label = headers[index];
      if (label) cell.dataset['label'] = label;
    });
  }

  private state(): RuntimeMaterialStorageState {
    return this.gameState.getState<RuntimeMaterialStorageState>();
  }
}
