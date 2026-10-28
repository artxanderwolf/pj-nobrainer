const LEGACY_WEAPON_FORM_KEY = 'weaponType';

function countOccurrences(source: string, search: string): number {
  return source.split(search).length - 1;
}

function replaceExpected(
  source: string,
  search: string,
  replacement: string,
  expectedCount: number,
  label: string
): string {
  const actualCount = countOccurrences(source, search);
  if (actualCount !== expectedCount) {
    throw new Error(`Waffenbenennung-Kompatibilität fehlgeschlagen: ${label} wurde ${actualCount} statt ${expectedCount} Mal gefunden.`);
  }
  return source.split(search).join(replacement);
}

function replaceOnce(source: string, search: string, replacement: string, label: string): string {
  return replaceExpected(source, search, replacement, 1, label);
}

const LEGACY_MIGRATE_WEAPON_AFTER_RENAME = `function migrateWeaponToCurrentRules(w){
  if(!w || w.starter || w.id===0)return cloneStarterWeapon();
  const slots=normalizeWeaponSlots(w.slots);
  if(slots.length!==6)return {...w,slots};
  const stats=calculateWeaponStats(slots,w.weaponForm);
  const factor=rarityFactor(slots);
  const type=CONFIG.forge.weaponForms[w.weaponForm]||CONFIG.forge.weaponForms.sword;
  return {
    ...w,
    slots,
    stats,
    valueNickel:Math.round(100*factor),
    craftedSeconds:Math.round(CONFIG.forge.baseSeconds*(type.timeFactor??1)*factor)
  };
}`;

const CURRENT_MIGRATE_WEAPON = `function normalizeWeaponBlueprintSlots(slots,weaponForm){
  const normalized=normalizeWeaponSlots(slots),active=window.NoBrainerGameCore.getWeaponCraftingSlots(weaponForm);
  return active.map(slot=>{
    let material=normalized.find(entry=>entry.slot===slot)?.material||null;
    if(!material&&slot==="parry")material=normalized.find(entry=>entry.slot==="back")?.material||null;
    return {slot,material};
  });
}

function migrateWeaponToCurrentRules(w){
  if(!w || w.starter || w.id===0)return cloneStarterWeapon();
  const cleanWeapon={...w};
  const weaponForm=cleanWeapon.weaponForm||cleanWeapon["${LEGACY_WEAPON_FORM_KEY}"]||"sword";
  delete cleanWeapon["${LEGACY_WEAPON_FORM_KEY}"];
  const slots=normalizeWeaponBlueprintSlots(cleanWeapon.slots,weaponForm);
  if(!window.NoBrainerGameCore.isWeaponSelectionComplete(slots,weaponForm))return {...cleanWeapon,weaponForm,slots};
  const stats=calculateWeaponStats(slots,weaponForm);
  const factor=rarityFactor(slots);
  const form=CONFIG.forge.weaponForms[weaponForm]||CONFIG.forge.weaponForms.sword;
  return {
    ...cleanWeapon,
    weaponForm,
    slots,
    stats,
    valueNickel:Math.round(100*factor),
    craftedSeconds:Math.round(CONFIG.forge.baseSeconds*(form.timeFactor??1)*factor)
  };
}`;

const LEGACY_MIGRATE_FORGE_JOB_AFTER_RENAME = `function migrateForgeJobToCurrentRules(j){
  if(!j)return j;
  const slots=normalizeWeaponSlots(j.slots);
  if(slots.length!==6)return {...j,slots};
  const stats=calculateWeaponStats(slots,j.weaponForm);
  const factor=rarityFactor(slots);
  const type=CONFIG.forge.weaponForms[j.weaponForm]||CONFIG.forge.weaponForms.sword;
  const totalSeconds=Math.round(CONFIG.forge.baseSeconds*(type.timeFactor??1)*factor);
  const migrated={...j,slots,stats,valueNickel:Math.round(100*factor),totalSeconds};
  if(Number.isFinite(Number(j.startedAt)))migrated.finishesAt=Number(j.startedAt)+totalSeconds*1000;
  return migrated;
}`;

