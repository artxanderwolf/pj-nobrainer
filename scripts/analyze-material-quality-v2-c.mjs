import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MATERIAL_REFERENCES, getMaterialQualityDefinitionById, getWeaponForm } from '../src/app/game/game-core.ts';
import { MATERIAL_QUALITIES, rollMaterialQuality } from '../src/app/game/material-quality-core.ts';

const forms = ['dagger','sword','axe1h','sword2h','axe2h','bow','staff'];
const rows = [], inactiveProfiles = [];
for (const ref of MATERIAL_REFERENCES) for (const quality of MATERIAL_QUALITIES) {
  const definition = getMaterialQualityDefinitionById(ref.materialId, quality);
  assert.ok(definition);
  for (const value of Object.values(definition.stats)) assert.ok(Number.isFinite(value) && value >= 0);
  const uses = forms.flatMap(form => getWeaponForm(form).parts.filter(p => p.categories.includes(ref.definition.category))
    .map(part => ({ form, slot:part.materialSlot, activeStats:part.statKeys.filter(k => definition.stats[k] !== 0) })));
  if (quality === 1 && !uses.some(u => u.activeStats.length)) inactiveProfiles.push(ref.materialId);
  rows.push({materialId:ref.materialId,name:ref.displayName,category:definition.category,materialTier:ref.definition.rarity,quality,...definition.stats,uses});
}
assert.equal(rows.length, 462);
const statistics = [];
for (const seed of [7919,104729,524287]) {
  let state = seed >>> 0;
  const counts = Array(6).fill(0);
  for (let n=0;n<1_000_000;n++) {
    state = (Math.imul(state,1664525)+1013904223)>>>0;
    counts[rollMaterialQuality(state / 4294967296)-1]++;
  }
  statistics.push({seed,trials:1_000_000,counts});
}
const fields = Object.keys(rows[0]).filter(k => k !== 'uses');
const csv = [fields.join(','),...rows.map(r=>fields.map(k=>JSON.stringify(r[k])).join(','))].join('\n')+'\n';
mkdirSync('.generated',{recursive:true});
writeFileSync('.generated/material-quality-462.csv',csv);
writeFileSync('.generated/material-quality-analysis.json',JSON.stringify({rows,statistics,inactiveProfiles},null,2)+'\n');
console.log(JSON.stringify({combinations:rows.length,statistics,inactiveProfiles}));
