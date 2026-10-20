import { Injectable } from '@angular/core';
import {
  MATERIAL_REFERENCES,
  getDungeonMaterialDropWeightById,
  reinforcementEffectTextById
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

@Injectable({ providedIn: 'root' })
export class GameMaterialIndexPresentationService {
  render(): void {
    const body = document.getElementById('materialIndexRows');
    if (!(body instanceof HTMLTableSectionElement)) return;

    body.innerHTML = '';
    body.dataset['materialIndexPresentationOwner'] = 'angular';

    for (const reference of MATERIAL_REFERENCES) {
      const presentation = getMaterialIndexRowPresentation(
        reference.displayName,
        reference.definition,
        reinforcementEffectTextById(reference.materialId),
        getDungeonMaterialDropWeightById(1, reference.materialId)
      );
      const row = document.createElement('tr');
      row.innerHTML = `<td>${presentation.category}</td><td><strong>${presentation.name}</strong></td><td class="rarity">${presentation.rarityText}</td><td>${presentation.hpText}</td><td>${presentation.energyText}</td><td>${presentation.armorText}</td><td>${presentation.dodgeText}</td><td>${presentation.strengthFactorText}</td><td>${presentation.precisionText}</td><td>${presentation.threatText}</td><td>${presentation.critChanceText}</td><td>${presentation.critDamageText}</td><td>${presentation.hpRegenText}</td><td>${presentation.energyRegenText}</td><td>${presentation.experienceText}</td><td>${presentation.lifeStealText}</td><td>${presentation.penetrationText}</td><td>${presentation.specialStatText}</td><td>${presentation.specialPercentText}</td><td>${presentation.dungeonChanceText}</td>`;
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

  private applyMobileLabels(body: HTMLTableSectionElement, row: HTMLTableRowElement): void {
    const headers = Array.from(body.closest('table')?.querySelectorAll('thead th') ?? [])
      .map(header => header.textContent ?? '');
    Array.from(row.cells).forEach((cell, index) => {
      const label = headers[index];
      if (label) cell.dataset['label'] = label;
    });
  }
}
