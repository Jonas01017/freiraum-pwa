# Freiraum für Web, iPhone und iPad

Eine eigenständige, installierbare Aufgaben-App als Progressive Web App. Das native Android-Projekt bleibt unabhängig und unverändert. React, TypeScript und Vite; keine Anmeldung, kein Backend, keine Synchronisierung und keine externen Schriftarten, Analyse- oder Werbedienste.

App-Link: **https://jonas01017.github.io/freiraum-pwa/** · [Quellcode und automatische Builds](https://github.com/Jonas01017/freiraum-pwa)

## Auf iPhone oder iPad installieren

1. Den veröffentlichten HTTPS-Link in Safari öffnen.
2. Im Safari-Menü **Teilen → Zum Home-Bildschirm** wählen.
3. **Als Web-App öffnen** eingeschaltet lassen, falls diese Option erscheint, und **Hinzufügen** wählen.
4. Freiraum über das neue Icon starten und einmal mit Internet öffnen. Unter **Einstellungen** muss **Für Offline-Nutzung bereit** stehen.

Danach lässt sich die App offline starten und bearbeiten. Auf Chrome/Edge im Browsermenü **App installieren** wählen. Es werden kein Apple-Developer-Account, keine IPA und kein App Store benötigt. Die Installationshilfe ist freiwillig über die Einstellungen erreichbar. [Apple-Installationsanleitung](https://support.apple.com/guide/iphone/iphea86e5236/ios).

Safari und die installierte App können getrennte Speicherbereiche verwenden. Falls vor der Installation angelegte Aufgaben fehlen, aus Safari exportieren und in der installierten App importieren. Daten bleiben lokal pro Gerät und Browserprofil. Es gibt keine automatische Übertragung zwischen Freunden oder Geräten.

## Aufgaben organisieren

**+** benötigt nur einen Titel. Neue Aufgaben haben Priorität **Normal**, kein Datum und keine Uhrzeit. Über die Karte lassen sich Titel, mehrzeilige Notizen, Priorität, Liste, Datum und Uhrzeit ändern; gültige Änderungen werden automatisch gespeichert. Das Entfernen des Datums entfernt auch die Uhrzeit.

Unteraufgaben können einzeln abgehakt, bearbeitet, entfernt und über ihr Menü verschoben werden. Offene Unteraufgaben verhindern den Abschluss der Hauptaufgabe nicht; vorab erfolgt eine Bestätigung. Fortschritt erscheint ausschließlich in deren Details.

Die Übersicht gruppiert offene Aufgaben in **Noch offen**, **Heute**, **Demnächst** und **Ohne Termin**. Abschnitte lassen sich einklappen. **Alle Aufgaben** bietet Suche in Titeln und Notizen, kombinierte Filter und Sortierung nach Termin, Priorität, Erstellungszeit oder manueller Position. Manuelle Reihenfolge: im Aufgabenmenü **Nach oben / Nach unten** wählen. Aufgaben lassen sich duplizieren und löschen; Abschlüsse, Wiederherstellungen und Löschungen können rückgängig gemacht werden. Erledigte Aufgaben stehen separat unter **Erledigt**.

Eigene Listen erhalten einen Namen und eine von sechs Farben. Beim Löschen einer Liste bleiben alle Aufgaben im **Eingang** erhalten. Hell, Dunkel und Systemdesign werden unterstützt. Die Gestaltung folgt der Android-App und enthält keine Ziele, Streaks, Leistungsbewertungen oder Benachrichtigungen.

## Speicherung und Sicherung

Aufgaben, Listen und relevante Einstellungen liegen in IndexedDB. Schreiboperationen werden sequenziell und transaktional ausgeführt; jede Transaktion liest den neuesten Datenbestand, statt eine veraltete Gesamtansicht zurückzuschreiben. Mehrere Fenster erhalten Aktualisierungen per BroadcastChannel sowie beim erneuten Fokussieren. Bei Konflikten im selben Feld gilt die zuletzt gespeicherte Änderung. Unabhängige Feldänderungen bleiben erhalten.

Ein fehlgeschlagener Schreibvorgang wird sichtbar gemeldet. Eingaben werden nicht als gespeichert ausgegeben; erneutes Speichern ist möglich. Bei nicht verfügbarer oder ungültiger Datenbank wird kein leerer Ersatzbestand angelegt. Der Browser kann eine Anfrage nach dauerhaftem Speicher gewähren; diese ist in den Einstellungen freiwillig und keine absolute Garantie. Website-Daten können durch manuelles Löschen oder Speicherbereinigung verloren gehen. **Gelegentlich exportieren**, insbesondere vor Gerätewechsel oder Löschen von Browserdaten. Details: [WebKit-Speicherregeln](https://webkit.org/blog/14403/updates-to-storage-policy/).

Unter **Einstellungen → Sicherung exportieren** wird eine unverschlüsselte JSON-Datei heruntergeladen. Unterstützte Browser können sie auch über **Sicherungsdatei teilen** weitergeben. Die Sicherung enthält alle Aufgaben, Unteraufgaben und deren Reihenfolge/Status, Notizen, Listenfarben, Prioritäten, Kalenderdaten, Uhrzeiten, Abschluss-/Erstellungszeitpunkte, manuelle Positionen und Web-Einstellungen.

Importe bis 10 MB werden vorab vollständig geprüft und dann in einer einzigen Transaktion **als zusätzliche Kopien** eingefügt. Bestehende Daten werden nicht gelöscht. Wiederholte Importe erzeugen weitere Kopien. Bei Web-Sicherungen kann die Übernahme der Einstellungen abgewählt werden.

### Kompatibilität mit Android

Die Android-App verwendet `format: "freiraum"`, `version: 1`, `exportedAt`, `lists`, `tasks`. Dieselben Felder und Nummernwerte gelten hier. Kalenderdaten bleiben unveränderte Epoch-Day-Zahlen, Uhrzeiten Minuten seit Mitternacht; somit gibt es beim Import keine Zeitzonenverschiebung. Androids ausgelassene `null`-Werte werden korrekt angenommen.

Die PWA ergänzt optional **`pwaSettings`** mit `theme`, `sort` und `collapsed`. Androids Gson-Parser ignoriert dieses Zusatzfeld. PWA-Sicherungen lassen sich daher in der unveränderten Android-App importieren und Android-Sicherungen in der PWA. Android übernimmt keine Web-Einstellungen und exportiert sie beim nächsten Export auch nicht wieder. Ohne das Zusatzfeld bleiben beim PWA-Import die bisherigen Web-Einstellungen erhalten. Ein Android-Kalendertag außerhalb der Kalenderanzeige (Jahre 1–9999) bleibt numerisch erhalten und wird als Kalendertag angezeigt.

## Offline-Nutzung und Updates

Ein eigener Service Worker speichert nur die selbst gehosteten App-Ressourcen. Der Produktionsbuild berechnet aus deren Inhalten eine neue Cache-Version. Die Offline-Bereitschaft wird erst nach erfolgreicher Aktivierung **und Kontrolle der geöffneten Seite** angezeigt. Navigation und Ressourcen kommen anschließend aus dem vollständigen installierten App-Shell.

Eine neue Version wird im Hintergrund vorbereitet. Die Oberfläche bietet dezent **Aktualisieren** an; nach abgeschlossenen Schreibvorgängen aktiviert dieser Button die neue Version und lädt neu. Eine Aufgabe muss vorher fertig bearbeitet werden, wenn sie noch ungültige oder ungespeicherte Eingaben enthält. Ohne diesen Button aktiviert sich eine bereitstehende Version, wenn alle bisherigen Fenster geschlossen sind. Eine vorherige App-Shell bleibt zusätzlich im Cache, damit andere offene Fenster ihre Sitzung beenden können. Benutzeraufgaben liegen separat in IndexedDB und werden durch Cache-Updates nicht gelöscht. Es wird keine Hintergrundsynchronisierung vorgetäuscht.

## Entwickeln und testen

Benötigt: Node.js 24 und pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm exec playwright install --with-deps chromium webkit
pnpm test:e2e
```

`pnpm dev` dient der Oberfläche während der Entwicklung; dort wird absichtlich kein Service Worker registriert. Für die Produktionsvorschau: erst `pnpm build`, dann `pnpm preview`. Die Browser-Tests starten ihren eigenen ausschließlich an `127.0.0.1:4173` gebundenen Vorschau-Server. Dessen `__test`-Endpunkte existieren nur im lokalen Testserver, werden nicht gebaut und nicht gehostet. Der Testsatz verwendet nur synthetische Daten in eigenen Browserprofilen.

Der Build liegt in `dist/`, einschließlich generierter PNG-Icons, Manifest und Service Worker. Alle Pfade sind relativ und auch für GitHub Pages unter einem Repository-Unterpfad geeignet. Produktiv sind HTTPS oder der sichere Loopback-Kontext notwendig.

### Projektstruktur

- `src/model.ts`: Android-kompatible Datenmodelle, strikte Sicherungsvalidierung, Kalenderarithmetik, Filter und Änderungslogik.
- `src/storage.ts`: IndexedDB, atomare Schreiboperationen, mehrere Fenster, Speicherung der Einstellungen.
- `src/App.tsx`, `TaskDetail.tsx`, `Settings.tsx`, `components.tsx`: zugängliche Oberflächen, native Dialoge und Navigation.
- `src/pwa.ts`, `scripts/service-worker.mjs`: Offline-Bereitschaft und sichere App-Shell-Updates.
- `src/styles.css`, `tokens.css`: responsive Indigo-Gestaltung, Safe Areas, Tastatur-Viewport und reduzierte Animationen.
- `tests/`: Daten-, Speicher- und Browserprüfungen; konkrete Ergebnisse und Grenzen siehe `TESTBERICHT.md`.

## Kostenlos veröffentlichen

Die mitgelieferte GitHub-Action baut und testet Änderungen an `main`, einschließlich Chromium und WebKit. Nur nach erfolgreichen Tests wird `dist/` auf GitHub Pages veröffentlicht. Pull Requests werden geprüft, aber nicht veröffentlicht. Neue Änderungen benötigen keine erneute Installation auf dem Home-Bildschirm.

Für ein eigenes Repository: dieses unabhängige Projekt hochladen, das Repository öffentlich anlegen und unter **Settings → Pages → Source: GitHub Actions** wählen. Es sind keine API-Schlüssel oder zusätzlichen Secrets erforderlich. Der Workflow benötigt nur die von GitHub bereitgestellten `pages: write`- und `id-token: write`-Berechtigungen. [GitHub Pages ist für öffentliche Repositories mit GitHub Free verfügbar](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Es werden keine kostenpflichtigen Dienste eingebunden. Die kostenlose Verfügbarkeit unterliegt den Bedingungen und Grenzen des Hosting-Anbieters.

Der öffentliche Quellcode enthält ausschließlich dieses Web-Projekt. Persönliche Aufgaben werden niemals ins Repository oder an einen App-Server übertragen. Beim ersten Online-Abruf erhält der Hosting-Anbieter übliche HTTP-Verbindungsdaten; offline werden keine externen Dienste benötigt.
