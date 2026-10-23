import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('src/app/core/game-weapon-image-presentation.service.ts', 'utf8');
assert.match(service, /@Injectable\(\{ providedIn: 'root' \}\)/);
assert.match(service, /getWeaponImageRenderPlan/);
assert.match(service, /getWeaponImageMarkup/);
assert.doesNotMatch(service, /GameStateService|document\.|window\.|localStorage|sessionStorage/);

const css = fs.readFileSync('src/weapon-images-v0.17.0.css', 'utf8');
assert.match(css, /width:\s*64px/);
assert.match(css, /height:\s*64px/);
assert.match(css, /-webkit-mask-image:\s*var\(--weapon-image-atlas\)/);
assert.match(css, /mask-image:\s*var\(--weapon-image-atlas\)/);
assert.match(css, /-webkit-mask-size:\s*512px 64px/);
assert.match(css, /mask-size:\s*512px 64px/);
assert.match(css, /weapon-image-generic-shape/);

const forms = ['dagger', 'sword', 'axe1h', 'sword2h', 'axe2h', 'bow', 'staff'];
for (const form of forms) {
  assert.match(css, new RegExp(`data-weapon-form="${form}"\\]\\s*\\{[^}]*${form}-mask-atlas-64\\.png`));
  const file = `src/weapon-emblems/${form}-mask-atlas-64.png`;
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${file}: PNG-Signatur fehlt.`);
  assert.equal(bytes.readUInt32BE(16), 512, `${file}: Breite muss 512 sein.`);
  assert.equal(bytes.readUInt32BE(20), 64, `${file}: Höhe muss 64 sein.`);
}

const angular = JSON.parse(fs.readFileSync('angular.json', 'utf8'));
const styles = angular.projects.nobrainer.architect.build.options.styles;
assert.equal(styles.filter(value => value === 'src/weapon-images-v0.17.0.css').length, 1);

console.log('Weapon-Image-Presentation-Ownership: Service bleibt zustandslos, CSS/Atlanten sind vollständig und Angular bindet das Stylesheet genau einmal ein.');
