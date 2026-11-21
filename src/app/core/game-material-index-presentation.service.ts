import { MATERIAL_QUALITIES, type MaterialQuality } from '../game/material-quality-core.ts';
import { getMaterialQualityDefinitionById } from '../game/game-core.ts';
import { getWeaponMaterialColorById } from '../game/weapon-material-colors.ts';
import { GENERATED_DUNGEON_ENEMY_DEFINITIONS } from '../game/data/generated/game-data.generated.ts';
import { DUNGEON_NAMES } from '../game/mission-core.ts';
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

    let qualitySelect = document.getElementById('materialIndexQuality') as HTMLSelectElement | null;
    if (!qualitySelect) {
      const label = document.createElement('label');
      label.textContent = 'Materialqualität anzeigen: ';
      qualitySelect = document.createElement('select');
      qualitySelect.id = 'materialIndexQuality';
      for (const quality of MATERIAL_QUALITIES) { const option = document.createElement('option'); option.value = String(quality); option.textContent = `S${quality}`; qualitySelect.append(option); }
      qualitySelect.addEventListener('change', () => this.render());
      label.append(qualitySelect);
      body.closest('table')!.insertAdjacentElement('beforebegin', label);
    }
    const quality = Number(qualitySelect.value) as MaterialQuality;
    body.innerHTML = '';
    body.dataset['materialIndexPresentationOwner'] = 'angular';

    for (const reference of MATERIAL_REFERENCES) {
      const presentation = getMaterialIndexRowPresentation(
        reference.displayName,
        getMaterialQualityDefinitionById(reference.materialId, quality)!,
        reinforcementEffectTextById(reference.materialId),
        getDungeonMaterialDropWeightById(1, reference.materialId)
      );
      const row = document.createElement('tr');
      row.dataset['materialId'] = String(reference.materialId);
      row.dataset['quality'] = String(quality);
      row.innerHTML = `<td>${presentation.category}</td><td><strong>${presentation.name}</strong></td><td class="rarity">${presentation.rarityText}</td><td>${presentation.hpText}</td><td>${presentation.energyText}</td><td>${presentation.armorText}</td><td>${presentation.dodgeText}</td><td>${presentation.strengthFactorText}</td><td>${presentation.precisionText}</td><td>${presentation.threatText}</td><td>${presentation.critChanceText}</td><td>${presentation.critDamageText}</td><td>${presentation.hpRegenText}</td><td>${presentation.energyRegenText}</td><td>${presentation.experienceText}</td><td>${presentation.lifeStealText}</td><td>${presentation.penetrationText}</td><td>${presentation.specialStatText}</td><td>${presentation.specialPercentText}</td><td>${presentation.dungeonChanceText}</td>`;
      const name = row.querySelector('strong'); if (name) name.style.color = getWeaponMaterialColorById(reference.materialId) ?? '';
      const source = Object.entries(GENERATED_DUNGEON_ENEMY_DEFINITIONS).flatMap(([id,enemies]) => Object.values(enemies).filter(enemy => (enemy.lootMaterialIds as readonly number[]).includes(reference.materialId)).map(enemy => `${DUNGEON_NAMES[Number(id)-1]} · ${enemy.name}`));
      row.lastElementChild!.textContent = `${source.join(' / ')} · ${reference.definition.dungeonDropWeight}`;
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
