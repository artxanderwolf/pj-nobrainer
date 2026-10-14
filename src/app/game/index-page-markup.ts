export const INDEX_PAGE_MARKUP = `<section class="page" id="index">
      <div class="grid">
        <div class="card span-12">
          <h2>Materialindex – Dungeon 1</h2>
          <p class="index-note">Alle aktuell erreichbaren Materialien und ihre Waffenwerte. „–“ bedeutet, dass das Material für diesen Wert keine Funktion besitzt.</p>
          <div class="table-wrap mobile-stack">
            <table>
              <thead>
                <tr>
                  <th>Materialtyp</th><th>Material</th><th>Seltenheit</th><th>Basisschaden</th><th>Basisgeschw.</th>
                  <th>Schaden (M)</th><th>Durchschlag</th><th>Ang.-geschw.</th><th>Trefferchance</th><th>Verstärkungseffekt</th><th>Dungeon 1: Chance in Kategorie</th>
                </tr>
              </thead>
              <tbody id="materialIndexRows"></tbody>
            </table>
          </div>
          <p class="index-note">Dungeon 1 verwendet jetzt eine eigene Loot-Tabelle: Erfolg → 1–3 Drops → Materialkategorie → Material innerhalb der Kategorie. Holz, Metall und Leder werden aktuell jeweils mit 1/3 Wahrscheinlichkeit gewählt. Die angezeigte Materialchance gilt nur innerhalb der gewählten Kategorie und nur für Dungeon 1.</p>
          <div class="formula">Dungeon 1: Erfolg → 1–3 Drops → Kategorie (Holz / Metall / Leder je 33,33 %) → Materialchance innerhalb der Kategorie</div>
          <p class="index-note">Die besseren Materialien wurden gegenüber der bisherigen Verteilung deutlich reduziert. Die Dropchancen sind ab jetzt Eigenschaften des jeweiligen Dungeons und keine globalen Materialwerte.</p>
        </div>

        <div class="card span-12">
          <h2>Waffenslots & Funktion</h2>
          <div class="table-wrap mobile-stack">
            <table>
              <thead><tr><th>Slot</th><th>Materialtyp</th><th>Beeinflusst</th><th>Bedeutung</th></tr></thead>
              <tbody>
                <tr><td>1. Waffentyp</td><td>Metall oder Holz</td><td>Basisschaden + Basisgeschwindigkeit</td><td>Absolute Grundwerte der Waffe.</td></tr>
                <tr><td>2. Schneide</td><td>Metall</td><td>Schaden</td><td>Multiplikator auf den Basisschaden.</td></tr>
                <tr><td>3. Rückseite</td><td>Metall</td><td>Durchschlag</td><td>Ignorierter Anteil der gegnerischen Rüstung.</td></tr>
                <tr><td>4. Griffform</td><td>Holz</td><td>Angriffsgeschwindigkeit</td><td>Multiplikator auf die Basisgeschwindigkeit.</td></tr>
                <tr><td>5. Griffmaterial</td><td>Leder</td><td>Trefferwahrscheinlichkeit</td><td>Prozentwert.</td></tr>
                <tr><td>6. Verstärkungsmaterial</td><td>Alle Materialien</td><td>Spezialeffekt</td><td>Kann GES, TRF oder DS positiv oder negativ verändern. Nicht jedes Material besitzt einen Effekt.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card span-12">
          <h2>Klassen</h2>
          <p class="index-note">Vier feste Klassen sind rekrutierbar. Der Rekrut bleibt der neutrale Balance-Nullpunkt; Kämpfer, Bogner und Gelehrter bilden Nahkampf, Fernkampf und Magie ab. Entfernung ist ein versteckter Zielgewichtungswert und wird nicht im Kader angezeigt.</p>
          <div class="mobile-stack"><table><thead><tr><th>Klasse</th><th>HP</th><th>EN</th><th>RÜS</th><th>AUS</th><th>STÄ</th><th>PRÄ</th><th>EN-Reg.</th></tr></thead><tbody><tr><td>Rekrut</td><td>30</td><td>100</td><td>2</td><td>10 %</td><td>1,00</td><td>1,00</td><td>5/min</td></tr><tr><td>Kämpfer</td><td>35</td><td>100</td><td>3</td><td>8 %</td><td>1,10</td><td>0,95</td><td>5/min</td></tr><tr><td>Bogner</td><td>26</td><td>100</td><td>1</td><td>15 %</td><td>0,95</td><td>1,15</td><td>5/min</td></tr><tr><td>Gelehrter</td><td>22</td><td>100</td><td>0</td><td>5 %</td><td>1,15</td><td>1,10</td><td>5/min</td></tr></tbody></table></div>
          <p class="index-note">Versteckte Entfernung: Kämpfer 1 · Rekrut 2 · Bogner 3 · Gelehrter 4. Zielgewicht = 1 / Entfernung.</p>
          <h3>Basisklasse: Rekrut</h3>
          <p class="index-note">Der Rekrut ist der feste Balance-Nullpunkt für das Klassensystem.</p>
          <div class="table-wrap mobile-stack">
            <table>
              <thead><tr><th>Wert</th><th>Rekrut</th><th>Funktion</th></tr></thead>
              <tbody>
                <tr><td>Lebenspunkte</td><td>30</td><td>Maximale Lebenspunkte.</td></tr>
                <tr><td>Energie</td><td>100</td><td>Maximale Energie.</td></tr>
                <tr><td>Rüstung</td><td>2</td><td>Reduziert eingehenden Schaden.</td></tr>
                <tr><td>Ausweichchance</td><td>10 %</td><td>Reduziert den erwarteten eingehenden Schaden.</td></tr>
                <tr><td>Stärke</td><td>1,00</td><td>Multiplikator auf den Schaden pro Treffer der Waffe.</td></tr>
                <tr><td>Präzision</td><td>1,00</td><td>Multiplikator auf die Trefferchance der Waffe.</td></tr>
                <tr><td>Energie-Regeneration</td><td>5 / Min.</td><td>Regeneriert nur, wenn kein Dungeonlauf aktiv ist.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card span-7">
          <h2>Aktuelle Schadensberechnungen</h2>
          <table style="margin-bottom:12px">
            <thead><tr><th>Waffentyp</th><th>Schadensfaktor</th><th>Geschwindigkeitsfaktor</th></tr></thead>
            <tbody>
              <tr><td>Dolch</td><td>× 0,6</td><td>× 1,4</td></tr>
              <tr><td>Einhänder</td><td>× 1,0</td><td>× 1,0</td></tr>
            </tbody>
          </table>
          <div class="formula">Waffen-Basisschaden = Material-Basisschaden × Waffentyp-Schadensfaktor</div>
          <div class="formula">Waffen-Basisgeschwindigkeit = Material-Basisgeschwindigkeit × Waffentyp-Geschwindigkeitsfaktor</div>
          <div class="formula">Schaden pro Treffer = Waffen-Basisschaden × Schneiden-Multiplikator</div>
          <div class="formula">Angriffsgeschwindigkeit = Basisgeschwindigkeit × Griffform-Multiplikator × Verstärkungs-GES-Faktor</div>
          <div class="formula">Trefferwahrscheinlichkeit = Griffmaterial-TRF + Verstärkungs-TRF in Prozentpunkten</div>
          <div class="formula">Durchschlag = Rückseiten-DS + Verstärkungs-DS in Prozentpunkten</div>
          <div class="formula">Waffen-Rohschaden = Schaden pro Treffer × Angriffsgeschwindigkeit × Trefferwahrscheinlichkeit</div>
          <div class="formula">Charakter-Schaden pro Treffer = Waffen-Schaden pro Treffer × Stärke</div>
          <div class="formula">Charakter-Trefferchance = Waffen-Trefferchance × Präzision</div>
          <div class="formula">Charakter-Rohschaden pro Waffe = Charakter-Schaden pro Treffer × Angriffsgeschwindigkeit × Charakter-Trefferchance</div>
          <div class="formula">Effektive Rüstung = Gegner-Rüstung × (1 − Durchschlag)</div>
          <div class="formula">Schadensreduktion = Effektive Rüstung ÷ (Effektive Rüstung + 100)</div>
          <div class="formula">Schaden nach Rüstung = Charakter-Rohschaden × (1 − Schadensreduktion)</div>
          <p class="index-note">Trefferwahrscheinlichkeit und Durchschlag werden intern als Dezimalwert gerechnet: 75 % = 0,75 und 20 % = 0,20.</p>
        </div>

        <div class="card span-5">
          <h2>Beispielrechnung</h2>
          <table>
            <tbody>
              <tr><th>Material-Basisschaden (Kupfer)</th><td>10</td></tr>
              <tr><th>Waffenform Einhänder</th><td>× 1,0 → 10</td></tr>
              <tr><th>Kupfer-Schneide</th><td>× 1,2 → 12</td></tr>
              <tr><th>Material-Basisgeschwindigkeit</th><td>1,0</td></tr>
              <tr><th>Waffenform Einhänder</th><td>× 1,0 → 1,0</td></tr>
              <tr><th>Fichten-Griffform</th><td>× 1,2 → 1,2</td></tr>
              <tr><th>Fuchs-Leder</th><td>75 % → 0,75</td></tr>
              <tr><th>Kupfer-Verstärkung</th><td>+10 Prozentpunkte Durchschlag</td></tr>
              <tr><th>Erwarteter Rohschaden</th><td>12 × 1,2 × 0,75 = 10,80</td></tr>
              <tr><th>Kupfer-Rückseite + Verstärkung</th><td>20 % + 10 % = 30 % Durchschlag</td></tr>
              <tr><th>100 Rüstung</th><td>→ 70 effektive Rüstung</td></tr>
              <tr><th>Rüstungsreduktion</th><td>70 / 170 = 41,18 %</td></tr>
              <tr><th>Schaden nach Rüstung</th><td>≈ 6,35</td></tr>
            </tbody>
          </table>
        </div>

        <div class="card span-12">
          <h2>Seltenheit, Waffenwert & Herstellungsdauer</h2>
          <p class="index-note">Die Waffenseltenheit richtet sich jetzt immer nach dem schwächsten der sechs verwendeten Materialien. Eine Waffe erreicht S2 also nur, wenn alle sechs Materialien mindestens S2 besitzen.</p>
          <div class="formula">Waffen-Seltenheitsfaktor = niedrigste Materialseltenheit aller 6 Slots</div>
          <div class="formula">Waffenwert = 100 Nickel × Waffen-Seltenheitsfaktor</div>
          <div class="formula">Herstellungszeit = 30 s × Waffenform-Faktor × Waffen-Seltenheitsfaktor</div>
          <p class="index-note">Beispiele: mindestens ein S1-Material → Faktor 1 · sechs Materialien mit mindestens S2 → Faktor 2. Waffenform-Faktor: Dolch = 0,5 · Einhänder = 1,0.</p>
          <div class="formula">Rekrut: Energie-Regeneration = 5 Energie pro Minute, maximal bis 100 Energie; nur außerhalb eines aktiven Dungeonlaufs</div>
          <div class="formula">Materialwert pro Stück = 10 Nickel × Material-Verkaufsfaktor</div>
          <div class="formula">Material-Verkaufserlös = Materialwert pro Stück × Verkaufsmenge</div>
          <div class="formula">Material-Verkaufszeit = 30 s × Material-Verkaufsfaktor × Verkaufsmenge</div>
          <p class="index-note">Der Material-Verkaufsfaktor bleibt vorerst auf der bisherigen Kurve: S1 = ×1,0 · S2 = ×1,1 · S3 = ×1,2 · S4 = ×1,4 · S5 = ×1,8 · S6 = ×2,6.</p>
          <div class="formula">Waffen-Verkaufserlös = berechneter Waffenwert</div>
          <div class="formula">Waffen-Verkaufszeit = 30 s × Seltenheitsfaktor der Waffe</div>
          <div class="formula">Dungeonlauf = 30 s · Energiekosten je Charakter = aufrunden(4 ÷ Anzahl aktiver Charaktere)</div>
          <div class="formula">Dungeon-Skalierung: Gegner-HP = 8 × aktive Charaktere · Gegnerschaden = 12 × aktive Charaktere · Gegner-Rüstung bleibt 20</div>
          <div class="formula">Eingehender Schaden je Charakter = max(0, zugewiesener Rohschaden × (1 − Ausweichen) − Rüstung)</div>
          <div class="formula">Kann ein Charakter seinen Schadensanteil nicht vollständig aufnehmen, wird der überschüssige Rohschaden gleichmäßig auf die verbleibenden Überlebenden verteilt.</div>
          <div class="formula">Offensive bei zwei Waffen = Schaden nach Rüstung linke Hand + Schaden nach Rüstung rechte Hand</div>
          <div class="formula">Überlebensanteil = min(1, verbleibende HP ÷ eingehender Schaden)</div>
          <div class="formula">Tatsächlicher Offensivbeitrag = theoretischer Offensivbeitrag × Überlebensanteil</div>
          <div class="formula">Dungeon-Erfolg = Summe der tatsächlichen Offensivbeiträge ≥ Gegner-HP</div>
          <div class="formula">Währung: 100 Nickel = 1 Bronze · 100 Bronze = 1 Silber · 100 Silber = 1 Gold</div>
          <p class="index-note">Dungeon-Beute wird zunächst im Dungeon gesammelt und gelangt erst über „Einsammeln“ ins Lager. Ein abgebrochener Verkauf gibt die reservierten Gegenstände vollständig zurück und zahlt kein Geld aus.</p>
        </div>

        <div class="card span-12"><h2>Kürzel-Legende</h2><p class="index-note">Im Spiel werden Kürzel verwendet; der Index bleibt ausgeschrieben.</p><div class="table-wrap mobile-stack"><table><thead><tr><th>Kürzel</th><th>Ausgeschrieben</th></tr></thead><tbody>
<tr><td>SCH</td><td>Schaden pro Treffer</td></tr><tr><td>GES</td><td>Angriffsgeschwindigkeit</td></tr><tr><td>TRF</td><td>Trefferchance</td></tr><tr><td>DS</td><td>Durchschlag</td></tr><tr><td>ROH</td><td>Erwarteter Rohschaden</td></tr><tr><td>RÜS</td><td>Rüstung</td></tr><tr><td>AUS</td><td>Ausweichchance</td></tr><tr><td>HP</td><td>Lebenspunkte</td></tr><tr><td>EN</td><td>Energie</td></tr><tr><td>STÄ</td><td>Stärke</td></tr><tr><td>PRÄ</td><td>Präzision</td></tr><tr><td>WERT</td><td>Verkaufs-/Waffenwert</td></tr>
</tbody></table></div></div><div class="card span-12">
          <h2>Taverne & Dungeon-Team</h2>
          <p class="index-note">Die erste Tavernenversion verwendet ausschließlich feste Rekruten ohne Wertevarianz. Neue Rekruten besitzen keine Startwaffe.</p>
          <div class="formula">Rekrutierungskosten = 200 Nickel × 1,75^(bereits zusätzlich angeworbene Rekruten)</div>
          <div class="formula">Dungeon-Team = maximal 4 unterschiedliche Charaktere; Doppelzuweisung ist nicht erlaubt.</div>
          <p class="index-note">Beim manuellen Start einer neuen Expedition beginnen die ausgewählten Charaktere mit vollen HP. Nach einem erfolgreichen Lauf machen nur Überlebende weiter. Nach einem Fehlschlag startet die nächste automatische Wiederholung wieder mit dem vollständig zurückgesetzten ursprünglich ausgewählten Team.</p>
        </div>
        <div class="card span-12">
          <h2>Gebäude-Upgrades</h2>
          <div class="formula">Upgrade-Kosten = Basiskosten × Wachstumsfaktor^(bereits gekaufte Upgrades)</div>
          <div class="table-wrap mobile-stack"><table><thead><tr><th>Upgrade</th><th>Start</th><th>Basiskosten</th><th>Wachstum</th><th>Maximum</th></tr></thead><tbody>
          <tr><td>Inn – Kaderplätze</td><td>2</td><td>5 Bronze</td><td>×2,0</td><td>10</td></tr>
          <tr><td>Schmiede – Herstellungsplätze</td><td>1</td><td>10 Bronze</td><td>×3,0</td><td>5</td></tr>
          <tr><td>Schmiede – Warteschlange</td><td>1</td><td>2 Bronze</td><td>×1,75</td><td>10</td></tr>
          <tr><td>Markt – Verkaufsplätze</td><td>1</td><td>10 Bronze</td><td>×3,0</td><td>5</td></tr>
          <tr><td>Markt – Warteschlange</td><td>1</td><td>2 Bronze</td><td>×1,75</td><td>10</td></tr>
          </tbody></table></div>
          <p class="muted small">Warteschlangenaufträge reservieren Materialien beziehungsweise Waren sofort. Freie aktive Plätze ziehen automatisch den ältesten Auftrag nach.</p>
        </div>
        <div class="card span-12">
          <h2>Versionshinweise</h2>
          <p class="index-note">Dieser Bereich wird ab v0.6 bei jeder neuen HTML-Version mit den relevanten Änderungen ergänzt.</p>

          <div class="version-entry"><h3>v0.12.2</h3><ul><li>Dungeon-1-Gegner-HP von ×1,5 auf ×2,0 erhöht.</li><li>EN-Regeneration während der gesamten aktiven Dungeon-Automatik deaktiviert – auch während Suche und Beuteeinsammeln. Energie regeneriert erst wieder, wenn die Dungeon-Automatik angehalten ist.</li></ul>
          <div class="version-entry"><h3>v0.12.1</h3><ul><li>Dungeon-Suche eingeführt: alle 1 Sekunde besteht eine Begegnungschance von 10 %.</li><li>Energie wird erst beim tatsächlichen Start einer gefundenen Gegnerwelle bezahlt.</li><li>Dungeon-1-Gegner erhalten ×1,5 HP; die übrigen Gegnerbasiswerte bleiben unverändert.</li><li>Nach vollständigem Wellensieg dauert das Einsammeln der Beute 1 Sekunde; erst danach werden die Materialwürfe gutgeschrieben und die Suche beginnt erneut.</li><li>Nach Niederlage startet das Team mit vollen HP wieder im Suchmodus. Kein Pechschutz für Begegnungen.</li></ul>
          </div>
          <div class="version-entry"><h3>v0.12</h3><ul><li>Vier rekrutierbare Klassen umgesetzt: Rekrut, Kämpfer, Bogner und Gelehrter mit den festgelegten Basiswerten.</li><li>Dungeon vollständig auf endlose Echtzeit-Wellen mit globaler Angriffs-Zeitleiste umgestellt.</li><li>Jede Waffe besitzt einen eigenen Angriffspunkt; unbewaffnete Charaktere verwenden den schwachen Faustangriff SCH 1 / GES 1,0 / TRF 50 % / DS 0 %.</li><li>Entfernungsbasierte Zielwahl, echte Treffer- und Ausweichwürfe, teamgrößenabhängige Gegnerzahl sowie ein Materialwurf pro Gegner bei vollständigem Wellensieg umgesetzt.</li><li>Dungeon 1 nutzt Gegnerbasis SCH 6 / GES 0,80 / TRF 50 % / DS 0 % und Klassenverteilung 55/20/15/10.</li><li>Besiegte Wellen werden dauerhaft gezählt und im Dungeon angezeigt.</li></ul>
<h3>v0.11.3</h3><ul>
<li>Trefferchance der Leder neu gestaffelt: Lederfetzen 50 %, Hasen-Leder 55 %, Fuchs-Leder 60 %.</li>
<li>Die Verstärkungseffekte bleiben unverändert: Hasen-Leder +5 Prozentpunkte TRF, Fuchs-Leder +10 Prozentpunkte TRF.</li>
<li>Damit liegt die aktuell maximale Waffen-Trefferchance bei 70 % statt 85 %.</li>
</ul></div>
          <div class="version-entry"><h3>v0.11.2</h3><ul>
<li>Schmiede-UI repariert: Nach Abschluss eines Herstellungsauftrags wird der Herstellungsbutton sofort neu bewertet und bei freier Kapazität direkt wieder freigegeben. Ein Verlassen und erneutes Öffnen der Schmiede ist nicht mehr nötig.</li>
<li>Die Aktualisierung erfolgt nur bei einem tatsächlich abgeschlossenen Auftrag, damit die Material-Dropdowns während der Auswahl nicht durch den 250-ms-Spiel-Takt ständig neu aufgebaut werden.</li>
<li>Die gleiche veraltete Kapazitätsanzeige im Markt wurde vorsorglich mit behoben; Verkaufsbuttons und Geldanzeige aktualisieren sich nach einem abgeschlossenen Verkauf sofort.</li>
</ul></div>
          <div class="version-entry"><h3>v0.11.1</h3><ul>
<li>In allen Waffenkarten wird unter Name, Waffentyp und Seltenheit jetzt zusätzlich der Effekt des Verstärkungsmaterials angezeigt, sofern ein Zusatzeffekt vorhanden ist.</li>
<li>Dadurch ist direkt sichtbar, ob eine Waffe z. B. +10 % GES, +10 Prozentpunkte DS oder +10 Prozentpunkte TRF mitbringt.</li>
</ul></div>
          <div class="version-entry"><h3>v0.11</h3><ul>
<li>Hauptmaterial durch Verstärkungsmaterial ersetzt; alle vorhandenen Materialien sind in diesem Slot zulässig.</li>
<li>Verstärkungseffekte ergänzt: Morsche Fichte −5 Prozentpunkte DS, Tanne +10 % GES, Kupfer +10 Prozentpunkte DS, Aluminium +10 % GES, Hasen-Leder +5 Prozentpunkte TRF und Fuchs-Leder +10 Prozentpunkte TRF. Fichte, Zinn und Lederfetzen besitzen aktuell keinen Verstärkungseffekt.</li>
<li>Basisgeschwindigkeiten angepasst: Morsche Fichte 1,1 · Fichte 0,9 · Zinn 0,8.</li>
<li>Alter Hauptmaterial-Schadensmultiplikator vollständig aus der Waffenberechnung entfernt.</li>
<li>Waffen-Seltenheitsfaktor wird durch die niedrigste Seltenheit aller sechs Materialien bestimmt: S1 = ×1, S2 = ×2 usw.</li>
<li>Bestehende gefertigte Waffen und Schmiedeaufträge werden beim Laden auf die neuen Slot-, Kampf- und Seltenheitsregeln migriert.</li>
<li>Start-Einhänder wird automatisch aus der schwächsten aktuell möglichen Einhänder-Kombination erzeugt.</li>
<li>Speicherformat auf Version 6 erweitert.</li>
</ul></div>
          <div class="version-entry"><h3>v0.10.1</h3><ul>
<li>Dungeon-Automatik bei komplettem Teamtod geändert: Sie bleibt aktiv; das ursprüngliche Team startet den nächsten Versuch mit vollen HP. Energie wird nicht aufgefüllt.</li>
<li>Material-/Bauteilzeile WT, SN, RS, GF, GM und HM aus allen Waffenkarten entfernt. Die Bauteildaten bleiben intern gespeichert.</li>
<li>Nicht mehr verwendete Bauteil-Kürzel aus der Index-Kürzelliste entfernt.</li>
</ul></div>
          <div class="version-entry"><h3>v0.10</h3><ul>
<li>Taverne aktiviert: Es kann ausschließlich der feste Rekrut ohne Varianz angeworben werden; Startpreis 2 Bronze, danach Kostenwachstum ×1,75.</li>
<li>Kader auf mehrere Charaktere umgestellt. Neue Rekruten starten mit vollen HP/EN und ohne Waffe.</li>
<li>Dungeon besitzt vier frei belegbare Teamplätze; Charaktere können nicht doppelt zugewiesen werden und auch der Start-Rekrut ist entfernbar.</li>
<li>Energiekosten je Charakter werden mit aufrunden(4 ÷ Teamgröße) berechnet: 4 / 2 / 2 / 1 EN bei 1 / 2 / 3 / 4 Charakteren.</li>
<li>Dungeon-HP und Gegnerschaden skalieren linear mit der aktiven Teamgröße; Gegner-Rüstung bleibt unverändert.</li>
<li>Mehrcharakter-Schadensverteilung mit Weitergabe nicht absorbierten Schadens sowie Überlebensanteil für die Offensive ergänzt.</li>
<li>Start-Einhänder auf SCH 7,7 · GES 1,0 · TRF 50 % · DS 10 % · ROH 3,85 reduziert.</li>
<li>Speicherformat auf Version 5 erweitert; bestehende Ein-Charakter-Spielstände werden migriert.</li>
</ul></div>
          <div class="version-entry"><h3>v0.9</h3><ul><li>Gebäude-Upgrades für Inn, Schmiede und Markt ergänzt.</li><li>Schmiede: parallele Herstellungsplätze plus automatische Warteschlange.</li><li>Markt: parallele Verkaufsplätze plus automatische Warteschlange.</li><li>Inn startet mit 2 Kaderplätzen; jeder Ausbau gibt +1 Platz.</li><li>Exponentielle Upgrade-Kosten und Prototyp-Maxima ergänzt.</li></ul></div>
          <div class="version-entry"><h3>v0.8.2</h3><ul>
<li>Energie-Regeneration korrigiert: Sie läuft nur noch, wenn kein Dungeonlauf aktiv ist.</li>
<li>Während eines Dungeonlaufs wird keine Regeneration angesammelt und später nachträglich gutgeschrieben.</li>
<li>Index und Rekrutenbeschreibung wurden an diese Regel angepasst.</li>
</ul></div>
          <div class="version-entry"><h3>v0.8.1</h3><ul>
<li>Reparatur der Timer-Logik: Die beim Klassen-Umbau versehentlich entfernte Hilfsfunktion <code>getMaterialsForCategories()</code> wurde wiederhergestellt.</li>
<li>Der erste vollständige Render kann damit wieder ohne ReferenceError durchlaufen; Schmiede, Dungeon, Markt und Energie aktualisieren wieder regulär.</li>
<li>Zusätzliche Absicherung: Der zentrale 250-ms-Spiel-Takt wird jetzt vor dem ersten vollständigen UI-Render registriert, damit ein zukünftiger Darstellungsfehler die gesamte Zeitlogik nicht erneut deaktiviert.</li>
</ul></div>
          <div class="version-entry"><h3>v0.8</h3><ul>
<li>Die bisherige neutrale Testfigur wurde formal zur Basisklasse <strong>Rekrut</strong>.</li>
<li>Feste Rekrutenwerte definiert: 30 HP, 100 EN, 2 Rüstung, 10 % Ausweichen, Stärke 1,00, Präzision 1,00 und 5 EN/Min. Regeneration.</li>
<li>Stärke und Präzision fließen jetzt tatsächlich in die Waffenberechnung des Charakters ein. Der Rekrut bleibt mit 1,00 / 1,00 der neutrale Balance-Nullpunkt.</li>
<li>Bestehende Spielstände mit der alten neutralen Testfigur werden automatisch auf die Rekrutenklasse migriert.</li>
<li>Kader und Index wurden um Klasse, Stärke, Präzision und die neuen Charakter-Waffenformeln ergänzt.</li>
</ul></div>
          <div class="version-entry"><h3>v0.7.4</h3><ul>
<li>Schriftgrößen der Waffenkarten wieder auf den Stand vor v0.7.3 zurückgesetzt.</li>
<li>Die kompakte 2-Spalten-Aufteilung mit zwei Waffen nebeneinander sowie das 3 × 2 Werte-Raster bleiben unverändert erhalten.</li>
</ul></div>
          <div class="version-entry"><h3>v0.7.3</h3><ul>
<li>Waffenlisten im Lager und in der Waffenauswahl werden jetzt zweispaltig dargestellt: zwei Waffen nebeneinander.</li>
<li>Die sechs Waffenwerte bleiben pro Karte als 3 × 2 Raster erhalten: SCH / GES / TRF sowie DS / ROH / WERT.</li>
<li>Waffenkarten, Materialzeilen und Wertefelder wurden deutlich kompakter gestaltet, damit zwei vollständige Karten auch auf kleinen Handybildschirmen übersichtlich bleiben.</li>
</ul></div>
          <div class="version-entry"><h3>v0.7.2</h3><ul>
<li>Reparatur der zentralen Timer-Aktualisierung: die beim Waffeninventar-Umbau versehentlich entfernte Hilfsfunktion <code>displayVal()</code> wurde wiederhergestellt.</li>
<li>Dadurch kann der initiale Gesamt-Render wieder vollständig durchlaufen und der 250-ms-Aktualisierungstakt für Dungeon, Schmiede, Markt und Energie wird wieder registriert.</li>
<li>Erklärt und behebt den beobachteten Zustand, dass beim Laden einmal Aktionen ausgeführt wurden, danach aber alle Timer stehen blieben.</li>
</ul></div>
          <div class="version-entry"><h3>v0.7.1</h3><ul>
<li>Reparatur der Dungeon-Automatik: Abgelaufene Läufe werden zuverlässig abgeschlossen.</li>
<li>Bei weiterhin aktiver Automatik und ausreichender Energie wird der nächste Lauf unmittelbar gestartet.</li>
<li>Zusätzliche Absicherung gegen einen dauerhaft bei 0 s verbleibend hängenden Dungeonlauf.</li>
</ul></div>
          <div class="version-entry"><h3>v0.7</h3><ul><li>Waffenlager auf vertikale Waffenkarten umgestellt.</li><li>Kürzel-Legende im Index ergänzt.</li><li>Kader-Waffenwechsel mit aufklappbarer Kartenauswahl und direktem Wertevergleich neu gestaltet.</li><li>AUSGERÜSTET / ANDERE HAND sowie Hand leeren ergänzt.</li></ul></div>
          <div class="version-entry">
            <h3>v0.6.3</h3>
            <ul>
              <li>Die drei gezeigten mobilen Darstellungsfehler in Lager und Index wurden behoben. Breite Tabellen werden auf schmalen Displays jetzt als lesbare Karten dargestellt.</li>
              <li>Dungeon-Automatik beendet sich bei Energiemangel vollständig und muss nach der Regeneration manuell neu gestartet werden.</li>
            </ul>
          </div>
          <div class="version-entry">
            <h3>v0.6.2</h3>
            <ul>
              <li>Marktzeiten werden jetzt in Stunden, Minuten und Sekunden angezeigt.</li>
              <li>Kader-Waffenauswahl repariert: geöffnete Auswahlfelder werden nicht mehr durch das automatische UI-Refresh sofort geschlossen.</li>
            </ul>
          </div>
          <div class="version-entry">
            <h3>v0.6.1</h3>
            <ul>
              <li>Horizontale Scrollbar in der Schmiede entfernt; die Materialauswahl passt sich jetzt vollständig an die verfügbare Breite an.</li>
            </ul>
          </div>
          <div class="version-entry">
            <h3>v0.6</h3>
            <ul>
              <li>Aktives Team im Dungeon auf Charaktername, HP und Energie reduziert.</li>
              <li>Waffen können jetzt zusätzlich direkt im Kader für linke und rechte Hand ausgerüstet werden.</li>
              <li>Materialverkauf unterstützt frei wählbare Stückzahlen; Zeit und Erlös skalieren linear mit der Menge.</li>
              <li>Eigener Waffenname kann vor Beginn des Schmiedeauftrags vergeben werden.</li>
              <li>Index um die aktuell implementierten Berechnungsregeln ergänzt.</li>
              <li>Hochformat-/Handy-Layout für schmale Displays erweitert.</li>
            </ul>
          </div>
          <div class="version-entry">
            <h3>v0.5</h3>
            <ul>
              <li>30-Sekunden-Autodungeon, 4 Energie Gesamtkosten pro Lauf und 5 Energie Regeneration pro Minute.</li>
              <li>Separater Dungeon-Beutevorrat mit „Einsammeln“.</li>
              <li>Dungeon-spezifisches Kategorie-Lootsystem und persistenter Browser-Spielstand.</li>
              <li>Verkaufsansicht vereinfacht und Materialwert im Lager ergänzt.</li>
            </ul>
          </div>
          <div class="version-entry">
            <h3>v0.4.1</h3>
            <ul><li>Waffenform-Multiplikatoren ergänzt: Dolch ×0,6 Schaden / ×1,4 Geschwindigkeit; Einhänder ×1,0 / ×1,0.</li></ul>
          </div>
          <div class="version-entry">
            <h3>v0.4</h3>
            <ul><li>Erstes Verkaufssystem für Waffen und Materialien sowie automatische Währungsanzeige.</li></ul>
          </div>
        </div>
      </div>
    </section>`;
