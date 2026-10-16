export const INDEX_PAGE_MARKUP = `<section class="page" id="index">
      <div class="grid">
        <div class="card span-12">
          <h2>Materialindex – gemeinsames Stat-System</h2>
          <p class="index-note">Ein Material besitzt ein gemeinsames Statprofil; ein Bauteil entscheidet, welche Werte davon beim Bau einer Waffe tatsächlich aktiviert werden. Nullwerte sind bewusst Teil des Datenmodells und können später für Rüstungen oder weitere Bauteile genutzt werden.</p>
          <div class="table-wrap mobile-stack">
            <table>
              <thead><tr>
                <th>Typ</th><th>Material</th><th>S</th><th>HP</th><th>E</th><th>R</th><th>AW</th><th>SF</th><th>P</th><th>B</th><th>K-C</th><th>K-S</th><th>HP-R</th><th>E-R</th><th>ERF</th><th>LR</th><th>DS</th><th>SPE</th><th>SPE%</th><th>Dungeon 1</th>
              </tr></thead>
              <tbody id="materialIndexRows"></tbody>
            </table>
          </div>
          <p class="index-note">Bedrohung (B) ist eine reine Klasseneigenschaft. Ausrüstung verändert die Bedrohung nicht.</p>
          <p class="index-note">Für Sehnen besitzen die Leder nun zusätzlich SF/DS: Lederfetzen +0,01 SF / +1 %-Pkt. DS · Hasen-Leder +0,03 / +2 %-Pkt. · Fuchs-Leder +0,05 / +4 %-Pkt. Diese Werte wirken nur an Bauteilen, die SF bzw. DS aktivieren.</p>
          <div class="formula">Dungeon 1: Materialkategorie Holz / Metall / Leder je 33,33 % → Materialchance innerhalb der gewählten Kategorie</div>
        </div>

        <div class="card span-12">
          <h2>Bauteile & Materialwirkung</h2>
          <p class="index-note">Die Materialmenge bestimmt ausschließlich den Verbrauch. Der Stat eines gewählten Materials wird pro Bauteil genau einmal angewendet, unabhängig davon, ob der Bauplan für dieses Bauteil eine oder mehrere Materialeinheiten verlangt.</p>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Bauteil</th><th>Metall</th><th>Holz</th><th>Leder</th><th>Wirkung</th><th>Bedeutung</th></tr></thead>
            <tbody>
              <tr><td>Schneide</td><td>Ja</td><td>Nein</td><td>Nein</td><td>SF</td><td>Übernimmt den Schadensfaktor des Materials.</td></tr>
              <tr><td>Kern</td><td>Ja</td><td>Ja</td><td>Nein</td><td>R</td><td>Übernimmt die Rüstung des Materials.</td></tr>
              <tr><td>Griff</td><td>Nein</td><td>Ja</td><td>Nein</td><td>P</td><td>Übernimmt die Präzision des Materials.</td></tr>
              <tr><td>Wicklung</td><td>Nein</td><td>Nein</td><td>Ja</td><td>K-C</td><td>Übernimmt die Krit-Chance des Materials.</td></tr>
              <tr><td>Spezial</td><td>Ja</td><td>Ja</td><td>Ja</td><td>SPE</td><td>Aktiviert SPE und SPE% des Materials.</td></tr>
              <tr><td>Parierstange</td><td>Ja</td><td>Ja</td><td>Nein</td><td>R + AW</td><td>Übernimmt Rüstung und Ausweichen des Materials.</td></tr>
              <tr><td>Sehne</td><td>Nein</td><td>Nein</td><td>Ja</td><td>SF + DS</td><td>Übernimmt Schadensfaktor und Durchschlag des Leders.</td></tr>
            </tbody>
          </table></div>
        </div>

        <div class="card span-12">
          <h2>Waffenbaupläne</h2>
          <p class="index-note"><strong>Einhändig</strong> ist reine Ausrüstungsmetadaten und kein Bauslot: 1 = belegt eine Hand, 0 = belegt beide Hände.</p>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Waffe</th><th>Einhändig</th><th>Schneide</th><th>Kern</th><th>Griff</th><th>Wicklung</th><th>Spezial</th><th>Parierstange</th><th>Sehne</th><th>Gesamt</th></tr></thead>
            <tbody>
              <tr><td>Dolch</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td><td>5</td></tr>
              <tr><td>1H Schwert</td><td>1</td><td>2</td><td>2</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>8</td></tr>
              <tr><td>1H Axt</td><td>1</td><td>1</td><td>1</td><td>3</td><td>2</td><td>1</td><td>0</td><td>0</td><td>8</td></tr>
              <tr><td>2H Schwert</td><td>0</td><td>4</td><td>4</td><td>2</td><td>1</td><td>1</td><td>2</td><td>0</td><td>14</td></tr>
              <tr><td>2H Axt</td><td>0</td><td>2</td><td>2</td><td>6</td><td>3</td><td>1</td><td>0</td><td>0</td><td>14</td></tr>
              <tr><td>Bogen</td><td>0</td><td>0</td><td>1</td><td>5</td><td>6</td><td>1</td><td>0</td><td>3</td><td>16</td></tr>
              <tr><td>Stab</td><td>0</td><td>0</td><td>1</td><td>5</td><td>2</td><td>1</td><td>0</td><td>0</td><td>9</td></tr>
            </tbody>
          </table></div>
        </div>

        <div class="card span-12">
          <h2>Waffen-Grundwerte & Formboni</h2>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Waffe</th><th>Grund-SCH</th><th>Grund-GES</th><th>Grund-TRF</th><th>Grund-DS</th><th>E</th><th>R</th><th>AW</th><th>SF</th><th>P</th><th>K-C</th><th>K-S</th><th>DS</th></tr></thead>
            <tbody>
              <tr><td>Dolch</td><td>6</td><td>1,40</td><td>60 %</td><td>0 %</td><td>0</td><td>0</td><td>+2 %-Pkt.</td><td>0</td><td>+0,05</td><td>+3 %-Pkt.</td><td>0</td><td>0</td></tr>
              <tr><td>1H Schwert</td><td>10</td><td>1,00</td><td>55 %</td><td>0 %</td><td>0</td><td>+1</td><td>0</td><td>+0,05</td><td>0</td><td>0</td><td>+10 %-Pkt.</td><td>0</td></tr>
              <tr><td>1H Axt</td><td>12</td><td>0,85</td><td>52 %</td><td>0 %</td><td>0</td><td>0</td><td>0</td><td>+0,08</td><td>0</td><td>0</td><td>+15 %-Pkt.</td><td>+5 %-Pkt.</td></tr>
              <tr><td>2H Schwert</td><td>16</td><td>0,80</td><td>55 %</td><td>0 %</td><td>0</td><td>+2</td><td>0</td><td>+0,10</td><td>0</td><td>0</td><td>+15 %-Pkt.</td><td>0</td></tr>
              <tr><td>2H Axt</td><td>20</td><td>0,70</td><td>50 %</td><td>0 %</td><td>0</td><td>0</td><td>0</td><td>+0,15</td><td>−0,05</td><td>0</td><td>+25 %-Pkt.</td><td>+10 %-Pkt.</td></tr>
              <tr><td>Bogen</td><td>11</td><td>0,90</td><td>65 %</td><td>0 %</td><td>0</td><td>0</td><td>+2 %-Pkt.</td><td>0</td><td>+0,10</td><td>+8 %-Pkt.</td><td>0</td><td>0</td></tr>
              <tr><td>Stab</td><td>10</td><td>1,00</td><td>60 %</td><td>0 %</td><td>+10</td><td>0</td><td>0</td><td>+0,05</td><td>+0,10</td><td>0</td><td>+15 %-Pkt.</td><td>0</td></tr>
            </tbody>
          </table></div>
          <p class="index-note">Waffenform-Boni und wirksame Bauteilwerte werden beim Ausrüsten auf den Charakter addiert. Bei zwei verschiedenen 1H-Waffen wirken die Charakterboni beider Waffen gemeinsam. Eine 2H-Waffe belegt beide Hände, wird aber für Stats und Angriffe nur einmal ausgewertet.</p>
        </div>

        <div class="card span-12">
          <h2>Waffen-Handverteilung</h2>
          <div class="formula">1H-Waffe → belegt genau eine gewählte Hand</div>
          <div class="formula">2H-Waffe → benötigt beide Hände und belegt beide Handplätze mit derselben Waffe</div>
          <p class="index-note">Eine 2H-Waffe kann nur ausgerüstet werden, wenn die andere Hand frei ist. Beim Ablegen einer 2H-Waffe werden beide Handplätze gemeinsam geleert. Klassenabhängige Waffenfreigaben und Schildregeln sind noch nicht aktiv.</p>
        </div>

        <div class="card span-12">
          <h2>Klassen-Grundwerte</h2>
          <p class="index-note">Der Rekrut bleibt der Allrounder. Kämpfer, Bogner und Gelehrter sind stärker spezialisiert. Bedrohung ist fest an die Klasse gebunden und kann nicht durch Waffen oder andere Ausrüstung verändert werden.</p>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Klasse</th><th>HP</th><th>E</th><th>R</th><th>AW</th><th>SF</th><th>P</th><th>B</th><th>K-C</th><th>K-S</th><th>HP-R</th><th>E-R</th><th>ERF</th><th>LR</th><th>DS</th></tr></thead>
            <tbody>
              <tr><td>Rekrut</td><td>30</td><td>100</td><td>2</td><td>10 %</td><td>1,00</td><td>1,00</td><td>50</td><td>5 %</td><td>150 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
              <tr><td>Kämpfer</td><td>35</td><td>100</td><td>3</td><td>8 %</td><td>1,10</td><td>0,95</td><td>100</td><td>4 %</td><td>160 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
              <tr><td>Bogner</td><td>26</td><td>100</td><td>1</td><td>15 %</td><td>0,95</td><td>1,15</td><td>33</td><td>10 %</td><td>150 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
              <tr><td>Gelehrter</td><td>22</td><td>100</td><td>0</td><td>5 %</td><td>1,15</td><td>1,10</td><td>25</td><td>5 %</td><td>175 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
            </tbody>
          </table></div>
          <div class="formula">Zielwahrscheinlichkeit = eigene Bedrohung ÷ Summe der Bedrohung aller lebenden Ziele</div>
        </div>

        <div class="card span-12">
          <h2>Level & Erfahrung</h2>
          <div class="formula">Start: Level 1 · 0 XP · Maximallevel 20</div>
          <div class="formula">XP für Level L → L+1 = gerundet(100 × 1,1^(L−1))</div>
          <p class="index-note">Beispiele: 1→2 = 100 XP · 2→3 = 110 XP · 3→4 = 121 XP. Der ERF-Stat ist als Multiplikator für spätere XP-Vergaben vorbereitet. Eine konkrete XP-Belohnung pro Dungeon/Gegner ist noch nicht definiert und wird deshalb aktuell nicht erfunden oder automatisch vergeben.</p>
        </div>

        <div class="card span-7">
          <h2>Kampfberechnung</h2>
          <div class="formula">Finaler Charakterstat = Klassenbasis + Waffenform-Boni + wirksame Bauteilwerte aller ausgerüsteten Waffen</div>
          <div class="formula">Bedrohung = ausschließlich Klassenbasis; Ausrüstung wird für B ignoriert</div>
          <div class="formula">Schaden pro Treffer = Waffen-Grund-SCH × finaler SF</div>
          <div class="formula">Angriffsgeschwindigkeit = Waffen-Grund-GES × eigener SPE-GES-Faktor</div>
          <div class="formula">Trefferchance = Waffen-Grund-TRF × finale P, begrenzt auf 0–100 %</div>
          <div class="formula">Durchschlag = finaler DS</div>
          <div class="formula">Kritischer Treffer: K-C bestimmt die Chance; Schaden wird mit finalem K-S multipliziert</div>
          <div class="formula">Effektive Rüstung = Ziel-Rüstung × (1 − DS)</div>
          <div class="formula">Trefferschaden nach Rüstung = max(0, Angriffsschaden − effektive Rüstung)</div>
          <p class="index-note">SPE wirkt nur im Spezial-Bauteil: GES verändert die Geschwindigkeit der betreffenden Waffe, P erhöht die Charakter-Präzision und DS erhöht den Charakter-Durchschlag.</p>
        </div>

        <div class="card span-5">
          <h2>Stat-Legende & Displayposition</h2>
          <table><thead><tr><th>Stat</th><th>Funktion</th><th>Position</th></tr></thead><tbody>
            <tr><td>HP</td><td>Lebenspunkte</td><td>S1L1</td></tr><tr><td>E</td><td>Energie</td><td>S1R1</td></tr>
            <tr><td>R</td><td>Rüstung</td><td>S1L2</td></tr><tr><td>AW</td><td>Ausweichen</td><td>S1R2</td></tr>
            <tr><td>SF</td><td>Schadensfaktor</td><td>S1L3</td></tr><tr><td>P</td><td>Präzision</td><td>S1L4</td></tr>
            <tr><td>B</td><td>Bedrohung</td><td>S2L1</td></tr><tr><td>K-C</td><td>Krit-Chance</td><td>S1R3</td></tr>
            <tr><td>K-S</td><td>Krit-Schaden</td><td>S1R4</td></tr><tr><td>HP-R</td><td>Lebenregeneration</td><td>S2L2</td></tr>
            <tr><td>E-R</td><td>Energieregeneration</td><td>S2R2</td></tr><tr><td>ERF</td><td>Erfahrung</td><td>S2R3</td></tr>
            <tr><td>LR</td><td>Lebensraub</td><td>S2L3</td></tr><tr><td>DS</td><td>Durchschlag</td><td>S2R1</td></tr>
            <tr><td>SPE</td><td>Spezialeffekt</td><td>S3</td></tr><tr><td>SPE%</td><td>Stärke des Spezialeffekts</td><td>S3</td></tr>
          </tbody></table>
        </div>

        <div class="card span-12">
          <h2>Seltenheit, Herstellung & aktueller Umfang</h2>
          <div class="formula">Waffen-Seltenheitsfaktor = niedrigste Seltenheit aller gewählten Bauteilmaterialien</div>
          <div class="formula">Waffenwert = 100 Nickel × Waffen-Seltenheitsfaktor</div>
          <div class="formula">Herstellungszeit = 30 s × Waffenform-Faktor × Waffen-Seltenheitsfaktor</div>
          <p class="index-note">Waffenform-Faktoren: Dolch 0,5 · 1H Schwert 1,0 · 1H Axt 1,0 · 2H Schwert 1,75 · 2H Axt 1,75 · Bogen 2,0 · Stab 1,1. Materialmenge verändert nur den Verbrauch, nicht den Statbeitrag.</p>
          <p class="index-note">Noch nicht aktiv sind die klassenabhängigen Waffenfreigaben, Schildkombinationen und Rüstungsklassen aus „Charakter_abhängikeiten“. Für Rüstung gilt später exakt die Tabellenlogik: A = alle, S = nur schwer, M = nur mittel, L = nur leicht; Kombinationen erlauben nur die ausdrücklich genannten Klassen.</p>
          <div class="formula">Materialwert pro Stück = 10 Nickel × Material-Verkaufsfaktor</div>
          <div class="formula">Material-Verkaufserlös = Materialwert pro Stück × Verkaufsmenge</div>
          <div class="formula">Währung: 100 Nickel = 1 Bronze · 100 Bronze = 1 Silber · 100 Silber = 1 Gold</div>
        </div>
      </div>
    </section>`;
