import { Injectable } from '@angular/core';
import {
  CHARACTER_PRESENTATION_CORE_BRIDGE,
  type CharacterPresentationCoreBridge
} from '../game/character-presentation-core';

declare global {
  interface Window {
    NoBrainerCharacterPresentationCore?: CharacterPresentationCoreBridge;
  }
}

const LEGACY_PICKER_KEY = 'function weaponPickerKey(characterId,hand){return `${characterId}:${hand}`;}';
const ADAPTED_PICKER_KEY = `function weaponPickerKey(characterId,hand){return window.NoBrainerCharacterPresentationCore.getWeaponPickerKey(Number(characterId),hand);}`;
const LEGACY_DUNGEON_PICKER_STATE = 'let openDungeonTeamPickerSlot=null;';

const ADAPTED_CHARACTER_CARD = `function renderCharacterCard(c){
  const cls=getCharacterClass(c);
  const presentation=window.NoBrainerCharacterPresentationCore.getCharacterCardPresentation(c,cls,effectiveOffense(c),openWeaponPickerHand);
  const stats=presentation.stats.map(stat=>\`<div class="stat"><span>\${stat.label}</span><b>\${stat.value}</b></div>\`).join("");
  const hands=presentation.hands.map(handPresentation=>{
    const w=getWeaponById(handPresentation.weaponId);
    const weaponHtml=w?weaponCardHtml(w,{status:handPresentation.equippedStatus}):'<div class="empty">'+handPresentation.emptyText+'</div>';
    return \`<div class="hand-section"><div class="hand-section-head"><strong>\${handPresentation.label}</strong><button class="btn smallbtn" onclick="toggleWeaponPicker(\${c.id},'\${handPresentation.hand}')">\${handPresentation.toggleLabel}</button></div><div style="margin-top:10px">\${weaponHtml}</div>\${weaponPickerHtml(c,handPresentation.hand)}</div>\`;
  }).join("");
  return \`<div class="roster-character"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>\${presentation.name}</strong><span class="tag fixed">\${presentation.classTag}</span></div>
    <div class="statrow">\${stats}</div>\${hands}</div>\`;
}

`;

const LEGACY_RENDER_CHARACTER = `function renderCharacter(target){
  const root=document.getElementById(target);if(!root)return;
  if(target==="teamCard"){renderDungeonTeam(root);return;}
  root.innerHTML=state.characters.map(renderCharacterCard).join("");
}`;

const ADAPTED_RENDER_CHARACTER = `function renderCharacter(target){
  if(target==="teamCard"){getDungeonPresentationCompatibility().renderTeam();return;}
  const root=document.getElementById(target);if(!root)return;
  root.innerHTML=state.characters.map(renderCharacterCard).join("");
}`;

@Injectable({ providedIn: 'root' })
export class LegacyCharacterPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerCharacterPresentationCore = CHARACTER_PRESENTATION_CORE_BRIDGE;
    let adapted = this.replaceOnce(
      source,
      LEGACY_DUNGEON_PICKER_STATE,
      '',
      'Legacy-Dungeon-Team-Pickerzustand'
    );
    adapted = this.replaceOnce(adapted, LEGACY_PICKER_KEY, ADAPTED_PICKER_KEY, 'Waffenpicker-Schlüssel');
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderCharacterCard(',
      'function toggleDungeonTeamPicker(',
      ADAPTED_CHARACTER_CARD,
      'Kader-/Charakter-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function toggleDungeonTeamPicker(',
      'function renderCharacter(target){',
      '',
      'Legacy-Dungeon-Team-Interaktionen und -Präsentation'
    );
    adapted = this.replaceOnce(
      adapted,
      LEGACY_RENDER_CHARACTER,
      ADAPTED_RENDER_CHARACTER,
      'Dungeon-Team-Routing im Charakterrender'
    );
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }

  private replaceRangeOnce(
    source: string,
    startMarker: string,
    endMarker: string,
    replacement: string,
    label: string
  ): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