const CURRENT_MIGRATE_FORGE_JOB = `function migrateForgeJobToCurrentRules(j){
  if(!j)return j;
  const cleanJob={...j};
  const weaponForm=cleanJob.weaponForm||cleanJob["${LEGACY_WEAPON_FORM_KEY}"]||"sword";
  delete cleanJob["${LEGACY_WEAPON_FORM_KEY}"];
  const slots=normalizeWeaponBlueprintSlots(cleanJob.slots,weaponForm);
  if(!window.NoBrainerGameCore.isWeaponSelectionComplete(slots,weaponForm))return {...cleanJob,weaponForm,slots};
  const stats=calculateWeaponStats(slots,weaponForm);
  const factor=rarityFactor(slots);
  const form=CONFIG.forge.weaponForms[weaponForm]||CONFIG.forge.weaponForms.sword;
  const totalSeconds=Math.round(CONFIG.forge.baseSeconds*(form.timeFactor??1)*factor);
  const migrated={...cleanJob,weaponForm,slots,stats,valueNickel:Math.round(100*factor),totalSeconds};
  if(Number.isFinite(Number(cleanJob.startedAt)))migrated.finishesAt=Number(cleanJob.startedAt)+totalSeconds*1000;
  return migrated;
}

function migrateMarketJobToCurrentRules(job){
  if(!job || job.type!=="weapon" || !job.weaponSnapshot)return job;
  return {...job,weaponSnapshot:migrateWeaponToCurrentRules(job.weaponSnapshot)};
}`;

const CURRENT_FIND_WEAKEST_STARTER = `function findWeakestStarterSlots(){
  return window.NoBrainerGameCore.getStarterBlueprint();
}`;

const CURRENT_GET_FORGE_SELECTION = `function getForgeSelection(){
  return {
    weaponForm:document.getElementById("weaponForm")?.value||"dagger",
    slots:[
      {slot:"workingPart",material:document.getElementById("slotWorkingPart")?.value},
      {slot:"back",material:document.getElementById("slotBack")?.value},
      {slot:"gripCore",material:document.getElementById("slotGripCore")?.value},
      {slot:"gripWrap",material:document.getElementById("slotGripWrap")?.value},
      {slot:"special",material:document.getElementById("slotSpecial")?.value},
      {slot:"parry",material:document.getElementById("slotParry")?.value},
      {slot:"bowstring",material:document.getElementById("slotBowstring")?.value}
    ]
  };
}`;

const CURRENT_FORGE_PREVIEW = `function forgePreview(){
  const x=getForgeSelection(),form=CONFIG.forge.weaponForms[x.weaponForm];
  const complete=window.NoBrainerGameCore.isWeaponSelectionComplete(x.slots,x.weaponForm);
  if(!complete){
    return {
      ...x,
      form,
      factor:1,
      valueNickel:100,
      seconds:Math.round(CONFIG.forge.baseSeconds*form.timeFactor),
      stats:window.NoBrainerForgeCompatibility?.preview?.(x.weaponForm,x.slots)?.stats||{damagePerHit:0,attackSpeed:0,hitChance:0,penetration:0,expectedRaw:0}
    };
  }
  const factor=rarityFactor(x.slots),stats=calculateWeaponStats(x.slots,x.weaponForm);
  return {...x,form,factor,valueNickel:Math.round(100*factor),seconds:Math.round(CONFIG.forge.baseSeconds*form.timeFactor*factor),stats};
}`;

const CURRENT_START_FORGE_JOB = `function startForgeJob(){
  if(state.forgeJobs.length+state.forgeQueue.length>=state.upgrades.forgeSlots+state.upgrades.forgeQueue){alert("Alle Herstellungs- und Warteschlangenplätze sind belegt.");return;}
  const preview=forgePreview();if(!window.NoBrainerGameCore.isWeaponSelectionComplete(preview.slots,preview.weaponForm)){alert("Bitte für alle benötigten Bauteile ein Material auswählen.");return;}
  const required=requirements(preview.weaponForm,preview.slots),invalid=Object.entries(required).find(([name,qty])=>(state.inventory[name]?.qty||0)<qty);
  if(invalid){const [name,qty]=invalid;alert(\`Nicht genügend \${name} vorhanden. Benötigt: \${qty}, Lager: \${state.inventory[name]?.qty||0}.\`);return;}
  Object.entries(required).forEach(([name,qty])=>{state.inventory[name].qty-=qty;if(state.inventory[name].qty<=0)delete state.inventory[name];});
  const finalName=(document.getElementById("forgeWeaponName")?.value||"").trim()||preview.form.name;
  const job={weaponForm:preview.weaponForm,weaponName:finalName,slots:preview.slots.map(x=>({...x})),stats:{...preview.stats},valueNickel:preview.valueNickel,totalSeconds:preview.seconds};
  if(state.forgeJobs.length<state.upgrades.forgeSlots){startForgeQueuedJob(job);addLog(\`Schmiedeauftrag gestartet: \${finalName}.\`,"good");}
  else{state.forgeQueue.push(job);addLog(\`Schmiedeauftrag eingereiht: \${finalName}.\`,"good");}
  const nameInput=document.getElementById("forgeWeaponName");if(nameInput)nameInput.value="";render();
}`;

