import { Injectable } from '@angular/core';

const MARKET_UI_BRIDGE = `function getMarketCompatibility(){
  const marketCompatibility=window.NoBrainerMarketCompatibility;
  if(!marketCompatibility)throw new Error("NoBrainer-Markt-Kompatibilitätsbrücke wurde nicht registriert.");
  return marketCompatibility;
}

function startMaterialSale(name,quantity=1){
  const result=getMarketCompatibility().startMaterial(name,quantity,Date.now());
  if(result.status==="full"){alert("Alle Verkaufs- und Warteschlangenplätze sind belegt.");return;}
  if(result.status==="no-stock"||result.status==="unknown-material")return;
  addLog(\`Verkauf eingestellt: \${result.quantity}× \${result.name} für \${formatCurrencyNickel(result.valueNickel)}.\`,"good");
  render();
}

function startWeaponSale(weaponId){
  const result=getMarketCompatibility().startWeapon(weaponId,Date.now());
  if(result.status==="starter"){alert("Die Startwaffe kann nicht verkauft werden.");return;}
  if(result.status==="equipped"){alert("Ausgerüstete Waffen können nicht verkauft werden.");return;}
  if(result.status==="full"){alert("Alle Verkaufs- und Warteschlangenplätze sind belegt.");return;}
  if(result.status==="not-found")return;
  addLog(\`Verkauf eingestellt: \${result.name}.\`,"good");
  render();
}

function cancelMarketSale(kind,index){
  const result=getMarketCompatibility().cancel(kind,index,Date.now());
  if(!result)return;
  addLog(\`Verkauf abgebrochen: \${result.name} wurde zurückgegeben.\`,"muted");
  render();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyMarketAdapterService {
  adapt(source: string): string {
    return this.replaceRangeOnce(
      source,
      'function startMarketQueuedJob(',
      'function renderMarketJob(){',
      MARKET_UI_BRIDGE,
      'Markt-Domain'
    );
  }

  private replaceRangeOnce(
    source: string,
    startMarker: string,
    endMarker: string,
    replacement: string,
    label: string
  ): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
