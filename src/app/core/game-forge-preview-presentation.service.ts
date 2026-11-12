import { Injectable } from '@angular/core';
import { productionActiveSlots } from '../game/city-production-capacity-core.ts';
import { type CityLayoutWorldState } from '../game/city-layout-core.ts';
import { formatCurrencyNickel } from '../game/economy-core';
import {
  MATERIAL_REFERENCES_BY_ID,
  getWeaponForm,
  reinforcementEffectTextById,
  type MaterialCategory,
  type WeaponCraftingSlotId,
  type WeaponSlot
} from '../game/game-core';
import {
  WEAPON_CRAFT_UNLOCK_TARGET,
  type WeaponUnlockState
} from '../game/forge-core';
import { getForgePreviewPresentation } from '../game/forge-presentation-core';
import { getForgeMaterialEffects, getForgeMaterialIcon } from '../game/forge-material-picker-core';
import { getMaterialQuantityById, type MaterialStorageInventory } from '../game/material-storage-core';
import { GameForgeService } from './game-forge.service';
import { GameStateService, type MutableGameState } from './game-state.service';
import { GameWeaponPresentationService } from './game-weapon-presentation.service';

type RuntimeForgePreviewState = MutableGameState & CityLayoutWorldState & {
  inventory: MaterialStorageInventory;
  forgeJobs: unknown[];
  forgeQueue: unknown[];
  forgeReadyJobs?: unknown[];
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
    private readonly gameForge: GameForgeService,
    private readonly weaponPresentation: GameWeaponPresentationService
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
          state.forgeJobs.length + state.forgeQueue.length + (state.forgeReadyJobs?.length ?? 0) <
          productionActiveSlots(state, 'forge') + state.upgrades.forgeQueue,
        seconds: preview.seconds,
        valueNickel: preview.valueNickel,
        factor: preview.factor,
        stats: preview.stats,
        reinforcementMaterialId: preview.slots.find(slot => slot.slot === 'special')?.materialId ?? null
      },
      formatCurrencyNickel,
      reinforcementEffectTextById
    );

    this.renderWeaponImagePreview(preview.weaponForm, preview.slots, preview.form.name);
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

  private renderWeaponImagePreview(weaponForm: string, slots: readonly WeaponSlot[], formName: string): void {
    const host = this.ensureWeaponImagePreviewHost();
    if (!host) return;
    host.innerHTML = this.weaponPresentation.renderImage(
      { weaponForm, slots },
      'forge-preview-weapon-image',
      `Waffenvorschau ${formName}`,
      'preview'
    );
    host.dataset['forgeWeaponImageOwner'] = 'angular';
  }

  private ensureWeaponImagePreviewHost(): HTMLElement | null {
    const existing = document.getElementById('forgeWeaponImagePreview');
    if (existing) return existing;

    const previewPage = document.getElementById('forge-preview');
    const card = previewPage?.querySelector<HTMLElement>('.screen-card');
    const scrollRegion = card?.querySelector<HTMLElement>('.scroll-region');
    if (!card || !scrollRegion) return null;

    const host = document.createElement('div');
    host.id = 'forgeWeaponImagePreview';
    host.className = 'forge-weapon-image-preview';
    scrollRegion.insertAdjacentElement('beforebegin', host);
    return host;
  }

  private populateWeaponFormSelect(): string {
    const select = document.getElementById('weaponForm') as HTMLSelectElement | null;
    if (!select) return 'dagger';

    const previous = select.value || 'dagger';
    const visibleWeaponForms = this.gameForge.visibleWeaponForms();
    select.innerHTML = '';

    for (const weaponForm of visibleWeaponForms) {
      const unlock = this.gameForge.unlockState(weaponForm);
      const option = document.createElement('option');
      option.value = weaponForm;
      option.disabled = !unlock.unlocked;
      option.textContent = this.weaponFormOptionText(weaponForm, unlock);
      select.appendChild(option);
    }

    const previousStillUnlocked = visibleWeaponForms.includes(previous) && this.gameForge.unlockState(previous).unlocked;
    const fallback = visibleWeaponForms.find(weaponForm => this.gameForge.unlockState(weaponForm).unlocked) || 'dagger';
    select.value = previousStillUnlocked ? previous : fallback;
    select.dataset['weaponUnlockOwner'] = 'angular';
    select.dataset['visibleWeaponForms'] = visibleWeaponForms.join(',');
    this.renderWeaponFormPicker(select, visibleWeaponForms);
    return select.value || fallback;
  }

  private weaponFormOptionText(weaponForm: string, unlock: WeaponUnlockState): string {
    const form = getWeaponForm(weaponForm);
    if (!unlock.unlocked) {
      const requirementText = unlock.prerequisites
        .map(requirement => {
          const current = Math.min(requirement.current, requirement.target);
          return `${getWeaponForm(requirement.weaponForm).name} ${current}/${requirement.target}`;
        })
        .join(' · ');
      return `${form.name} · gesperrt (${requirementText})`;
    }

    return form.name;
  }

  private renderWeaponFormPicker(select: HTMLSelectElement, visibleWeaponForms: readonly string[]): void {
    let picker = document.getElementById('forgeWeaponPicker') as HTMLDetailsElement | null;
    if (!picker) {
      picker = document.createElement('details');
      picker.id = 'forgeWeaponPicker';
      picker.className = 'forge-weapon-picker';

      const summary = document.createElement('summary');
      summary.className = 'btn full-control forge-weapon-picker-summary';
      summary.setAttribute('aria-label', 'Waffenform wählen');

      const label = document.createElement('span');
      label.id = 'forgeWeaponPickerLabel';
      label.className = 'forge-weapon-picker-label';
      summary.appendChild(label);

      const marker = document.createElement('span');
      marker.className = 'forge-weapon-picker-marker';
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = '⌄';
      summary.appendChild(marker);

      const options = document.createElement('div');
      options.id = 'forgeWeaponPickerOptions';
      options.className = 'forge-weapon-picker-options';
      picker.append(summary, options);
      select.insertAdjacentElement('afterend', picker);
    }

    const label = document.getElementById('forgeWeaponPickerLabel');
    const options = document.getElementById('forgeWeaponPickerOptions');
    if (!label || !options) return;

    const selected = select.value || visibleWeaponForms[0] || 'dagger';
    label.textContent = this.weaponFormOptionText(selected, this.gameForge.unlockState(selected));
    options.replaceChildren();

    for (const weaponForm of visibleWeaponForms) {
      const unlock = this.gameForge.unlockState(weaponForm);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'forge-weapon-option';
      button.dataset['weaponForm'] = weaponForm;
      button.disabled = !unlock.unlocked;
      button.setAttribute('aria-pressed', String(weaponForm === selected));
      button.textContent = this.weaponFormOptionText(weaponForm, unlock);
      button.addEventListener('click', () => {
        if (button.disabled) return;
        select.value = weaponForm;
        picker!.open = false;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      options.appendChild(button);
    }

    picker.dataset['forgeWeaponPickerOwner'] = 'angular';
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
        const remainingAfterSelection = stock - reserved - needed;
        const option = document.createElement('option');
        option.value = String(reference.materialId);
        option.textContent = `${reference.displayName} · S${reference.definition.rarity} · Bestand ${stock} · benötigt ${needed} · danach ${remainingAfterSelection}${
          binding.slot === 'special' ? ` · ${reinforcementEffectTextById(reference.materialId)}` : ''
        }`;
        select.appendChild(option);
      }

      const previousValue = previousMaterialId === null ? '' : String(previousMaterialId);
      select.value = previousValue && Array.from(select.options).some(option => option.value === previousValue)
        ? previousValue
        : '';

      const invalidSelection = previousMaterialId !== null && select.value === '';
      const missingName = invalidSelection
        ? MATERIAL_REFERENCES_BY_ID[previousMaterialId]?.displayName ?? `Material #${previousMaterialId}`
        : '';
      // Ein bereits gewaehltes Material wird nicht unbemerkt auf ein anderes umgestellt.
      // Der Nutzer erhaelt eine sichtbare Begruendung, falls der Bestand nicht reicht.
      this.renderMaterialTrigger(
        select,
        binding,
        needed,
        invalidSelection ? `${missingName} ist für dieses Bauteil nicht mehr ausreichend verfügbar oder ungeeignet. Bitte neu auswählen.` : ''
      );
      selections.set(binding.id, this.readSelectedMaterialId(binding.id));
    }
  }

  private renderMaterialTrigger(
    select: HTMLSelectElement,
    binding: { id: string; rowId: string; slot: WeaponCraftingSlotId },
    needed: number,
    noticeText: string
  ): void {
    select.classList.add('forge-material-native');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    let trigger = document.getElementById(`forgeMaterialTrigger-${binding.slot}`) as HTMLButtonElement | null;
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.id = `forgeMaterialTrigger-${binding.slot}`;
      trigger.className = 'forge-material-trigger';
      trigger.dataset['forgeMaterialSlot'] = binding.slot;
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.addEventListener('click', () => this.openMaterialDialog(binding));
      select.insertAdjacentElement('afterend', trigger);
    }

    trigger.replaceChildren();
    const selectedId = this.readSelectedMaterialId(binding.id);
    const selectedReference = selectedId ? MATERIAL_REFERENCES_BY_ID[selectedId] : null;
    const icon = this.createMaterialIcon(selectedId, selectedReference?.definition.category ?? '');
    const content = document.createElement('span');
    content.className = 'forge-material-trigger-content';
    const name = document.createElement('span');
    name.className = 'forge-material-trigger-name';
    name.textContent = selectedReference?.displayName ?? (select.options.length > 1 ? 'Material auswählen' : 'Kein Material verfügbar');
    const details = document.createElement('span');
    details.className = 'forge-material-trigger-detail';
    const currentOption = Array.from(select.options).find(option => option.value === select.value);
    const stock = selectedId ? getMaterialQuantityById(this.state().inventory, selectedId) : 0;
    details.textContent = selectedReference
      ? `S${selectedReference.definition.rarity} · Lager ${stock} · benötigt ${needed}`
      : `Benötigt ${needed} · ${Math.max(0, select.options.length - 1)} verfügbare Materialien`;
    content.append(name, details);
    const arrow = document.createElement('span');
    arrow.className = 'forge-material-trigger-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '⌄';
    trigger.append(icon, content, arrow);
    trigger.title = currentOption?.textContent ?? '';

    const row = document.getElementById(binding.rowId);
    let notice = row?.querySelector<HTMLElement>('.forge-material-selection-notice') ?? null;
    if (!notice && row) {
      notice = document.createElement('span');
      notice.className = 'forge-material-selection-notice';
      notice.setAttribute('role', 'status');
      trigger.insertAdjacentElement('afterend', notice);
    }
    if (notice) {
      notice.textContent = noticeText;
      notice.hidden = !noticeText;
    }
  }

  private createMaterialIcon(materialId: number | null, category: string): HTMLElement {
    const appearance = getForgeMaterialIcon(materialId ?? 0, category);
    const icon = document.createElement('span');
    icon.className = `forge-material-icon forge-material-icon--${appearance.kind}`;
    icon.style.setProperty('--forge-material-color', appearance.color);
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  private openMaterialDialog(binding: {
    id: string; rowId: string; slot: WeaponCraftingSlotId
  }): void {
    const select = document.getElementById(binding.id) as HTMLSelectElement | null;
    if (!select || select.disabled) return;

    const weaponForm = (document.getElementById('weaponForm') as HTMLSelectElement | null)?.value ?? 'dagger';
    const needed = this.gameForge.selectionQuantities(weaponForm)[binding.slot] ?? 0;
    const currentSlots = this.getForgeSelection();
    const inventory = this.state().inventory;
    const row = document.getElementById(binding.rowId);
    const partName = row?.querySelector('th')?.textContent?.trim() || 'Bauteil';
    const dialog = document.createElement('dialog');
    dialog.className = 'forge-material-dialog';
    dialog.setAttribute('aria-label', `Material wählen: ${partName}`);

    const heading = document.createElement('h2');
    heading.textContent = `Material wählen: ${partName}`;
    const info = document.createElement('p');
    info.className = 'forge-material-dialog-intro';
    info.textContent = `Nur Materialien mit ausreichendem Lagerbestand. Die Werte zeigen den genauen Beitrag dieses Bauteils zur aktuellen Waffenberechnung; der vollständige Endwert steht in der Waffenvorschau.`;
    const choices = document.createElement('div');
    choices.className = 'forge-material-choices';

    const availableIds = Array.from(select.options)
      .map(option => Number(option.value))
      .filter(materialId => Number.isInteger(materialId) && materialId > 0);

    for (const materialId of availableIds) {
      const material = MATERIAL_REFERENCES_BY_ID[materialId];
      if (!material) continue;
      const stock = getMaterialQuantityById(inventory, materialId);
      const reservedOtherSlots = currentSlots
        .filter(slot => slot.slot !== binding.slot && slot.materialId === materialId)
        .reduce((sum, slot) => sum + (this.gameForge.selectionQuantities(weaponForm)[slot.slot as WeaponCraftingSlotId] ?? 0), 0);
      const remaining = stock - reservedOtherSlots - needed;
      if (remaining < 0) continue;

      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'forge-material-choice';
      item.dataset['forgeMaterialId'] = String(materialId);
      item.setAttribute('aria-pressed', String(select.value === String(materialId)));
      const icon = this.createMaterialIcon(materialId, material.definition.category);
      const body = document.createElement('span');
      body.className = 'forge-material-choice-body';
      const title = document.createElement('strong');
      title.textContent = `${material.displayName} · S${material.definition.rarity}`;
      const available = document.createElement('span');
      available.className = 'forge-material-choice-inventory';
      available.textContent = `Benötigt ${needed} · Lager ${stock} · danach ${remaining}`;
      const effect = getForgeMaterialEffects(weaponForm, binding.slot, materialId, currentSlots);
      const stats = document.createElement('span');
      stats.className = 'forge-material-choice-stats';
      stats.textContent = effect.weapon.length
        ? `Waffe: ${effect.weapon.join(' · ')}`
        : 'Waffe: keine direkte Änderung';
      const modifiers = document.createElement('span');
      modifiers.className = 'forge-material-choice-modifiers';
      modifiers.textContent = effect.character.length
        ? `Charakterwerte: ${effect.character.join(' · ')}`
        : 'Charakterwerte: keine zusätzliche Änderung';
      body.append(title, available, stats, modifiers);
      item.append(icon, body);
      item.addEventListener('click', () => {
        dialog.close();
        select.value = String(materialId);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      choices.append(item);
    }

    if (!choices.children.length) {
      const empty = document.createElement('p');
      empty.className = 'forge-material-choice-empty';
      empty.textContent = `Für dieses Bauteil fehlen Materialien in ausreichender Menge (benötigt: ${needed}).`;
      choices.append(empty);
    }

    const actions = document.createElement('div');
    actions.className = 'forge-material-dialog-actions';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn';
    reset.textContent = 'Auswahl entfernen';
    reset.addEventListener('click', () => {
      dialog.close();
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn';
    cancel.textContent = 'Schließen';
    cancel.addEventListener('click', () => dialog.close());
    actions.append(reset, cancel);
    dialog.append(heading, info, choices, actions);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
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

  private setText(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  private state(): RuntimeForgePreviewState {
    return this.gameState.getState<RuntimeForgePreviewState>();
  }
}
