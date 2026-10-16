import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import {
  MATERIALS,
  reinforcementEffectText,
  type MaterialCategory,
  type WeaponSlot,
  type WeaponSlotId
} from '../game/game-core';
import { getForgePreviewPresentation } from '../game/forge-presentation-core';
import { GameForgeService } from './game-forge.service';
import { GameStateService, type MutableGameState } from './game-state.service';

interface RuntimeForgePreviewInventoryEntry {
  qty?: number | null;
}

type RuntimeForgePreviewState = MutableGameState & {
  inventory: Record<string, RuntimeForgePreviewInventoryEntry | undefined>;
  forgeJobs: unknown[];
  forgeQueue: unknown[];
  upgrades: {
    forgeSlots: number;
    forgeQueue: number;
  };
};

interface ForgePreviewPresentationCompatibilityBridge {
  render(): void;
}

declare global {
  interface Window {
    NoBrainerForgePreviewPresentationCompatibility?: ForgePreviewPresentationCompatibilityBridge;
  }
}

const FORGE_SLOT_BINDINGS: readonly { id: string; slot: WeaponSlotId }[] = [
  { id: 'slotBaseMaterial', slot: 'baseMaterial' },
  { id: 'slotBlade', slot: 'blade' },
  { id: 'slotBack', slot: 'back' },
  { id: 'slotGripShape', slot: 'gripShape' },
  { id: 'slotGripMaterial', slot: 'gripMaterial' },
  { id: 'slotReinforcementMaterial', slot: 'reinforcementMaterial' }
];

@Injectable({ providedIn: 'root' })
export class GameForgePreviewPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameForge: GameForgeService
  ) {}

  render(): void {
    const startButton = document.getElementById('forgeStartBtn') as HTMLButtonElement | null;
    if (!startButton) return;

    this.populateForgeSelects();

    const weaponForm = (document.getElementById('weaponForm') as HTMLSelectElement | null)?.value || 'dagger';
    const preview = this.gameForge.preview(weaponForm, this.getForgeSelection());
    const complete = preview.slots.every(slot => slot.material);
    const requirements = this.gameForge.requirements(preview.slots);
    const state = this.state();
    const presentation = getForgePreviewPresentation(
      {
        complete,
        hasMaterials: this.gameForge.hasMaterials(requirements),
        hasCapacity:
          state.forgeJobs.length + state.forgeQueue.length <
          state.upgrades.forgeSlots + state.upgrades.forgeQueue,
        seconds: preview.seconds,
        valueNickel: preview.valueNickel,
        factor: preview.factor,
        stats: preview.stats,
        reinforcementMaterial:
          preview.slots.find(slot => slot.slot === 'reinforcementMaterial')?.material || null
      },
      formatCurrencyNickel,
      reinforcementEffectText
    );

    this.setText('forgeTimePreview', presentation.timeText);
    this.setText('forgeValuePreview', presentation.valueText);
    this.setText('forgeDamagePreview', presentation.damageText);
    this.setText('forgeDamageBaseInfo', presentation.damageBaseInfo);
    this.setText('forgeSpeedPreview', presentation.speedText);
    this.setText('forgeSpeedBaseInfo', presentation.speedBaseInfo);
    this.setText('forgeHitPreview', presentation.hitText);
    this.setText('forgeRawPreview', presentation.rawText);
    this.setText('forgePenPreview', presentation.penetrationText);
    this.setText('forgeRarityPreview', presentation.rarityText);
    this.setText('forgeReinforcementPreview', presentation.reinforcementText);
    startButton.disabled = presentation.startDisabled;
    startButton.dataset['forgePreviewPresentationOwner'] = 'angular';
  }

  openLegacyCompatibilityBridge(): void {
    if (window.NoBrainerForgePreviewPresentationCompatibility) {
      throw new Error('NoBrainer-Schmiedevorschau-Präsentationsbrücke ist bereits geöffnet.');
    }
    window.NoBrainerForgePreviewPresentationCompatibility = { render: () => this.render() };
  }

  closeLegacyCompatibilityBridge(): void {
    delete window.NoBrainerForgePreviewPresentationCompatibility;
  }

  private populateForgeSelects(): void {
    const state = this.state();
    const selects = FORGE_SLOT_BINDINGS
      .map(binding => document.getElementById(binding.id) as HTMLSelectElement | null)
      .filter((select): select is HTMLSelectElement => !!select);
    const selections = new Map(selects.map(select => [select.id, select.value || '']));

    for (const select of selects) {
      const categories = (select.dataset['categories'] || '')
        .split(',')
        .map(value => value.trim())
        .filter((value): value is MaterialCategory => value === 'Holz' || value === 'Metall' || value === 'Leder');
      const previous = selections.get(select.id) || '';
      const reservedByOthers = new Map<string, number>();

      for (const other of selects) {
        if (other.id === select.id) continue;
        const material = selections.get(other.id) || '';
        if (material) reservedByOthers.set(material, (reservedByOthers.get(material) || 0) + 1);
      }

      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Material auswählen';
      placeholder.selected = !previous;
      select.appendChild(placeholder);

      const available = Object.entries(MATERIALS)
        .filter(([, material]) => categories.includes(material.category))
        .sort((a, b) => a[1].rarity - b[1].rarity || a[1].category.localeCompare(b[1].category) || a[0].localeCompare(b[0]))
        .filter(([name]) => {
          const stock = Number(state.inventory[name]?.qty) || 0;
          const reserved = reservedByOthers.get(name) || 0;
          return stock - reserved > 0;
        });

      for (const [name, material] of available) {
        const stock = Number(state.inventory[name]?.qty) || 0;
        const reserved = reservedByOthers.get(name) || 0;
        const remaining = stock - reserved;
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `${name} · S${material.rarity} · verfügbar ${remaining}${
          select.id === 'slotReinforcementMaterial' ? ` · ${reinforcementEffectText(name)}` : ''
        }`;
        select.appendChild(option);
      }

      select.value = previous && Array.from(select.options).some(option => option.value === previous) ? previous : '';
    }
  }

  private getForgeSelection(): WeaponSlot[] {
    return FORGE_SLOT_BINDINGS.map(binding => ({
      slot: binding.slot,
      material: (document.getElementById(binding.id) as HTMLSelectElement | null)?.value || null
    }));
  }

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  private state(): RuntimeForgePreviewState {
    return this.gameState.getState<RuntimeForgePreviewState>();
  }
}
