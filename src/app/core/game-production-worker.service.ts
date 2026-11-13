import { Injectable } from '@angular/core';
import { type ProductionWorkerWorld, assignProductionHelper, migrateProductionWorkers,
  operatingBuildings, mayWorkInBuilding, type AssignmentOutcome, type ProductionKind } from '../game/production-worker-core.ts';
import { GameStateService, type MutableGameState } from './game-state.service';
import { GameForgeService } from './game-forge.service';
import { GameMarketService } from './game-market.service';

export interface WorkerAssignmentResult {
  status: AssignmentOutcome;
  completedCount: number;
}
/**
 * Owns the single synchronous helper switch. Settle all prior work before
 * calculating a new deadline; no dungeon or second building can double-book.
 */
@Injectable({ providedIn: 'root' })
export class GameProductionWorkerService {
  constructor(
    private readonly gameState: GameStateService,
    private readonly forge: GameForgeService,
    private readonly market: GameMarketService
  ) {}
  state(): ProductionWorkerWorld { return this.gameState.getState<MutableGameState & ProductionWorkerWorld>(); }
  buildings(kind: ProductionKind) { return operatingBuildings(this.state(),kind); }
  available(buildingId: string, id: number): boolean {
    return mayWorkInBuilding(this.state(),buildingId,id);
  }
  initialize(): boolean { return migrateProductionWorkers(this.state()); }
  assign(kind: ProductionKind, buildingId: string, characterId: number|null, at=Date.now()): WorkerAssignmentResult {
    const state=this.state();
    const building=state.cityLayout?.buildings.find(b=>b.buildingInstanceId===buildingId);
    if (!building || building.buildingTypeId!==kind || building.status!=='placed') {
      return {status:'invalid-building',completedCount:0};
    }
    if (characterId!==null && !mayWorkInBuilding(state,buildingId,characterId)) {
      return {status:state.characters.some(c=>c.id===characterId)?'occupied':'invalid-character',completedCount:0};
    }
    if (building.workerCharacterId===characterId) return {status:'unchanged',completedCount:0};
    const completed=kind==='forge'?this.forge.update(at).completedCount:this.market.update(at).completedCount;
    return {status:assignProductionHelper(state,buildingId,characterId,at),completedCount:completed};
  }
}