const CURRENT_FINISH_FORGE_JOB = `function finishForgeJob(job){
  const form=CONFIG.forge.weaponForms[job.weaponForm]||CONFIG.forge.weaponForms.sword;
  state.weaponInventory.unshift({id:state.nextWeaponId++,name:job.weaponName||form.name,weaponForm:job.weaponForm,slots:job.slots,stats:job.stats,valueNickel:job.valueNickel,craftedSeconds:job.totalSeconds});
  addLog(\`Schmiede fertig: \${job.weaponName||form.name} wurde dem Waffeninventar hinzugefügt.\`,"good");
}`;

export function adaptLegacyWeaponScript(source: string): string {
  let adapted = source;

  adapted = replaceExpected(adapted, 'slotWeaponType', 'slotBaseMaterial', 1, 'Legacy-DOM-ID slotWeaponType');
  adapted = replaceExpected(adapted, 'weaponTypes', 'weaponForms', 7, 'Legacy-Konfiguration weaponTypes');
  adapted = replaceExpected(adapted, 'weaponType', 'weaponForm', 17, 'Legacy-Feld weaponType');
  adapted = replaceExpected(adapted, 'typeDamageFactor', 'formDamageFactor', 1, 'Legacy-Stat typeDamageFactor');
  adapted = replaceExpected(adapted, 'typeSpeedFactor', 'formSpeedFactor', 1, 'Legacy-Stat typeSpeedFactor');
  adapted = replaceExpected(adapted, '"Waffentyp"', '"baseMaterial"', 2, 'Legacy-Slot Waffentyp');
  adapted = replaceExpected(adapted, '"Schneide"', '"blade"', 2, 'Legacy-Slot Schneide');
  adapted = replaceExpected(adapted, '"Rückseite"', '"back"', 2, 'Legacy-Slot Rückseite');
  adapted = replaceExpected(adapted, '"Griffform"', '"gripShape"', 2, 'Legacy-Slot Griffform');
  adapted = replaceExpected(adapted, '"Griffmaterial"', '"gripMaterial"', 2, 'Legacy-Slot Griffmaterial');
  adapted = replaceExpected(adapted, '"Verstärkungsmaterial"', '"reinforcementMaterial"', 3, 'Legacy-Slot Verstärkungsmaterial');

  const starterStart = adapted.indexOf('function findWeakestStarterSlots(){');
  const starterEnd = adapted.indexOf('const WEAKEST_STARTER=', starterStart);
  if (starterStart < 0 || starterEnd < 0) throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: Starterwaffen-Block wurde nicht gefunden.');
  adapted = adapted.slice(0, starterStart) + CURRENT_FIND_WEAKEST_STARTER + '\n\n' + adapted.slice(starterEnd);

  adapted = replaceOnce(adapted, LEGACY_MIGRATE_WEAPON_AFTER_RENAME, CURRENT_MIGRATE_WEAPON, 'Waffen-Save-Migration');
  adapted = replaceOnce(adapted, LEGACY_MIGRATE_FORGE_JOB_AFTER_RENAME, CURRENT_MIGRATE_FORGE_JOB, 'Schmiedeauftrag-Save-Migration');

  adapted = replaceOnce(
    adapted,
    'merged.marketJobs=Array.isArray(raw.marketJobs)?raw.marketJobs:[];',
    'merged.marketJobs=(Array.isArray(raw.marketJobs)?raw.marketJobs:[]).map(migrateMarketJobToCurrentRules);',
    'Marktaufträge-Migration'
  );
  adapted = replaceOnce(
    adapted,
    'merged.marketQueue=Array.isArray(raw.marketQueue)?raw.marketQueue:[];',
    'merged.marketQueue=(Array.isArray(raw.marketQueue)?raw.marketQueue:[]).map(migrateMarketJobToCurrentRules);',
    'Marktwarteschlange-Migration'
  );
  adapted = replaceOnce(
    adapted,
    'if(raw.marketJob && merged.marketJobs.length===0)merged.marketJobs.push(raw.marketJob);',
    'if(raw.marketJob && merged.marketJobs.length===0)merged.marketJobs.push(migrateMarketJobToCurrentRules(raw.marketJob));',
    'Legacy-Einzelmarktauftrag-Migration'
  );

  const selectionStart = adapted.indexOf('function getForgeSelection(){');
  const selectionEnd = adapted.indexOf('function normalizeWeaponSlots(', selectionStart);
  if (selectionStart < 0 || selectionEnd < 0) throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: Schmiedeauswahl-Block wurde nicht gefunden.');
  adapted = adapted.slice(0, selectionStart) + CURRENT_GET_FORGE_SELECTION + '\n\n' + adapted.slice(selectionEnd);

  const previewStart = adapted.indexOf('function forgePreview(){');
  const previewEnd = adapted.indexOf('function renderForgePreview(){', previewStart);
  if (previewStart < 0 || previewEnd < 0) throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: Schmiedevorschau-Block wurde nicht gefunden.');
  adapted = adapted.slice(0, previewStart) + CURRENT_FORGE_PREVIEW + '\n\n' + adapted.slice(previewEnd);

  const startJobStart = adapted.indexOf('function startForgeJob(){');
  const startJobEnd = adapted.indexOf('function finishForgeJob(', startJobStart);
  if (startJobStart < 0 || startJobEnd < 0) throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: Schmiedestart-Block wurde nicht gefunden.');
  adapted = adapted.slice(0, startJobStart) + CURRENT_START_FORGE_JOB + '\n' + adapted.slice(startJobEnd);

  const finishJobStart = adapted.indexOf('function finishForgeJob(');
  const finishJobEnd = adapted.indexOf('function updateForgeJob(){', finishJobStart);
  if (finishJobStart < 0 || finishJobEnd < 0) throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: Schmiedeabschluss-Block wurde nicht gefunden.');
  adapted = adapted.slice(0, finishJobStart) + CURRENT_FINISH_FORGE_JOB + '\n' + adapted.slice(finishJobEnd);

  adapted = replaceOnce(
    adapted,
    'function weaponCardHtml(w,o={}){const s=w.stats||{},c=o.compare?.stats||null,type=CONFIG.forge.weaponForms[w.weaponForm]?.name||(w.starter?"Einhänder":"Waffe"),',
    'function weaponCardHtml(w,o={}){const s=w.stats||{},c=o.compare?.stats||null,formName=CONFIG.forge.weaponForms[w.weaponForm]?.name||(w.starter?"1H Schwert":"Waffe"),',
    'Waffenkarten-Formname'
  );
  adapted = replaceOnce(adapted, '<div class="weapon-card-sub">${type} · ', '<div class="weapon-card-sub">${formName} · ', 'Waffenkarten-Anzeige');

  if (adapted.includes('.weaponType') || adapted.includes('weaponTypes') || adapted.includes('slotWeaponType')) {
    throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: aktive Legacy-Bezeichner sind nach der Migration übrig geblieben.');
  }
  if (adapted.includes('slot:"Waffentyp"') || adapted.includes('slot:"Schneide"') || adapted.includes('slot:"Rückseite"') ||
      adapted.includes('slot:"Griffform"') || adapted.includes('slot:"Griffmaterial"') || adapted.includes('slot:"Verstärkungsmaterial"')) {
    throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: deutsche interne Slot-IDs sind nach der Migration übrig geblieben.');
  }

  return adapted;
}

