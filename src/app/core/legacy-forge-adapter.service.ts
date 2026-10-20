import { Injectable } from '@angular/core';

const FORGE_SELECTION = `function getForgeSelection(){
  const materialId=selectId=>{
    const value=document.getElementById(selectId)?.value||"";
    const numeric=Number(value);
    if(Number.isInteger(numeric)&&numeric>0)return numeric;
    const legacyMaterial=MATERIALS[value];
    const legacyId=Number(legacyMaterial?.materialId);
    return Number.isInteger(legacyId)&&legacyId>0?legacyId:null;
  };
  return {
    weaponForm:document.getElementById("weaponForm")?.value||"dagger",
    slots:[
      {slot:"workingPart",materialId:materialId("slotWorkingPart")},
      {slot:"back",materialId:materialId("slotBack")},
      {slot:"gripCore",materialId:materialId("slotGripCore")},
      {slot:"gripWrap",materialId:materialId("slotGripWrap")},
      {slot:"special",materialId:materialId("slotSpecial")},
      {slot:"parry",materialId:materialId("slotParry")},
      {slot:"bowstring",materialId:materialId("slotBowstring")}
    ]
  };
}`;

const FORGE_REQUIREMENTS = `function requirements(weaponForm,slots){
  const forgeCompatibility=window.NoBrainerForgeCompatibility;
  if(!forgeCompatibility)throw new Error("NoBrainer-Schmiede-Kompatibilitätsbrücke wurde nicht registriert.");
  return forgeCompatibility.requirements(weaponForm,slots);
}

function hasMaterials(required){
  const forgeCompatibility=window.NoBrainerForgeCompatibility;
  if(!forgeCompatibility)throw new Error("NoBrainer-Schmiede-Kompatibilitätsbrücke wurde nicht registriert.");
  return forgeCompatibility.hasMaterials(required);
}`;

const FORGE_PREVIEW = `function forgePreview(){
  const selection=getForgeSelection();
  const forgeCompatibility=window.NoBrainerForgeCompatibility;
  if(!forgeCompatibility)throw new Error("NoBrainer-Schmiede-Kompatibilitätsbrücke wurde nicht registriert.");
  return forgeCompatibility.preview(selection.weaponForm,selection.slots);
}`;

const FORGE_START = `function startForgeJob(){
  const preview=forgePreview();
  const finalName=(document.getElementById("forgeWeaponName")?.value||"").trim();
  const forgeCompatibility=window.NoBrainerForgeCompatibility;
  if(!forgeCompatibility)throw new Error("NoBrainer-Schmiede-Kompatibilitätsbrücke wurde nicht registriert.");
  const result=forgeCompatibility.start(preview.weaponForm,finalName,preview.slots,Date.now());
  if(result.status==="locked"){alert("Diese Waffenform ist noch nicht freigeschaltet.");return;}
  if(result.status==="full"){alert("Alle Herstellungs- und Warteschlangenplätze sind belegt.");return;}
  if(result.status==="incomplete"){alert("Bitte für alle benötigten Bauteile ein Material auswählen.");return;}
  if(result.status==="missing-material"){alert(\`Nicht genügend \${result.material} vorhanden. Benötigt: \${result.required}, Lager: \${result.available}.\`);return;}
  addLog(result.status==="started"?\`Schmiedeauftrag gestartet: \${result.weaponName}.\`:\`Schmiedeauftrag eingereiht: \${result.weaponName}.\`,"good");
  const nameInput=document.getElementById("forgeWeaponName");if(nameInput)nameInput.value="";render();
}`;

@Injectable({ providedIn: 'root' })
export class LegacyForgeAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceRange(source, 'function getForgeSelection(){', 'function normalizeWeaponSlots(', FORGE_SELECTION + '\n\n', 'Schmiedeauswahl');
    adapted = this.replaceRange(adapted, 'function requirements(', 'function formatCurrencyNickel(', FORGE_REQUIREMENTS + '\n\n', 'Materialbedarf');
    adapted = this.replaceRange(adapted, 'function forgePreview(){', 'function renderForgePreview(){', FORGE_PREVIEW + '\n\n', 'Schmiedevorschau');
    adapted = this.replaceRange(adapted, 'function startForgeQueuedJob(', 'function startForgeJob(){', '', 'Schmiede-Slots');
    adapted = this.replaceRange(adapted, 'function startForgeJob(){', 'function finishForgeJob(', FORGE_START + '\n', 'Schmiedeauftrag');
    adapted = this.replaceRange(adapted, 'function finishForgeJob(', 'function renderForgeJob(){', '', 'Schmiede-Fortschritt');
    return adapted;
  }

  private replaceRange(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (start < 0 || end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
