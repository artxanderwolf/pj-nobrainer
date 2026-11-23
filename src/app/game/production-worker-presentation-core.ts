import { characterTeamReservation } from './team-core.ts';
import { operatingBuildings, isProductionWorkerReserved, productionRate,
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
    '<p class="muted">Ohne Helfer arbeitet der Betrieb mit 100 %, mit einem regulären Helfer mit 120 %. Zwerge in der Schmiede und Halblinge am Markt brauchen als Helfer 10 % weniger Zeit.</p>'+
    (buildings.length ? buildings.map(building=>{
      const selected=building.workerCharacterId;
      const choices=state.characters.map(c=>{
        const busy=isProductionWorkerReserved(state,c.id,building.buildingInstanceId) ||
          characterTeamReservation(state,c.id)!==null;
        const disabled=busy&&c.id!==selected?' disabled':'';
        return `<option value="${c.id}"${selected===c.id?' selected':''}${disabled}>${escapeHtml(c.name||`Charakter #${c.id}`)}${busy&&c.id!==selected?' (beschäftigt)':''}</option>`;
      }).join('');
      const speed = productionRate(state, building).toLocaleString('de-DE', { style: 'percent', maximumFractionDigits: 1 });
      return `<div class="sell-row"><div><strong>${escapeHtml(building.buildingInstanceId)}</strong><p class="muted">Tempo für neue Aufträge ${speed}</p></div><label>Zusatzhelfer <select data-production-helper-kind="${kind}" data-production-helper-building="${building.buildingInstanceId}"><option value=""${selected===null?' selected':''}>Kein Helfer</option>${choices}</select></label></div>`;
    }).join('') : '<p>Keine fertigen Betriebe vorhanden.</p>');
}
