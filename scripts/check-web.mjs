import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const {scripts}=JSON.parse(readFileSync('package.json','utf8'));
const prepare=spawnSync(process.execPath,['scripts/prepare-legacy-runtime.mjs'],{stdio:'inherit'});
if(prepare.status!==0)process.exit(prepare.status??1);
const checks=scripts.check.split(' && ').map(s=>s.replace('npm run ',''))
  .filter(key=>!key.startsWith('check:android'));
checks.push('check:quick-release','check:parallel-dungeons');
for(const key of checks){
  const args=scripts[key].split(' ').slice(1);
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}
console.log(`${checks.length} Web-Prüfungen erfolgreich.`);
