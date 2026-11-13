import { characterTeamReservation } from './team-core.ts';
import { operatingBuildings, isProductionWorkerReserved,
  type ProductionKind, type ProductionWorkerWorld } from './production-worker-core.ts';

const escapeHtml=(value:string):string=>value.replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]??c));
/**
 * Stable-ID selectors for one optional helper per operational building.
 * One permanent NPC worker is implicit even when no helper is assigned.
 */
export function renderProductionWorkerControls(state: ProductionWorkerWorld, kind: ProductionKind): string {
  const buildings=operatingBuildings(state,kind);
  return '<h3>Grundarbeiter und Helfer</h3>'+
    '<p class="muted">Jeder Betrieb arbeitet ohne Kaderhelfer mit 100 %. Ein freier Held erhöht die Geschwindigkeit auf 120 %.</p>'+
    (buildings.length ? buildings.map(building=>{
      const selected=building.workerCharacterId;
      const choices=state.characters.map(c=>{
        const busy=isProductionWorkerReserved(state,c.id,building.buildingInstanceId) ||
          characterTeamReservation(state,c.id)!==null;
        const disabled=busy&&c.id!==selected?' disabled':'';
        return `<option value="${c.id}"${selected===c.id?' selected':''}${disabled}>${escapeHtml(c.name||`Charakter #${c.id}`)}${busy&&c.id!==selected?' (beschäftigt)':''}</option>`;
      }).join('');
      return `<div class="sell-row"><div><strong>${escapeHtml(building.buildingInstanceId)}</strong><p class="muted">Grundarbeiter 100 % · ${selected===null?'kein Helfer':'Helfer +20 %'}</p></div><label>Zusatzhelfer <select data-production-helper-kind="${kind}" data-production-helper-building="${building.buildingInstanceId}"><option value=""${selected===null?' selected':''}>Kein Helfer</option>${choices}</select></label></div>`;
    }).join('') : '<p>Keine fertigen Betriebe vorhanden.</p>');
}
