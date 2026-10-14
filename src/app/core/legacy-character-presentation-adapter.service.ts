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

const ADAPTED_DUNGEON_TEAM_PICKER = `function dungeonTeamPresentationCharacters(){
  return state.characters.map(c=>({id:c.id,name:c.name,hp:c.hp,maxHp:c.maxHp,energy:c.energy,maxEnergy:c.maxEnergy,className:getCharacterClass(c).name}));
}
function dungeonTeamPickerHtml(slot){
  const presentation=window.NoBrainerCharacterPresentationCore.getDungeonTeamPickerPresentation(state.dungeonTeamSlots,dungeonTeamPresentationCharacters(),Number(slot),openDungeonTeamPickerSlot);
  if(!presentation.open)return "";
  if(!presentation.candidates.length)return '<div class="team-slot-picker muted small">'+presentation.emptyText+'</div>';
  return '<div class="team-slot-picker">'+presentation.candidates.map(candidate=>'<div class="team-candidate"><div><strong>'+candidate.name+'</strong><div class="sell-meta">'+candidate.meta+'</div></div><button class="btn smallbtn primary" onclick="assignDungeonCharacter('+slot+','+candidate.id+')">'+candidate.assignLabel+'</button></div>').join("")+'</div>';
}
`;

const ADAPTED_DUNGEON_TEAM = `function renderDungeonTeam(root){
  const characters=dungeonTeamPresentationCharacters();
  const locked=!!state.dungeonRun||!!state.dungeonAuto;
  const cycleActive=!!(state.dungeonAuto||state.dungeonRun||state.dungeonCycleOriginalIds?.length);
  const presentation=window.NoBrainerCharacterPresentationCore.getDungeonTeamPresentation(state.dungeonTeamSlots,characters,locked,state.dungeonCycleActiveIds||[],cycleActive);
  const slots=presentation.slots.map(slot=>{
    const picker=dungeonTeamPickerHtml(slot.slotIndex);
    if(!slot.occupied){
      return '<div class="team-slot"><div class="team-slot-head"><strong>'+slot.title+'</strong></div><div class="empty">'+slot.emptyText+'</div><div class="actions"><button class="btn primary" '+(presentation.locked?'disabled':'')+' onclick="toggleDungeonTeamPicker('+slot.slotIndex+')">'+slot.addLabel+'</button></div>'+picker+'</div>';
    }
    const fallen=slot.fallen?'<span class="tag temp">'+slot.fallenLabel+'</span>':"";
    return '<div class="team-slot"><div class="team-slot-head"><strong>'+slot.title+'</strong>'+fallen+'</div><div class="statrow"><div class="stat"><span>HP</span><b>'+slot.hpValue+'</b></div><div class="stat"><span>EN</span><b>'+slot.energyValue+'</b></div></div><div class="actions"><button class="btn" '+(presentation.locked?'disabled':'')+' onclick="removeDungeonCharacter('+slot.slotIndex+')">'+slot.removeLabel+'</button><button class="btn" '+(presentation.locked?'disabled':'')+' onclick="toggleDungeonTeamPicker('+slot.slotIndex+')">'+slot.switchLabel+'</button></div>'+picker+'</div>';
  }).join("");
  root.innerHTML='<div class="team-slot-grid">'+slots+'</div>'+(presentation.locked?'<p class="status-line">'+presentation.lockedText+'</p>':"");
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyCharacterPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerCharacterPresentationCore = CHARACTER_PRESENTATION_CORE_BRIDGE;
    let adapted = this.replaceOnce(source, LEGACY_PICKER_KEY, ADAPTED_PICKER_KEY, 'Waffenpicker-Schlüssel');
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderCharacterCard(',
      'function toggleDungeonTeamPicker(',
      ADAPTED_CHARACTER_CARD,
      'Kader-/Charakter-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function dungeonTeamPickerHtml(',
      'function renderDungeonTeam(',
      ADAPTED_DUNGEON_TEAM_PICKER,
      'Dungeon-Team-Picker-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderDungeonTeam(',
      'function renderCharacter(',
      ADAPTED_DUNGEON_TEAM,
      'Dungeon-Team-Präsentation'
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
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
