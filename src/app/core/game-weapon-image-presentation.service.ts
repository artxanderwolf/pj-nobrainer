import { Injectable } from '@angular/core';
import {
  getWeaponImageRenderPlan,
  type WeaponImageLike,
  type WeaponImageRenderMode
} from '../game/weapon-image-presentation-core.ts';
import {
  getWeaponImageMarkup,
  type WeaponImageMarkupOptions
} from '../game/weapon-image-markup-presentation.ts';

@Injectable({ providedIn: 'root' })
export class GameWeaponImagePresentationService {
  render(
    weapon: WeaponImageLike,
    mode: WeaponImageRenderMode = 'complete',
    options: WeaponImageMarkupOptions = {}
  ): string {
    return getWeaponImageMarkup(getWeaponImageRenderPlan(weapon, mode), options);
  }
}
