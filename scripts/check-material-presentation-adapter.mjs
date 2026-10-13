import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(text.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: Endanker fehlt.`);
  return text.slice(0, start) + replacement + '\n\n' + text.slice(end);
}

const displayValueBridge = `function displayVal(v,kind="number"){
  return window.NoBrainerMaterialPresentationCore.formatMaterialValue(v,kind);
}`;

const materialIndexBridge = `function renderMaterialIndex(){
  const body=document.getElementById("materialIndexRows");
  if(!body)return;
  body.innerHTML="";
  Object.entries(MATERIALS).forEach(([name,m])=>{
    const presentation=window.NoBrainerMaterialPresentationCore.getMaterialIndexRowPresentation(name,m,reinforcementEffectText(name),getDungeonMaterialChance(1,name));
    const tr=document.createElement("tr");
    tr.innerHTML="<td>"+presentation.category+"</td>"+
      "<td><strong>"+presentation.name+"</strong></td>"+
      "<td class=\"rarity\">"+presentation.rarityText+"</td>"+
      "<td>"+presentation.baseDamageText+"</td>"+
      "<td>"+presentation.baseSpeedText+"</td>"+
      "<td>"+presentation.bladeText+"</td>"+
      "<td>"+presentation.penetrationText+"</td>"+
      "<td>"+presentation.gripSpeedText+"</td>"+
      "<td>"+presentation.hitChanceText+"</td>"+
      "<td>"+presentation.reinforcementText+"</td>"+
      "<td>"+presentation.dungeonChanceText+"</td>";
    body.appendChild(tr);
  });
}`;

source = replaceRangeOnce(source, 'function displayVal(', 'function renderMaterialIndex(', displayValueBridge, 'Materialwert-Formatierung');
source = replaceRangeOnce(source, 'function renderMaterialIndex(', 'function rarityFactorFromRarity(', materialIndexBridge, 'Materialindex-Präsentation');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.39.material-presentation.js' });
assert.ok(source.includes('window.NoBrainerMaterialPresentationCore.formatMaterialValue'));
assert.ok(source.includes('window.NoBrainerMaterialPresentationCore.getMaterialIndexRowPresentation'));
assert.ok(source.includes('reinforcementEffectText(name)'));
assert.ok(source.includes('getDungeonMaterialChance(1,name)'));
assert.ok(source.includes('function rarityFactorFromRarity(rarity)'));
assert.equal((source.match(/function renderMaterialIndex\(/g) || []).length, 1);

console.log('Material-Presentation-Adapter: Materialindex-Anker, bestehende Drop-/Verstärkungslogik und resultierende JavaScript-Syntax sind konsistent.');
