import { CHARACTER_CLASSES, type CharacterClassId } from './game-core.ts';
import { CHARACTER_RACES, type CharacterRaceId } from './character-race-core.ts';
import type { CityLayoutWorldState } from './city-layout-core.ts';

export interface TavernApplicant {
  /** Durable unique offer identity, not a display name or slot index. */
  applicantId: string;
  classId: CharacterClassId;
  raceId: CharacterRaceId;
}
export interface TavernOffers {
  berlinDate: string;
  manualRefreshDate: string | null;
  nextApplicantNumber: number;
  byBuildingId: Record<string, TavernApplicant[]>;
}
export interface TavernOfferWorldState extends CityLayoutWorldState {
  tavernOffers?: TavernOffers;
}

const CLASS_WEIGHTS: readonly [CharacterClassId, number][] = [
  ['recruit',35],['fighter',25],['archer',20],['scholar',20]
];
const RACE_WEIGHTS: readonly [CharacterRaceId, number][] = [
  ['human',30],['dwarf',20],['wood-elf',20],['high-elf',10],['halfling',20]
];
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
});

/** An actual Berlin calendar date: works across both DST transitions. */
export function berlinCalendarDate(now: number): string {
  if (!Number.isFinite(now)) throw new Error('Ungültiger Zeitpunkt für den Tavernenwechsel.');
  const parts=DATE_FORMAT.formatToParts(new Date(now));
  const part=(type:string)=>parts.find(p=>p.type===type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function weightedTavernChoice<T extends string>(entries: readonly (readonly [T,number])[], roll: number): T {
  const normalized=Math.max(0,Math.min(0.999999999999,Number.isFinite(roll)?roll:0));
  let cursor=normalized*entries.reduce((sum,[,weight])=>sum+weight,0);
  for(const [id,weight] of entries){cursor-=weight;if(cursor<0)return id;}
  return entries[entries.length-1][0];
}
export function rollTavernApplicant(offers:TavernOffers,random:()=>number): TavernApplicant {
  const classId=weightedTavernChoice(CLASS_WEIGHTS,random());
  const raceId=weightedTavernChoice(RACE_WEIGHTS,random());
  return {applicantId:`applicant-${offers.nextApplicantNumber++}`,classId,raceId};
}
function activeTaverns(state:TavernOfferWorldState): string[] {
  return (state.cityLayout?.buildings??[])
    .filter(b=>b.buildingTypeId==='tavern'&&b.status==='placed')
    .map(b=>b.buildingInstanceId);
}
/** Initialize once, update only for a new Berlin day or a newly available building. */
export function synchronizeTavernOffers(state:TavernOfferWorldState,now=Date.now(),random:()=>number=Math.random):boolean {
  const date=berlinCalendarDate(now);
  let changed=false;
  if(!state.tavernOffers){
    state.tavernOffers={berlinDate:date,manualRefreshDate:null,nextApplicantNumber:1,byBuildingId:{}};
    changed=true;
  }
  const offers=state.tavernOffers;
  if(offers.berlinDate!==date){
    offers.berlinDate=date;
    offers.byBuildingId={};
    changed=true;
  }
  for(const id of activeTaverns(state)){
    if(!Object.prototype.hasOwnProperty.call(offers.byBuildingId,id)){
      offers.byBuildingId[id]=[rollTavernApplicant(offers,random),rollTavernApplicant(offers,random)];
      changed=true;
    }
  }
  return changed;
}
export function refreshAllTavernsOncePerDay(state:TavernOfferWorldState,now=Date.now(),random:()=>number=Math.random): boolean {
  synchronizeTavernOffers(state,now,random);
  const offers=state.tavernOffers!;
  if(offers.manualRefreshDate===offers.berlinDate)return false;
  offers.manualRefreshDate=offers.berlinDate;
  for(const id of activeTaverns(state)){
    offers.byBuildingId[id]=[rollTavernApplicant(offers,random),rollTavernApplicant(offers,random)];
  }
  return true;
}
export function availableTavernApplicants(state:TavernOfferWorldState,buildingId:string):readonly TavernApplicant[]{
  if(!activeTaverns(state).includes(buildingId))return [];
  return state.tavernOffers?.byBuildingId[buildingId]??[];
}
export function findTavernApplicant(state:TavernOfferWorldState,applicantId:string):
  {buildingId:string;applicant:TavernApplicant}|null{
  for(const buildingId of activeTaverns(state)){
    const applicant=state.tavernOffers?.byBuildingId[buildingId]?.find(x=>x.applicantId===applicantId);
    if(applicant)return {buildingId,applicant};
  }
  return null;
}
export function consumeTavernApplicant(state:TavernOfferWorldState,applicantId:string):boolean {
  const match=findTavernApplicant(state,applicantId);
  if(!match)return false;
  const offers=state.tavernOffers!.byBuildingId[match.buildingId];
  const index=offers.findIndex(x=>x.applicantId===applicantId);
  if(index<0)return false;
  offers.splice(index,1);
  return true;
}
export const TAVERN_RACE_WEIGHTS=RACE_WEIGHTS;
export const TAVERN_CLASS_WEIGHTS=CLASS_WEIGHTS;
