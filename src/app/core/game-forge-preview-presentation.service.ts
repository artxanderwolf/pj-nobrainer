import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import {
  MATERIAL_REFERENCES_BY_ID,
  getWeaponForm,
  reinforcementEffectTextById,
  type MaterialCategory,
  type WeaponCraftingSlotId,
  type WeaponSlot
} from '../game/game-core';
import { getForgePreviewPresentation } from '../game/forge-presentation-core';
import { getMaterialQuantityById, type MaterialStorageInventory } from '../game/material-storage-core';
import { GameForgeService } from './game-forge.service';
import { GameStateService, type MutableGameState } from './game-state.service';

type RuntimeForgePreviewState = MutableGameState & {
  inventory: MaterialStorageInventory;
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
  { id: 'slotParry', rowId: 'forgeParryRow', slot: 'parry' },
  { id: 'slotBowstring', rowId: 'forgeBowstringRow', slot: 'bowstring' }
];

@Injectable({ providedIn: 'root' })
export class GameForgePreviewPresentationService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly gameForge: GameForgeService
  ) {}

  render(): void {
    const startButton = document.getElementById('forgeStartBtn') as HTMLButtonElement | null;
    const previewNextButton = document.getElementById('forgePreviewNextBtn') as HTMLButtonElement | null;
    if (!startButton) return;

    const weaponForm = this.populateWeaponFormSelect();
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
        reinforcementMaterialId: preview.slots.find(slot => slot.slot === 'special')?.materialId ?? null
      },
      formatCurrencyNickel,
      reinforcementEffectTextById
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
    this.renderConstructionInfo(weaponForm);
    // Die Vorschau ist nicht destruktiv und darf immer geöffnet werden.
    // Ob tatsächlich hergestellt werden kann, bleibt ausschließlich am Start-Button validiert.
    if (previewNextButton) previewNextButton.disabled = false;
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

  private populateWeaponFormSelect(): string {
    const select = document.getElementById('weaponForm') as HTMLSelectElement | null;
    if (!select) return 'dagger';

    const previous = select.value || 'dagger';
    const visibleWeaponForms = this.gameForge.visibleWeaponForms();
    select.innerHTML = '';

    for (const weaponForm of visibleWeaponForms) {
      const form = getWeaponForm(weaponForm);
      const unlock = this.gameForge.unlockState(weaponForm);
      const option = document.createElement('option');
      option.value = weaponForm;
      option.disabled = !unlock.unlocked;

      if (!unlock.unlocked) {
        const requirementText = unlock.prerequisites
          .map(requirement => {
            const current = Math.min(requirement.current, requirement.target);
            return `${getWeaponForm(requirement.weaponForm).name} ${current}/${requirement.target}`;
          })
          .join(' · ');
        option.textContent = `${form.name} · gesperrt (${requirementText})`;
      } else if (this.gameForge.isProgressionSource(weaponForm)) {
        const current = Math.min(this.gameForge.craftCount(weaponForm), 10);
        option.textContent = `${form.name} · ${current}/10`;
      } else {
        option.textContent = form.name;
      }
      select.appendChild(option);
    }

    const previousStillUnlocked = visibleWeaponForms.includes(previous) && this.gameForge.unlockState(previous).unlocked;
    const fallback = visibleWeaponForms.find(weaponForm => this.gameForge.unlockState(weaponForm).unlocked) || 'dagger';
    select.value = previousStillUnlocked ? previous : fallback;
    select.dataset['weaponUnlockOwner'] = 'angular';
    select.dataset['visibleWeaponForms'] = visibleWeaponForms.join(',');
    return select.value || fallback;
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
        this.readSelectedMaterialId(binding.id)
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
      const previousMaterialId = selections.get(binding.id) ?? null;
      const reservedByOthers = new Map<number, number>();

      for (const other of activeBindings) {
        if (other.id === binding.id) continue;
        const selectedMaterialId = selections.get(other.id);
        if (!selectedMaterialId) continue;
        reservedByOthers.set(
          selectedMaterialId,
          (reservedByOthers.get(selectedMaterialId) || 0) + (quantities[other.slot] ?? 0)
        );
      }

      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = `Material auswählen · benötigt ${needed}`;
      placeholder.selected = previousMaterialId === null;
      select.appendChild(placeholder);

      const available = Object.values(MATERIAL_REFERENCES_BY_ID)
        .filter(reference => categories.includes(reference.definition.category))
        .sort((a, b) =>
          a.definition.rarity - b.definition.rarity
          || a.definition.category.localeCompare(b.definition.category)
          || a.displayName.localeCompare(b.displayName)
        )
        .filter(reference => {
          const stock = getMaterialQuantityById(state.inventory, reference.materialId);
          const reserved = reservedByOthers.get(reference.materialId) || 0;
          return stock - reserved >= needed;
        });

      for (const reference of available) {
        const stock = getMaterialQuantityById(state.inventory, reference.materialId);
        const reserved = reservedByOthers.get(reference.materialId) || 0;
        const remaining = stock - reserved;
        const option = document.createElement('option');
        option.value = String(reference.materialId);
        option.textContent = `${reference.displayName} · S${reference.definition.rarity} · benötigt ${needed} · verfügbar ${remaining}${
          binding.slot === 'special' ? ` · ${reinforcementEffectTextById(reference.materialId)}` : ''
        }`;
        select.appendChild(option);
      }

      const previousValue = previousMaterialId === null ? '' : String(previousMaterialId);
      select.value = previousValue && Array.from(select.options).some(option => option.value === previousValue)
        ? previousValue
        : '';
    }
  }

  private getForgeSelection(): WeaponSlot[] {
    return FORGE_SLOT_BINDINGS.map(binding => ({
      slot: binding.slot,
      materialId: this.readSelectedMaterialId(binding.id)
    }));
  }

  private readSelectedMaterialId(selectId: string): number | null {
    const value = (document.getElementById(selectId) as HTMLSelectElement | null)?.value || '';
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
  }

  private renderConstructionInfo(weaponForm: string): void {
    const form = getWeaponForm(weaponForm);
    const parry = form.parts.find(part => part.id === 'parry');
    const bowstring = form.parts.find(part => part.id === 'bowstring');
    const details = [
      form.oneHanded ? '1H · belegt eine Hand' : '2H · belegt beide Hände',
      parry ? `${parry.quantity}× Parierstange · Wirkung R + AW` : '',
      bowstring ? `${bowstring.quantity}× Sehne · Leder · Wirkung SF + DS` : ''
    ].filter(Boolean);
    this.setText('forgeParryInfo', details.join(' · '));
  }

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  private state(): RuntimeForgePreviewState {
    return this.gameState.getState<RuntimeForgePreviewState>();
  }
}
