import { Injectable } from '@angular/core';
import { formatCurrencyNickel } from '../game/economy-core';
import {
  CONFIG,
  rarityFactor,
  reinforcementEffectText,
  type WeaponStats
} from '../game/game-core';
import {
  createWeaponPresentationCore,
  type WeaponCardLike
} from '../game/weapon-presentation-core';

export type RuntimeWeaponPresentation = WeaponCardLike & {
  id: number;
  name: string;
  stats?: Partial<WeaponStats> | null;
};

const WEAPON_PRESENTATION = createWeaponPresentationCore({
  resolveFormName: (weaponForm, starter) =>
    CONFIG.forge.weaponForms[weaponForm ?? '']?.name ?? (starter ? 'Einhänder' : 'Waffe'),
  rarityFactor,
  reinforcementEffectText
});

@Injectable({ providedIn: 'root' })
export class GameWeaponPresentationService {
  sortWeaponInventory<TWeapon extends WeaponCardLike>(weapons: readonly TWeapon[]): TWeapon[] {
    return WEAPON_PRESENTATION.sortWeaponInventory(weapons);
  }

  renderCard(
    weapon: RuntimeWeaponPresentation,
    compareWeapon: RuntimeWeaponPresentation | null = null,
    status = '',
    actions = ''
  ): string {
    const presentation = WEAPON_PRESENTATION.getWeaponCardPresentation(weapon, compareWeapon);
    const statHtml = presentation.stats.map(stat => {
      const value = stat.value.kind === 'currency' ? formatCurrencyNickel(stat.value.nickel) : stat.value.text;
      const diff = stat.diff ? ` <span class="weapon-diff ${stat.diff.tone}">${stat.diff.text}</span>` : '';
      return `<div class="weapon-stat"><span>${stat.label}</span><b>${value}${diff}</b></div>`;
    }).join('');
    const reinforcement = presentation.reinforcementText ? ` · ${presentation.reinforcementText}` : '';
    const statusHtml = status ? `<span class="tag fixed">${status}</span>` : '';

    return `<div class="weapon-card"><div class="weapon-card-head"><div><div class="weapon-card-title">${presentation.title}</div><div class="weapon-card-sub">${presentation.formName} · ${presentation.rarityLabel}${reinforcement}</div></div>${statusHtml}</div><div class="weapon-stats">${statHtml}</div>${actions}</div>`;
  }
}
