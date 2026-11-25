import { Injectable, Injector } from '@angular/core';
import { RUNE_DEFINITIONS } from '../game/rune-core.ts';
import {
  availableRuneItems, equipRune, removeRune,
  ensureFirstRuneWorkshop, type RuneWorldState
} from '../game/rune-inventory-core.ts';
import { GameStateService, type MutableGameState } from './game-state.service';
import { GameRuntimeService } from './game-runtime.service';
import { GameDungeonEquipmentSyncService } from './game-dungeon-equipment-sync.service';

type WorkshopState=MutableGameState&RuneWorldState;

@Injectable({providedIn:'root'})
export class GameRuneWorkshopPresentationService {
  private overlay:HTMLElement|null=null;
  private selectedWeaponId:number|null=null;
  private notice='';
  constructor(private readonly gameState:GameStateService,private readonly injector:Injector){}

  open():void {
    const state=this.state();
    if(!state.runeWorkshopUnlocked)return;
    if(!state.cityLayout?.buildings.some(b=>b.buildingTypeId==='runeWorkshop'&&b.status==='placed')){
      if(!ensureFirstRuneWorkshop(state)){
        window.alert('Die kostenlose Runenwerkstatt ist freigeschaltet. Bitte schaffe ein freies 2×2-Stadtfeld; danach wird sie automatisch platziert.');
        return;
      }
      this.injector.get(GameRuntimeService).save(false);
      document.dispatchEvent(new Event('rune-workshop-updated'));
    }
    if(!this.overlay){
      const root=document.createElement('div');
      root.className='rune-workshop-overlay';
      root.dataset['runeWorkshopOwner']='angular';
      root.setAttribute('role','presentation');
      root.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:flex;justify-content:center;align-items:center;padding:12px';
      root.addEventListener('click',this.onClick);
      root.addEventListener('change',this.onChange);
      document.body.appendChild(root);
      this.overlay=root;
      document.addEventListener('keydown',this.onKeyDown);
    }
    this.render();
  }

  close():void {
    if(!this.overlay)return;
    this.overlay.removeEventListener('click',this.onClick);
    this.overlay.removeEventListener('change',this.onChange);
    this.overlay.remove();
    this.overlay=null;
    document.removeEventListener('keydown',this.onKeyDown);
    this.notice='';
  }

