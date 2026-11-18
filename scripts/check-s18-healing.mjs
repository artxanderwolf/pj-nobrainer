import assert from 'node:assert/strict';
import {
  applyHighElfHealing, chooseHighElfHealingAlly, highElfDodgeHealReady,
  highElfHealingAttackSource
} from '../src/app/game/high-elf-healing-core.ts';
import { migrateLegacyHealers } from '../src/app/game/healer-migration-core.ts';

const actor = (id, classId, hp=5, maxHp=10, raceId='high-elf') =>
  ({id,classId,raceId,hp,maxHp,alive:hp>0});
const recruit=actor(1,'recruit',5);
assert.deepEqual(applyHighElfHealing(recruit,[recruit],'dodge'),{target:recruit,healed:1});
assert.equal(recruit.hp,6);
assert.equal(applyHighElfHealing(recruit,[recruit],'periodic'),null);
const fighter=actor(2,'fighter',10);
const worst=actor(3,'archer',2,10);
const other=actor(4,'scholar',4,20);
assert.equal(chooseHighElfHealingAlly(fighter,[other,worst,fighter])?.id,3,'Same % missing: choose smaller ID.');
assert.deepEqual(applyHighElfHealing(fighter,[fighter,other,worst],'dodge'),{target:worst,healed:1});
assert.equal(fighter.hp,10);
assert.equal(highElfDodgeHealReady({2:1500},2,6499),false);
assert.equal(highElfDodgeHealReady({2:1500},2,6500),true);
const archer=actor(5,'archer',9);
assert.equal(highElfHealingAttackSource(archer)[0].speed,0.1);
assert.deepEqual(applyHighElfHealing(archer,[archer],'periodic'),{target:archer,healed:1});
assert.equal(applyHighElfHealing(archer,[archer],'periodic'),null);
const scholar=actor(6,'scholar',10);
const dead=actor(7,'fighter',0);
const injured=actor(8,'fighter',3);
assert.equal(applyHighElfHealing(scholar,[scholar,dead,injured],'periodic')?.target.id,8);
assert.equal(dead.hp,0,'Must never revive fallen targets');
assert.equal(applyHighElfHealing(scholar,[scholar,dead],'periodic'),null,'No valid injured ally');
assert.equal(applyHighElfHealing({...recruit,raceId:'human'},[recruit],'dodge'),null,'Only High Elves can heal');
assert.deepEqual(highElfHealingAttackSource(actor(9,'fighter')),[]);
assert.equal(highElfDodgeHealReady(undefined,1,1000),true);

const oldCharacter={id:17,name:'Altheiler',classId:'healer',raceId:'human',level:9,xp:431,
  hp:12,maxHp:22,equipment:{leftHand:33,rightHand:null}};
const oldEnemy={id:'e2',name:'Heiler 2',classId:'healer',hp:13,maxHp:20,alive:true,
  lootMaterialIds:[58,59],xpDrop:128};
const progress={version:1,claimed:{healer:true},notified:{healer:true},notificationQueue:['healer','weapon_bow'],healerDefeated:3};
const save={characters:[oldCharacter],releaseProgress:progress,teams:{1:{dungeonRun:{
  startedAt:500,participantIds:[17],enemies:[oldEnemy],
  attackPoints:[{side:'player',ownerId:17,kind:'weapon',weaponId:33,nextAt:1200},
                {side:'enemy',ownerId:'e2',kind:'enemy',nextAt:2000}]
}}}};
const original={level:oldCharacter.level,xp:oldCharacter.xp,equipment:structuredClone(oldCharacter.equipment)};
assert.equal(migrateLegacyHealers(save,2000),true);
assert.equal(oldCharacter.classId,'scholar');
assert.equal(oldCharacter.raceId,'high-elf');
assert.deepEqual({level:oldCharacter.level,xp:oldCharacter.xp,equipment:oldCharacter.equipment},original);
assert.equal(oldEnemy.classId,'scholar');
assert.equal(oldEnemy.hp,13);
assert.deepEqual(oldEnemy.lootMaterialIds,[58,59]);
assert.equal(save.teams[1].dungeonRun.attackPoints[0].nextAt,1200);
assert.equal(save.teams[1].dungeonRun.attackPoints[2].kind,'race-heal');
assert.equal(save.teams[1].dungeonRun.attackPoints[2].nextAt,12000);
assert.deepEqual(progress.notificationQueue,['weapon_bow']);
assert.equal(progress.claimed.healer,true,'Legacy flag retained as inert history');
assert.equal(migrateLegacyHealers(save,9999),false,'Migration must be idempotent');
console.log('S18: four High Elf healing triggers, cooldown, target choice, no revive/overheal and active-Save24 healer migration passed.');