export function adaptLegacyWeaponMarkup(markup: string): string {
  let adapted = markup;
  adapted = replaceOnce(adapted, 'id="weaponType"', 'id="weaponForm"', 'Waffenform-DOM-ID');
  adapted = replaceOnce(adapted, 'id="slotWeaponType"', 'id="slotBaseMaterial"', 'Grundmaterial-DOM-ID');
  adapted = replaceOnce(adapted, 'placeholder="Leer = Standardname des Waffentyps"', 'placeholder="Leer = Standardname der Waffenform"', 'Waffennamen-Platzhalter');
  adapted = replaceOnce(adapted, '<tr><td>Waffentyp</td><td><select id="slotBaseMaterial"', '<tr><td>Grundmaterial</td><td><select id="slotBaseMaterial"', 'Grundmaterial-Schmiedezeile');
  adapted = replaceOnce(adapted, '<tr><td>1. Waffentyp</td>', '<tr><td>1. Grundmaterial</td>', 'Grundmaterial-Index');
  adapted = replaceOnce(adapted, '<thead><tr><th>Waffentyp</th><th>Schadensfaktor</th><th>Geschwindigkeitsfaktor</th></tr></thead>', '<thead><tr><th>Waffenform</th><th>Schadensfaktor</th><th>Geschwindigkeitsfaktor</th></tr></thead>', 'Waffenform-Berechnungstabelle');
  adapted = replaceOnce(adapted, 'Waffentyp-Schadensfaktor', 'Waffenform-Schadensfaktor', 'Waffenform-Schadensformel');
  adapted = replaceOnce(adapted, 'Waffentyp-Geschwindigkeitsfaktor', 'Waffenform-Geschwindigkeitsfaktor', 'Waffenform-Geschwindigkeitsformel');
  adapted = replaceOnce(adapted, 'unter Name, Waffentyp und Seltenheit', 'unter Name, Waffenform und Seltenheit', 'Waffenkarten-Versionshinweis');

  if (adapted.includes('id="weaponType"') || adapted.includes('id="slotWeaponType"') || adapted.includes('Waffentyp')) {
    throw new Error('Waffenbenennung-Kompatibilität fehlgeschlagen: sichtbare alte Waffenbegriffe sind im adaptierten Markup übrig geblieben.');
  }
  return adapted;
}
