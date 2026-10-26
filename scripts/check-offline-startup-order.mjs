import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const prepareStart = source.indexOf('  prepare(): void {');
const renderStart = source.indexOf('  renderInitial(): void {');
const stopTickStart = source.indexOf('  stopTick(): void {');

assert.ok(prepareStart >= 0 && renderStart > prepareStart && stopTickStart > renderStart, 'Runtime-Lebenszyklus konnte nicht geprüft werden.');
const prepareBlock = source.slice(prepareStart, renderStart);
const renderBlock = source.slice(renderStart, stopTickStart);

assert.match(source, /pendingStartupOfflineSummary/, 'Startup-Zusammenfassung muss bis nach dem Erst-Render gepuffert werden.');
assert.doesNotMatch(prepareBlock, /offlineProgress\.showSummary/, 'prepare() darf keinen blockierenden Offline-Dialog vor dem Erst-Render öffnen.');
assert.match(prepareBlock, /pendingStartupOfflineSummary = \{ before, after \}/, 'prepare() muss die Offline-Zusammenfassung nur vormerken.');
assert.match(renderBlock, /flushStartupOfflineSummary\(\)/, 'renderInitial() muss die vorgemerkte Offline-Zusammenfassung nach dem Render freigeben.');
assert.match(renderBlock, /requestAnimationFrame/, 'Vor dem Offline-Dialog muss mindestens ein Browser-Frame möglich sein.');
assert.match(renderBlock, /setTimeout/, 'Der Offline-Dialog muss in einem nachgelagerten Browser-Task laufen.');

console.log('Offline-Startup-Reihenfolge: kein blockierender Dialog vor dem Erst-Render.');
