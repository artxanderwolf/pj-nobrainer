export const INDEX_PAGE_MARKUP = `<section class="page" id="index">
      <div class="grid">
        <div class="card span-12" data-release-help>
          <h2>Missionen, Dungeons und Heilkunst</h2>
          <p>Das Schriftrollen-Icon im Kopfbereich bleibt immer sichtbar. Auf der Übersicht gibt es einen weiteren Missionszugang. Fortschritt wird als x/Ziel angezeigt. Nach dem Einsammeln verschwindet eine abgeschlossene Mission aus der Liste; ihre Freischaltung bleibt gespeichert. Abgeschlossene Missionen ohne Claim bleiben sichtbar. Eine abgeschlossene Mission ist einsammelbereit: Erst „Einsammeln“ schaltet Dungeon, Waffenform oder Heiler frei. Abschlussmeldungen erscheinen nacheinander für jeweils 2 Sekunden. Noch unsichtbare Missionen zeigen weder Eintrag noch Meldung; bereits erzielter Fortschritt erscheint, sobald sie verfügbar werden.</p>
          <p>Trainingslager → Waffenkammer → Wald → Einsame Stadt → Heilige Ebenen. Jeder Dungeon besitzt eine eigene Kachel und ein eigenes Lauf-Fenster mit gespeichertem Team, Countdown, Kampf, Beute und Protokoll. Mehrere Dungeons laufen unabhängig gleichzeitig weiter, auch bei geschlossenem Fenster. Ein Charakter kann höchstens einem aktiven Dungeon angehören; auch gefallene Teilnehmer bleiben bis zum Laufende belegt. Teamauswahl und Laufstart prüfen diese Sperre. Nach Abbruch oder Zeitablauf wird der Charakter wieder frei. Ein Lauf qualifiziert ab 360 erfolgreichen Wellen genau einmal, auch nach Neuladen. Nach 20 qualifizierten Läufen beginnt die Zugangssuche in einem neuen Lauf: kein Wurf vor Welle 100, danach nach jeder erfolgreichen Welle 5 %. Ein gefundener Zugang bleibt erhalten und wird erst nach Claim freigeschaltet.</p>
          <p>In allen fünf Dungeons wird im Suchmodus einmal pro Sekunde mit 5 % Chance eine Gegnerwelle gefunden. Das ergibt durchschnittlich 20 Sekunden reine Suchzeit; Kampf und Einsammeln kommen hinzu. Es gibt keinen festen 20-Sekunden-Takt. Normale Gegner: Neuling/Tank/Jäger/Lehrling im Verhältnis 55/20/15/10. In der Einsamen Stadt sind 15 % der Gegner Heiler; die übrigen 85 % folgen diesem Verhältnis. Bosse erscheinen mit 1 % pro Gegnerplatz, haben Rekrutenbasis, zehnfache HP, doppelten Schaden und Geschwindigkeit 0,8. Bossbeute: fünf verschiedene Materialien aus dem gesamten Dungeonpool.</p>
          <p>Dungeon 2–5 besitzen je Gegner vier eigene Materialien: 50/30/15/5 %. Die Materialfarben sind im Index und bei Waffen sichtbar. Rarity 2/3/4/5 verwendet weiterhin das bestehende Wertsystem.</p>
          <p>Heilkunst: Einen Heiler besiegen und die Mission einsammeln. Heiler haben Gelehrten-Grundwerte, nutzen Dolch oder bevorzugt Stab und dieselbe Aktionsgeschwindigkeit. Sie verursachen keinen Schaden. Ihre normale Schadensgrundformel liefert stattdessen Heilung ohne kritische Treffer: Ziel ist der lebende Charakter mit dem niedrigsten HP-Prozentwert; Gleichstand entscheidet höhere Bedrohung, dann der frühere Teamslot. Selbstheilung ist erlaubt, Wiederbelebung nicht. Heilung endet bei Max-HP; bei voller Gruppe setzt der Heiler aus.</p>
          <p>Bestehende Waffenfreischaltungen sind Missionen mit unveränderten Zielen: je zehn hergestellte Vorgängerwaffen; Bogen und Stab benötigen je zehn 2H Schwerter und 2H Äxte. Bereits freigeschaltete Waffenformen bleiben beim Update verfügbar. Alte Spielstände werden kontrolliert auf Save 16 mit getrennten Dungeon-Läufen erweitert; Exportiere für einen Rückwechsel vorher deinen Spielstand.</p>
        </div>
        <div class="card span-12">
          <h2>Materialindex – gemeinsames Stat-System</h2>
          <p class="index-note">Ein Material besitzt ein gemeinsames Statprofil; ein Bauteil entscheidet, welche Werte davon beim Bau einer Waffe tatsächlich aktiviert werden. Nullwerte sind bewusst Teil des Datenmodells und können später für Rüstungen oder weitere Bauteile genutzt werden.</p>
          <div class="table-wrap mobile-stack">
            <table>
              <thead><tr>
                <th>Typ</th><th>Material</th><th>S</th><th>HP</th><th>E</th><th>R (%)</th><th>AW</th><th>SF</th><th>P</th><th>B</th><th>K-C</th><th>K-S</th><th>HP-R</th><th>E-R</th><th>ERF</th><th>LR</th><th>DS</th><th>SPE</th><th>SPE%</th><th>Quelle / Dropgewicht</th>
              </tr></thead>
              <tbody id="materialIndexRows"></tbody>
            </table>
          </div>
          <p class="index-note">Rüstung (R) wird 1:1 in Prozentpunkten geführt: R 1 = 1 % Schadensreduktion vor Durchschlag. Der finale Charakterwert ist auf 80 % begrenzt.</p>
          <p class="index-note">Bedrohung (B) ist eine reine Klasseneigenschaft. Ausrüstung verändert die Bedrohung nicht und Levelaufstiege erhöhen sie ebenfalls nicht.</p>
          <p class="index-note">Für Sehnen besitzen die Leder vorerst weiterhin die zuletzt vereinbarten SF/DS-Werte: Lederfetzen +0,01 SF / +1 %-Pkt. DS · Hasen-Leder +0,03 / +2 %-Pkt. · Fuchs-Leder +0,05 / +4 %-Pkt. Diese Werte wirken nur an Bauteilen, die SF bzw. DS aktivieren.</p>
          <div class="formula">Dungeon 1: Neuling und Tank besitzen zwei Material-IDs; Jäger und Lehrling besitzen drei. Lederfetzen droppen nur bei Jäger und Lehrling. Pro besiegtem Gegner wird genau ein Material aus diesem Pool gezogen; Drop% dient innerhalb dieses Gegnerpools als relatives Gewicht.</div>
        </div>

        <div class="card span-12">
          <h2>Bauteile & Materialwirkung</h2>
          <p class="index-note">Die Materialmenge bestimmt ausschließlich den Verbrauch. Der Stat eines gewählten Materials wird pro Bauteil genau einmal angewendet, unabhängig davon, ob der Bauplan für dieses Bauteil eine oder mehrere Materialeinheiten verlangt.</p>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Bauteil</th><th>Metall</th><th>Holz</th><th>Leder</th><th>Wirkung</th><th>Bedeutung</th></tr></thead>
            <tbody>
              <tr><td>Schneide</td><td>Ja</td><td>Nein</td><td>Nein</td><td>SF</td><td>Übernimmt den Schadensfaktor des Materials.</td></tr>
              <tr><td>Kern</td><td>Ja</td><td>Ja</td><td>Nein</td><td>R</td><td>Übernimmt die Rüstungs-Prozentpunkte des Materials.</td></tr>
              <tr><td>Griff</td><td>Nein</td><td>Ja</td><td>Nein</td><td>P</td><td>Übernimmt die Präzision des Materials.</td></tr>
              <tr><td>Wicklung</td><td>Nein</td><td>Nein</td><td>Ja</td><td>K-C</td><td>Übernimmt die Krit-Chance des Materials.</td></tr>
              <tr><td>Spezial</td><td>Ja</td><td>Ja</td><td>Ja</td><td>SPE</td><td>Aktiviert SPE und SPE% des Materials.</td></tr>
              <tr><td>Parierstange</td><td>Ja</td><td>Ja</td><td>Nein</td><td>R + AW</td><td>Übernimmt Rüstungs-Prozentpunkte und Ausweichen des Materials.</td></tr>
              <tr><td>Sehne</td><td>Nein</td><td>Nein</td><td>Ja</td><td>SF + DS</td><td>Übernimmt Schadensfaktor und Durchschlag des Leders.</td></tr>
            </tbody>
          </table></div>
        </div>

        <div class="card span-12">
          <h2>Waffenbaupläne</h2>
          <p class="index-note">Die Seite „Waffe herstellen“ zeigt Waffenwahl, benötigte Bauteile und „Weiter zur Vorschau“ gemeinsam in einer kompakten, nicht scrollenden Ansicht. Auch die Waffenwahl selbst besitzt keinen Scrollbereich. Solange eine Waffenform noch für die nächste Freischaltung gefertigt werden muss, steht der Fortschritt als x/10 am Namen; sobald 10/10 erreicht und die nächste Stufe freigeschaltet ist, wird dieser Fortschritt ausgeblendet.</p>
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
              <tr><td>1H Schwert</td><td>10</td><td>1,00</td><td>55 %</td><td>0 %</td><td>0</td><td>+1 %-Pkt.</td><td>0</td><td>+0,05</td><td>0</td><td>0</td><td>+10 %-Pkt.</td><td>0</td></tr>
              <tr><td>1H Axt</td><td>12</td><td>0,85</td><td>52 %</td><td>0 %</td><td>0</td><td>0</td><td>0</td><td>+0,08</td><td>0</td><td>0</td><td>+15 %-Pkt.</td><td>+5 %-Pkt.</td></tr>
              <tr><td>2H Schwert</td><td>16</td><td>0,80</td><td>55 %</td><td>0 %</td><td>0</td><td>+2 %-Pkt.</td><td>0</td><td>+0,10</td><td>0</td><td>0</td><td>+15 %-Pkt.</td><td>0</td></tr>
              <tr><td>2H Axt</td><td>20</td><td>0,70</td><td>50 %</td><td>0 %</td><td>0</td><td>0</td><td>0</td><td>+0,15</td><td>−0,05</td><td>0</td><td>+25 %-Pkt.</td><td>+10 %-Pkt.</td></tr>
              <tr><td>Bogen</td><td>11</td><td>0,90</td><td>65 %</td><td>0 %</td><td>0</td><td>0</td><td>+2 %-Pkt.</td><td>0</td><td>+0,10</td><td>+8 %-Pkt.</td><td>0</td><td>0</td></tr>
              <tr><td>Stab</td><td>10</td><td>1,00</td><td>60 %</td><td>0 %</td><td>+10</td><td>0</td><td>0</td><td>+0,05</td><td>+0,10</td><td>0</td><td>+15 %-Pkt.</td><td>0</td></tr>
            </tbody>
          </table></div>
          <p class="index-note">Waffenform-Boni und wirksame Bauteilwerte werden beim Ausrüsten auf den Charakter addiert. Bei zwei verschiedenen 1H-Waffen wirken die Charakterboni beider Waffen gemeinsam. Eine 2H-Waffe belegt beide Hände, wird aber für Stats und Angriffe nur einmal ausgewertet.</p>
        </div>
        <div class="card span-12">
          <h2>Waffen-Handverteilung</h2>
          <div class="table-wrap mobile-stack"><table><thead><tr><th>Klasse</th><th>Erlaubte Waffen</th><th>Bevorzugt</th></tr></thead><tbody>
            <tr><td>Rekrut</td><td>Dolch, 1H-/2H-Schwert, 1H-/2H-Axt, Stab</td><td>1H-Schwert + Dolch</td></tr>
            <tr><td>Kämpfer</td><td>1H-/2H-Schwert, 1H-/2H-Axt</td><td>2H-Schwert oder 2H-Axt</td></tr>
            <tr><td>Bogner</td><td>Dolch, 1H-Schwert, 1H-Axt, Bogen</td><td>Bogen</td></tr>
            <tr><td>Gelehrter</td><td>Dolch, Stab</td><td>Stab</td></tr>
          </tbody></table></div>
          <p class="index-note">Zwei Einhandwaffen beim Rekruten verursachen je 75 % Waffenschaden. Genau ein 1H-Schwert und ein Dolch erhalten zusätzlich den Präferenzfaktor 1,10: 75 % × 1,10 = 82,5 % je Waffe. Die Zuordnung zu linker/rechter Hand ist dafür egal. Andere erlaubte Einhandpaare bleiben bei 75 %; eine einzelne Waffe und Zweihänder erhalten keinen Zweiwaffenabzug.</p>
          <p class="index-note">Bevorzugte Waffen verursachen 10 % mehr Waffenschaden. Der Bonus verbessert weder Tempo noch Treffer-/Krit-Chance oder sonstige Charakterboni; kritische Treffer werden auf Basis des angepassten Schadens berechnet. Der Faktor wird aus der aktuellen Ausrüstung bestimmt. Waffen-Grundwerte und Marktpreise bleiben Gegenstandswerte.</p>
          <p class="index-note">Beim Laden oder JSON-Import wird unerlaubte Ausrüstung abgelegt und vollständig im Lager behalten. Erlaubte Waffen bleiben angelegt; sind zwei Waffen einzeln erlaubt, aber zusammen verboten, werden beide abgelegt. Es wird keine Ersatzwaffe gewählt. Geänderte Handbelegungen werden gesammelt gemeldet und Kampfwerte ohne zusätzliche Heilung neu berechnet.</p>
          <div class="formula">1H-Waffe → belegt genau eine gewählte Hand</div>
          <div class="formula">2H-Waffe → benötigt beide Hände und belegt beide Handplätze mit derselben Waffe</div>
          <p class="index-note">Eine 2H-Waffe belegt immer beide Handplätze. Sind beim gewählten Charakter bereits eine oder zwei 1H-Waffen oder eine andere 2H-Waffe ausgerüstet, werden diese beim Ausrüsten automatisch ersetzt und bleiben im Waffenlager verfügbar. Eine konkrete Waffe, die bereits bei einem anderen Charakter ausgerüstet ist, bleibt gesperrt. Beim Ablegen einer 2H-Waffe werden beide Handplätze gemeinsam geleert. Waffenfreigaben werden beim Ausrüsten geprüft. Nur der Rekrut darf zwei Einhandwaffen gleichzeitig tragen. Bogen und Stab belegen ebenfalls beide Hände. Schilde sind noch kein ausrüstbarer Gegenstand.</p>
        </div>

        <div class="card span-12">
          <h2>Kader, Charakterdetails & Rekrutierung</h2>
          <p class="index-note">Die Kaderseite zeigt ausschließlich die vorhandenen Charaktere als kompakte Liste mit Klassenemblem, Name, Klasse und Level. Antippen eines Eintrags öffnet die Charakterdetails in einem eigenen Popup; nach dem Schließen bleibt die Kaderliste als Seite bestehen.</p>
          <p class="index-note">Im Charakter-Popup zeigt das große Emblem die Klasse. Das Stift-Symbol neben dem Namen schaltet die Namensbearbeitung ein; Enter oder ✓ speichert den neuen Namen, Escape oder × verwirft die Eingabe.</p>
          <p class="index-note">Die Ausrüstungsleiste liegt direkt am Klassenbild im Charakter-Popup. Linke und rechte Hand zeigen die aktuell ausgerüstete Waffe; Antippen öffnet die bestehende Waffenauswahl für genau diese Hand. Bei einer 2H-Waffe zeigt die Auswahl „ERSETZT BEIDE HÄNDE“, wenn beim gewählten Charakter bereits Waffen liegen; das Ausrüsten übernimmt anschließend beide Handplätze.</p>
          <p class="index-note">Die Charakterwerte sind im Popup auf zwei Seiten mit je bis zu acht Werten verteilt. Die Pfeile unter den Werten wechseln ausschließlich die Werteseite. Das Popup wird über ×, Escape oder den abgedunkelten Hintergrund geschlossen.</p>
          <p class="index-note">Die Rekrutierungsseite verwendet dasselbe Bedienmuster: Eine kompakte Klassenliste öffnet beim Antippen ein Rekrutierungs-Popup mit großem Klassenemblem, den bestehenden Klassenwerten und der Aktion „Anwerben“. Rekrutierungskosten, Kaderkapazität und Klassenwerte bleiben unverändert.</p>
        </div>

        <div class="card span-12">
          <h2>Klassen-Grundwerte</h2>
          <p class="index-note">Im Trainingslager wird während der Suche jede Sekunde mit 5 % Chance eine neue Welle gefunden. Die reine Suchzeit beträgt im Mittel 20 Sekunden, bleibt aber zufällig; Kampf und Beutesammeln kommen zum Wellenabstand hinzu. Erfolglose Suchschritte heilen weiterhin jeden lebenden aktiven Charakter um 1 HP bis zum Maximum. Seltenere Wellen bedeuten auch weniger XP und Beute pro Stunde; die Belohnung pro Gegner bleibt unverändert.</p>
          <p class="index-note">Der Rekrut bleibt der Allrounder. Kämpfer, Bogner und Gelehrter sind stärker spezialisiert. Bedrohung ist fest an die Klasse gebunden, wird nicht durch Ausrüstung verändert und bleibt über alle Level konstant.</p>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Klasse</th><th>HP</th><th>E</th><th>R</th><th>AW</th><th>SF</th><th>P</th><th>B</th><th>K-C</th><th>K-S</th><th>HP-R</th><th>E-R</th><th>ERF</th><th>LR</th><th>DS</th></tr></thead>
            <tbody>
              <tr><td>Rekrut</td><td>30</td><td>100</td><td>2 %</td><td>10 %</td><td>1,00</td><td>1,00</td><td>50</td><td>5 %</td><td>150 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
              <tr><td>Kämpfer</td><td>35</td><td>100</td><td>3 %</td><td>8 %</td><td>1,10</td><td>0,95</td><td>100</td><td>4 %</td><td>160 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
              <tr><td>Bogner</td><td>26</td><td>100</td><td>1 %</td><td>15 %</td><td>0,95</td><td>1,15</td><td>33</td><td>10 %</td><td>150 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
              <tr><td>Gelehrter</td><td>22</td><td>100</td><td>0 %</td><td>5 %</td><td>1,15</td><td>1,10</td><td>25</td><td>5 %</td><td>175 %</td><td>0</td><td>5/min</td><td>100 %</td><td>0 %</td><td>0 %</td></tr>
            </tbody>
          </table></div>
          <div class="formula">Zielwahrscheinlichkeit = eigene Bedrohung ÷ Summe der Bedrohung aller lebenden Ziele</div>
        </div>

        <div class="card span-12">
          <h2>Level & Erfahrung</h2>
          <div class="formula">Start: Level 1 · 0 XP · Maximallevel 20</div>
          <div class="formula">XP für Level L → L+1 = gerundet(100 × 1,4^(L−1))</div>
          <div class="formula">HP, E, R, AW, K-C, HP-R, E-R, LR und DS: Level-1-Grundwert × 1,1^(L−1)</div>
          <div class="formula">SF, P (PRÄ) und K-S: Level-1-Grundwert × 1,01^(L−1)</div>
          <div class="formula">ERF und B (BED) werden durch Levelaufstiege nicht erhöht</div>
          <div class="formula">Finaler Stat = skalierter Klassen-Grundwert + Ausrüstungsboni; R wird anschließend auf maximal 80 % begrenzt</div>
          <p class="index-note">Die XP-Anforderung bleibt unabhängig von der Stat-Skalierung bei Faktor 1,4. Der bisherige Level-Faktor 1,1 bleibt für die nicht ausdrücklich reduzierten, von null verschiedenen Klassen-Grundwerte erhalten. SF, Präzision und Krit-Schaden wachsen nur noch mit Faktor 1,01. ERF bleibt auf dem Klassen-Grundwert; Bedrohung war bereits zuvor levelunabhängig. Null-Grundwerte bleiben 0 und Ausrüstungsboni werden nicht mit dem Level multipliziert.</p>
          <p class="index-note">Dungeon-XP: Jeder Gegner in Dungeon 1 besitzt aktuell 10 Basis-XP. Die Summe der besiegten Gegner-XP wird möglichst gleichmäßig auf alle Teilnehmer der gewonnenen Welle verteilt und anschließend mit dem jeweiligen ERF-Faktor des Charakters multipliziert. 10 XP bleiben vorerst der Test-/Vergleichswert.</p>
        </div>

        <div class="card span-12">
          <h2>Dungeon 1 – Gegner & Belohnungen</h2>
          <div class="table-wrap mobile-stack"><table>
            <thead><tr><th>Klasse</th><th>Name</th><th>Lootdrop 1</th><th>Lootdrop 2</th><th>Lootdrop 3</th><th>Basis-XP</th></tr></thead>
            <tbody>
              <tr><td>Rekrut</td><td>Neuling</td><td>ID 9 · Lederfetzen</td><td>ID 5 · Kupfer</td><td>ID 3 · Tanne</td><td>10</td></tr>
              <tr><td>Kämpfer</td><td>Tank</td><td>ID 9 · Lederfetzen</td><td>ID 4 · Zinn</td><td>ID 6 · Aluminium</td><td>10</td></tr>
              <tr><td>Bogner</td><td>Jäger</td><td>ID 9 · Lederfetzen</td><td>ID 8 · Fuchs-Leder</td><td>ID 7 · Hasen-Leder</td><td>10</td></tr>
              <tr><td>Gelehrter</td><td>Lehrling</td><td>ID 9 · Lederfetzen</td><td>ID 2 · Fichte</td><td>ID 1 · Morsche Fichte</td><td>10</td></tr>
            </tbody>
          </table></div>
          <p class="index-note">Die drei IDs definieren den Materialpool des Gegners. Pro Gegner bleibt es bei einem Materialwurf; die Drop%-Werte der gelisteten Materialien werden als relative Gewichte dieses Pools verwendet.</p>
          <p class="index-note">Ein laufender Dungeon-1-Lauf bleibt beim Schließen des Browsers gespeichert. Beim nächsten Öffnen wird die vergangene Zeit bis zur ursprünglich gespeicherten Endzeit nachgeholt; liegt die Endzeit noch in der Zukunft, läuft der Rest weiter, andernfalls wird der Lauf bis zu dieser Endzeit beendet. Ein Browser-Neustart startet keine neue 5-Stunden-Frist.</p>
        </div>

        <div class="card span-7">
          <h2>Kampfberechnung</h2>
          <div class="formula">Finaler Charakterstat = skalierte Klassenbasis + Waffenform-Boni + wirksame Bauteilwerte aller ausgerüsteten Waffen</div>
          <div class="formula">Bedrohung = unveränderter Klassen-Grundwert; Level und Ausrüstung werden für B ignoriert</div>
          <div class="formula">Schaden pro Treffer = Waffen-Grund-SCH × finaler SF</div>
          <div class="formula">Angriffsgeschwindigkeit = Waffen-Grund-GES × eigener SPE-GES-Faktor</div>
          <div class="formula">Trefferchance = Waffen-Grund-TRF × finale P, begrenzt auf 0–100 %</div>
          <div class="formula">Durchschlag = finaler DS</div>
          <div class="formula">Kritischer Treffer: K-C bestimmt die Chance; Schaden wird mit finalem K-S multipliziert</div>
          <div class="formula">Rüstung = additive Prozentpunkte, begrenzt auf maximal 80 %</div>
          <div class="formula">Effektive Rüstung = min(80 %, Ziel-Rüstung) × (1 − DS)</div>
          <div class="formula">Trefferschaden nach Rüstung = Angriffsschaden × (1 − effektive Rüstung / 100)</div>
          <p class="index-note">SPE wirkt nur im Spezial-Bauteil: GES verändert die Geschwindigkeit der betreffenden Waffe, P erhöht die Charakter-Präzision und DS erhöht den Charakter-Durchschlag.</p>
        </div>

        <div class="card span-5">
          <h2>Stat-Legende & Displayposition</h2>
          <table><thead><tr><th>Stat</th><th>Funktion</th><th>Position</th></tr></thead><tbody>
            <tr><td>HP</td><td>Lebenspunkte</td><td>Kader S1R1</td></tr><tr><td>E</td><td>Energie</td><td>Kader S1L2</td></tr>
            <tr><td>R</td><td>Rüstung in % Schadensreduktion, max. 80 %</td><td>Kader S1R2</td></tr><tr><td>AW</td><td>Ausweichen</td><td>Kader S1L3</td></tr>
            <tr><td>SF</td><td>Schadensfaktor</td><td>Kader S1R3</td></tr><tr><td>P</td><td>Präzision</td><td>Kader S1R4</td></tr>
            <tr><td>B</td><td>Bedrohung</td><td>Kader S2R1</td></tr><tr><td>K-C</td><td>Krit-Chance</td><td>Kader S1L4</td></tr>
            <tr><td>K-S</td><td>Krit-Schaden</td><td>Kader S2L1</td></tr><tr><td>HP-R</td><td>Lebenregeneration</td><td>Kader S2R2</td></tr>
            <tr><td>E-R</td><td>Energieregeneration</td><td>Kader S2L3</td></tr><tr><td>ERF</td><td>Erfahrung</td><td>Kader S2L4</td></tr>
            <tr><td>LR</td><td>Lebensraub</td><td>Kader S2R3</td></tr><tr><td>DS</td><td>Durchschlag</td><td>Kader S2L2</td></tr>
            <tr><td>SPE</td><td>Spezialeffekt</td><td>Waffen-/Materialanzeige</td></tr><tr><td>SPE%</td><td>Stärke des Spezialeffekts</td><td>Waffen-/Materialanzeige</td></tr>
          </tbody></table>
        </div>

        <div class="card span-12">
          <h2>Wirtschaft, Herstellung & Verkauf</h2>
          <p class="index-note">Ausbaupreise für Unterkunft, Schmiede und Markt verwenden halbierte Basispreise; die jeweiligen Wachstumsfaktoren bleiben unverändert. Rekrutierungskosten sind davon nicht betroffen.</p>
          <div class="formula">Materialwert = 10 Nickel × Seltenheit</div>
          <div class="formula">Positiver SPE auf einem Material → Materialwert × 1,10</div>
          <div class="formula">Material-Verkaufszeit = auf nächste 5 s aufrunden(15 s + 1,5 s × Materialwert)</div>
          <div class="formula">Waffen-Leistungswert = Mittelwert des erwarteten Waffenschadens nach Rüstung bei R = 0 %, 40 % und 80 %</div>
          <div class="formula">Prüfschaden = ROH × (1 − [min(80 %, R) × (1 − DS)] / 100)</div>
          <div class="formula">Waffenwert = auf nächste 5 Nickel runden(40 Nickel + 6 × Leistungswert)</div>
          <div class="formula">Herstellungszeit = auf nächste 5 s aufrunden(30 s + 0,7 s × Waffenwert)</div>
          <div class="formula">Waffen-Verkaufszeit = auf nächste 5 s aufrunden(15 s + 0,5 s × Waffenwert)</div>
          <p class="index-note">Die festen Prüfrüstungen 0/40/80 sind unabhängig vom Dungeon und decken das aktuelle Prozent-Rüstungssystem bis zum 80-%-Cap ab. Dadurch verändert ein neues Dungeon-Balancing nicht automatisch den Marktwert bestehender Waffen.</p>
          <p class="index-note">Der positive SPE-Bonus von 10 % gilt nur beim direkten Verkauf eines Rohmaterials. Bei fertigen Waffen gibt es keinen zweiten pauschalen SPE-Bonus: GES-, P- und DS-Effekte fließen über die tatsächlichen Waffenwerte bereits in den Leistungswert ein.</p>
          <p class="index-note">Die Seltenheit einer Waffe bleibt eine sichtbare Materialeigenschaft, bestimmt aber nicht mehr direkt Waffenwert, Herstellungszeit oder Waffen-Verkaufszeit. Materialmenge verändert weiterhin nur den Verbrauch, nicht den Statbeitrag eines Bauteils.</p>
          <p class="index-note">Die klassenabhängigen Waffenfreigaben sind aktiv. Waffen können unabhängig davon hergestellt, gelagert und verkauft werden, ob eine bestimmte Klasse sie tragen darf. Die vorbereiteten Schildfreigaben führen noch keine Schilde ein; Rüstungsklassen bleiben eine spätere Erweiterung.</p>
          <div class="formula">Material-Verkaufserlös = Materialwert pro Stück × Verkaufsmenge</div>
          <div class="formula">Währung: 100 Nickel = 1 Bronze · 100 Bronze = 1 Silber · 100 Silber = 1 Gold</div>
        </div>
      </div>
    </section>`;