  private readonly onKeyDown=(event:KeyboardEvent):void=>{if(event.key==='Escape')this.close();};
  private readonly onChange=(event:Event):void=>{
    const select=event.target;
    if(!(select instanceof HTMLSelectElement)||!select.matches('[data-rune-weapon]'))return;
    this.selectedWeaponId=Number(select.value);
    this.notice='';
    this.render();
  };
  private readonly onClick=(event:MouseEvent):void=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');
    if(!button||!this.overlay?.contains(button))return;
    if(button.dataset['runeClose']!==undefined){this.close();return;}
    if(button.dataset['runeAction']==='equip'||button.dataset['runeAction']==='remove'){
      const weaponId=Number(button.dataset['weaponId']);
      const indexText=button.dataset['runeSocket']??'';
      const index=indexText==='legacy'?'legacy':Number(indexText);
      const state=this.state();
      const before=JSON.stringify(state.weaponInventory);
      let success=false;
      if(button.dataset['runeAction']==='remove')success=removeRune(state,weaponId,index);
      else if(index!=='legacy'){
        const select=this.overlay.querySelector<HTMLSelectElement>(`select[data-rune-picker="${index}"]`);
        success=!!select?.value&&equipRune(state,weaponId,index,select.value);
      }
      if(success){
        this.injector.get(GameDungeonEquipmentSyncService).refresh(Date.now());
        if(this.injector.get(GameRuntimeService).save(false)){
          this.notice='Runenwechsel gespeichert.';
          document.dispatchEvent(new Event('rune-equipment-changed'));
        }else{
          state.weaponInventory=JSON.parse(before) as typeof state.weaponInventory;
          this.notice='Speichern fehlgeschlagen. Runenwechsel rückgängig gemacht.';
        }
      }else this.notice='Runenwechsel nicht möglich. Prüfe Sockel und verfügbares Runenitem.';
      this.render();
    }
  };
  private render():void {
    if(!this.overlay)return;
    const state=this.state();
    const weapons=(state.weaponInventory??[]).filter(w=>!w.starter&&w.id!==0);
    if(!weapons.some(w=>w.id===this.selectedWeaponId))this.selectedWeaponId=weapons[0]?.id??null;
    const current=weapons.find(w=>w.id===this.selectedWeaponId);
    const weaponChoices=weapons.map(w=>`<option value="${w.id}" ${w.id===current?.id?'selected':''}>Waffe #${w.id} · ${this.escape((w as typeof w & {name?:string}).name??w.weaponForm)}</option>`).join('');
    const available=availableRuneItems(state);
    const choices=available.map(r=>`<option value="${r.runeItemId}">${this.escape(RUNE_DEFINITIONS[r.runeDefinitionId].label)} · ${r.runeItemId}</option>`).join('');
    const byId=new Map((state.runeInventory??[]).map(i=>[i.runeItemId,i]));
    const sockets=(current?.runeSockets??[]).map((itemId,index)=>{
      const item=itemId?byId.get(itemId):undefined;
      return `<div style="padding:10px 0;border-bottom:1px solid #766;"><strong>Sockel ${index+1}</strong> · ${item?this.escape(RUNE_DEFINITIONS[item.runeDefinitionId].label)+' ('+itemId+')':'Leer'}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
        <select aria-label="Rune für Sockel ${index+1}" data-rune-picker="${index}" ${choices?'':'disabled'}><option value="">Rune wählen</option>${choices}</select>
        <button type="button" class="btn" data-rune-action="equip" data-weapon-id="${current!.id}" data-rune-socket="${index}" ${choices?'':'disabled'}>Einsetzen / Tauschen</button>
        <button type="button" class="btn" data-rune-action="remove" data-weapon-id="${current!.id}" data-rune-socket="${index}" ${item?'':'disabled'}>Kostenlos entfernen</button></div></div>`;
    }).join('');
    const legacy=current?.legacyRuneItemId?byId.get(current.legacyRuneItemId):undefined;
    const legacyRow=legacy?`<div style="padding:10px 0"><strong>Altwaffen-Bestandsschutz</strong> · ${this.escape(RUNE_DEFINITIONS[legacy.runeDefinitionId].label)} (${legacy.runeItemId})<br>
      <small>Nur die ursprüngliche Rune; beim Entfernen verschwindet dieser Zusatzsockel dauerhaft.</small><br>
      <button type="button" class="btn" data-rune-action="remove" data-weapon-id="${current!.id}" data-rune-socket="legacy">Kostenlos entfernen</button></div>`:'';
    const message=this.notice?`<p role="status">${this.escape(this.notice)}</p>`:'';
    this.overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-label="Runenwerkstatt" class="card" style="max-width:680px;width:100%;max-height:90vh;overflow:auto;padding:20px">
      <header style="display:flex;justify-content:space-between;align-items:center"><h2>✧ Runenwerkstatt</h2><button type="button" class="btn" data-rune-close>Schließen</button></header>
      <p>Neue Runen können bei Bossen in der Waffenkammer gefunden werden. Jede Rune ist ein eigener Gegenstand. Ausbau und Tausch sind kostenlos.</p>
      <p>Im Runenlager: ${available.length} freie Runen · insgesamt ${state.runeInventory?.length??0}</p>
      ${current?`<label>Waffe wählen <select data-rune-weapon>${weaponChoices}</select></label>
      <p>Waffenrang S${current.raritySnapshot??1} · ${current.runeSockets?.length??0} reguläre Sockel</p>
      ${sockets||'<p>Diese Waffe besitzt keine regulären Runensockel.</p>'}${legacyRow}`: '<p>Es sind noch keine selbst geschmiedeten Waffen vorhanden.</p>'}
      ${message}
    </section>`;
  }
  private state():WorkshopState{return this.gameState.getState<WorkshopState>();}
  private escape(v:string):string{return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));}
}
