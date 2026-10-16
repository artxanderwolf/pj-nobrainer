import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import {
  MATERIALS,
  getWeaponForm,
  reinforcementEffectText,
  type MaterialCategory,
  type WeaponCraftingSlotId,
  type WeaponSlot
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

const FORGE_SLOT_BINDINGS: readonly { id: string; rowId: string; slot: WeaponCraftingSlotId }[] = [
  { id: 'slotWorkingPart', rowId: 'forgeWorkingPartRow', slot: 'workingPart' },
  { id: 'slotBack', rowId: 'forgeBackRow', slot: 'back' },
  { id: 'slotGripCore', rowId: 'forgeGripCoreRow', slot: 'gripCore' },
  { id: 'slotGripWrap', rowId: 'forgeGripWrapRow', slot: 'gripWrap' },
  { id: 'slotSpecial', rowId: 'forgeSpecialRow', slot: 'special' },
  { id: 'slotParry', rowId: 'forgeParryRow', slot: 'parry' }
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

    const weaponForm = (document.getElementById('weaponForm') as HTMLSelectElement | null)?.value || 'dagger';
    this.populateForgeSelects(weaponForm);

    const slots = this.getForgeSelection();
    const preview = this.gameForge.preview(weaponForm, slots);
    const complete = this.gameForge.isComplete(weaponForm, preview.slots);
    const requirements = this.gameForge.requirements(weaponForm, preview.slots);
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
        reinforcementMaterial: preview.slots.find(slot => slot.slot === 'special')?.material || null
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
    this.setText('forgeMaterialTotalPreview', `${Object.values(requirements).reduce((sum, qty) => sum + qty, 0)} Materialeinheiten`);
    this.renderParryInfo(weaponForm);
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

  private populateForgeSelects(weaponForm: string): void {
    const state = this.state();
    const quantities = this.gameForge.selectionQuantities(weaponForm);
    const form = getWeaponForm(weaponForm);
    const categoriesBySlot = new Map<WeaponCraftingSlotId, readonly MaterialCategory[]>();
    for (const part of form.parts) categoriesBySlot.set(part.materialSlot, part.categories);

    const activeBindings = FORGE_SLOT_BINDINGS.filter(binding => (quantities[binding.slot] ?? 0) > 0);
    const selections = new Map(
      FORGE_SLOT_BINDINGS.map(binding => [
        binding.id,
        (document.getElementById(binding.id) as HTMLSelectElement | null)?.value || ''
      ])
    );

    for (const binding of FORGE_SLOT_BINDINGS) {
      const select = document.getElementById(binding.id) as HTMLSelectElement | null;
      const row = document.getElementById(binding.rowId) as HTMLTableRowElement | null;
      if (!select) continue;
      const needed = quantities[binding.slot] ?? 0;
      const active = needed > 0;
      if (row) row.hidden = !active;
      select.disabled = !active;
      if (!active) {
        select.innerHTML = '';
        select.value = '';
        continue;
      }

      const categories = categoriesBySlot.get(binding.slot) ?? [];
      const previous = selections.get(binding.id) || '';
      const reservedByOthers = new Map<string, number>();

      for (const other of activeBindings) {
        if (other.id === binding.id) continue;
        const selectedMaterial = selections.get(other.id) || '';
        if (!selectedMaterial) continue;
        reservedByOthers.set(
          selectedMaterial,
          (reservedByOthers.get(selectedMaterial) || 0) + (quantities[other.slot] ?? 0)
        );
      }

      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = `Material auswählen · benötigt ${needed}`;
      placeholder.selected = !previous;
      select.appendChild(placeholder);

      const available = Object.entries(MATERIALS)
        .filter(([, material]) => categories.includes(material.category))
        .sort((a, b) => a[1].rarity - b[1].rarity || a[1].category.localeCompare(b[1].category) || a[0].localeCompare(b[0]))
        .filter(([name]) => {
          const stock = Number(state.inventory[name]?.qty) || 0;
          const reserved = reservedByOthers.get(name) || 0;
          return stock - reserved >= needed;
        });

      for (const [name, materialDefinition] of available) {
        const stock = Number(state.inventory[name]?.qty) || 0;
        const reserved = reservedByOthers.get(name) || 0;
        const remaining = stock - reserved;
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `${name} · S${materialDefinition.rarity} · benötigt ${needed} · verfügbar ${remaining}${
          binding.slot === 'special' ? ` · ${reinforcementEffectText(name)}` : ''
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

  private renderParryInfo(weaponForm: string): void {
    const parry = getWeaponForm(weaponForm).parts.find(part => part.id === 'parry');
    this.setText(
      'forgeParryInfo',
      parry
        ? `${parry.quantity}× Parierstange · eigene Materialwahl · Wirkung: R + AW`
        : 'Keine Parierstange bei dieser Waffenform'
    );
  }

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  private state(): RuntimeForgePreviewState {
    return this.gameState.getState<RuntimeForgePreviewState>();
  }
}
