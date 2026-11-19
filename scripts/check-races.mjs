import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { CHARACTER_RACES, resolveCharacterRaceId, characterRaceName, migrateCharacterRaces } from '../src/app/game/character-race-core.ts';
assert.deepEqual(Object.keys(CHARACTER_RACES), ['human','dwarf','wood-elf','high-elf','halfling']);
assert.equal(resolveCharacterRaceId(undefined),'human');
assert.equal(resolveCharacterRaceId('invalid'),'human');
assert.equal(characterRaceName('high-elf'),'Hochelf');
const legacy={characters:[{id:1,classId:'fighter',level:8,xp:120,equipment:{leftHand:2,rightHand:null}},{id:2,classId:'scholar',raceId:'wood-elf'}]};
const preserved=structuredClone(legacy.characters[0]);
assert.equal(migrateCharacterRaces(legacy),true);
assert.equal(legacy.characters[0].raceId,'human');
assert.deepEqual({...legacy.characters[0],raceId:undefined},{...preserved,raceId:undefined});
assert.equal(legacy.characters[1].raceId,'wood-elf');
assert.equal(migrateCharacterRaces(legacy),false);
const css=readFileSync('src/character-selection-v0.16.0.css','utf8');
assert.match(css,/mask-image:\s*var\(--emblem-image\)/,'Die Rassenfarbe muss im Emblem maskiert sein.');
assert.match(css,/mix-blend-mode:\s*color/,'Die dunklen Emblemkonturen müssen erhalten bleiben.');
assert.doesNotMatch(css,/height:\s*16%;\s*border-radius:\s*999px/,'Ein separater Rassenbalken darf nicht zurückkehren.');
for(const characterClass of ['recruit','fighter','archer','scholar']){
  for(const size of ['small','large']){
    assert.ok(css.includes('.class-emblem-'+size+'[data-class-id="'+characterClass+'"] { --emblem-image:'),
      'Rassenfärbung fehlt für '+characterClass+'/'+size);
  }
}
for(const race of Object.keys(CHARACTER_RACES)){
  assert.ok(css.includes('.class-emblem[data-race-id="'+race+'"]'),
    'Rassenfarbdefinition fehlt für '+race);
}
console.log('S17/S24: stable race IDs, Save migration and masked race colors on all class emblems: OK');
