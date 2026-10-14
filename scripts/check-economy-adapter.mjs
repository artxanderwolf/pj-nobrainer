import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const source = match[1];

const durationBlock = `function formatDuration(seconds){
  const total=Math.max(0,Math.ceil(Number(seconds)||0));
  const hours=Math.floor(total/3600);
  const minutes=Math.floor((total%3600)/60);
  const secs=total%60;
  const parts=[];
  if(hours>0)parts.push(\`${'${hours}'} Std.\`);
  if(minutes>0 || hours>0)parts.push(\`${'${minutes}'} Min.\`);
  parts.push(\`${'${secs}'} Sek.\`);
  return parts.join(" ");
}`;

const durationBridge = `function formatDuration(seconds){
  return window.NoBrainerEconomyCore.formatDuration(seconds);
}`;

const first = source.indexOf(durationBlock);
assert.ok(first >= 0, 'Zeitformatierung: Legacy-Block fehlt.');
assert.equal(source.indexOf(durationBlock, first + durationBlock.length), -1, 'Zeitformatierung: Legacy-Block ist nicht eindeutig.');

const adapted = source.slice(0, first) + durationBridge + source.slice(first + durationBlock.length);
assert.ok(adapted.includes('window.NoBrainerEconomyCore.formatDuration(seconds)'), 'Zeitformatierung: Bridge wurde nicht erzeugt.');
assert.ok(!adapted.includes('const hours=Math.floor(total/3600);'), 'Zeitformatierung: Legacy-Implementierung ist noch vorhanden.');
assert.ok(adapted.includes('renderForgeJob()'), 'Regression: Schmiede-Renderpfad fehlt.');
assert.ok(adapted.includes('renderMarketJob()'), 'Regression: Markt-Renderpfad fehlt.');
assert.ok(adapted.includes('const tbody=document.getElementById("inventoryRows")'), 'Regression: Materiallager-Renderpfad fehlt.');
assert.ok(adapted.includes('renderDungeonStatus()'), 'Regression: Dungeon-Renderpfad fehlt.');

console.log('Economy-Adapter: Zeitformatierung wird isoliert gebridged; kritische Renderpfade bleiben erhalten.');
