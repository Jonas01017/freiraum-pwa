# Freiraum PWA 1.0 – Testbericht

Stand: 27. Oktober 2026. Eigenständiges Web-Projekt; die vier Kotlin-Quelldateien der Android-App wurden vor und nach der Umsetzung per SHA-256 verglichen und sind unverändert.

## Ergebnisse der lokalen Freigabe

| Prüfung | Ergebnis |
|---|---|
| TypeScript-Prüfung | Bestanden |
| Produktionsbuild | Bestanden; alle Ressourcen lokal gebündelt |
| Logik- und IndexedDB-Tests | 13 bestanden |
| Browser-Ende-zu-Ende-Tests | 24 bestanden, keine übersprungenen oder instabilen Tests |
| Android-Sicherungen in der PWA | Bestanden, einschließlich ausgelassener Null-Felder |
| PWA-Sicherung im tatsächlich kompilierten Android-Parser | Bestanden, ohne Änderungen am Android-Code |
| Tatsächlicher Android-Re-Export zurück in die PWA | Bestanden; Web-Einstellungen werden von Android wie dokumentiert weggelassen |
| Quellcodeprüfung auf Zugangsdaten und lokale Dateipfade | Keine Zugangsdaten oder privaten Projektdateien im veröffentlichten Quellumfang |

Testumgebung: Windows, Node.js 24.22.1, TypeScript 5.9.3, Vite 7.2.2, Vitest 3.2.4, Playwright 1.56.1. Browser: Chromium 141 und Playwright-WebKit 26.0. Alle Tests arbeiten mit synthetischen Aufgaben in eigenen Browserkontexten.

Vier Browserkonfigurationen mit jeweils sechs Szenarien:

- Chromium mit Smartphone-Viewport und Touch-Eingaben.
- WebKit mit iPhone-13-Geräteeinstellungen (390 × 664 CSS-Pixel).
- WebKit mit iPad-Pro-11-Geräteeinstellungen (834 × 1194 CSS-Pixel).
- Chromium Desktop (1440 × 1000 CSS-Pixel).

Die automatische GitHub-Action führt dieselben Tests vor jeder Veröffentlichung erneut auf Linux aus. Der aktuelle Lauf und sein Ergebnis sind im Repository unter **Actions → Test and deploy Freiraum** einsehbar. Das Deployment erfolgt ausschließlich nach erfolgreichem Build und erfolgreichen Tests.

## Geprüfte Funktionen

1. Schnelle Erstellung mit ausschließlich Titel; Normal als Priorität und leere Datums-/Uhrzeitfelder.
2. Titel-/Notizbearbeitung, Datum und Uhrzeit, Datum entfernen mit gleichzeitigem Entfernen der Uhrzeit.
3. Mehrzeilige und Unicode-Notizen, Hinzufügen und Abhaken von Unteraufgaben, Fortschritt nur in der Detailansicht.
4. Bestätigung beim Abschließen mit offenen Unteraufgaben, Rückgängig, separater Erledigt-Bereich und Wiederherstellung.
5. Speicherung nach Seitenneustart und nach Schließen/Wiederöffnen der IndexedDB-Datenbank.
6. Suche auch in Notizen, kombinierte Filter, Fälligkeits-/Prioritäts-/Erstellungs-/manuelle Sortierung.
7. Listenänderungen und -löschung mit Erhalt ihrer Aufgaben im Eingang, Duplizieren und manuelle Reihenfolge.
8. Vollständiger JSON-Export, Android-Import, Import als Kopien, Wiederherstellung von Web-Einstellungen sowie Ablehnung ungültiger Dateien ohne Teiländerung.
9. Zwei gleichzeitig geöffnete Datenbankinstanzen: unabhängige Feldänderungen bleiben erhalten; fehlgeschlagene Transaktionen hinterlassen keine Teiländerung.
10. Offline-Start und anschließende neue Aufgaben mit erneutem Seitenneustart; gecachte HTML-, JavaScript-, CSS-, Manifest- und Icon-Ressourcen.
11. Bereitstehendes Service-Worker-Update: kein ungefragter Seitenneustart, Aktualisierung über den angebotenen Button, Aufgaben bleiben erhalten.
12. Hell-/Dunkelmodus einschließlich Speicherung der Einstellung, responsive Ansichten, Manifest mit Standalone-Start und tatsächlich erreichbare PNG-Icons.

## Offline-Test und WebKit-Besonderheit

Chromium wurde zusätzlich mit deaktiviertem Browser-Netzwerk getestet. In allen Browserkonfigurationen wurde der tatsächliche Vorschau-Ursprung während des Tests unerreichbar geschaltet (Verbindungen werden beendet). Eine zusätzliche direkte Anfrage ohne Service Worker musste dabei scheitern, während die PWA aus dem lokalen Cache neu startete und Änderungen speicherte.

Playwrights `context.setOffline(true)` blockiert in WebKit selbst Antworten eines Service Workers. Dies ist ein dokumentierter [Playwright-/WebKit-Testfehler](https://github.com/microsoft/playwright/issues/42775). Deshalb verwendet der WebKit-Test einen unerreichbaren Ursprung statt dieses Simulationsschalters. Es wurde keine Anwendungscode-Abkürzung für den Offline-Test eingebaut. Die ausschließlich lokalen Teststeuerungs-Endpunkte werden nicht veröffentlicht.

Die Tests fanden einen Safari-Layoutüberlauf bei langen Notizen. Die Grid-Elemente wurden korrigiert und auf beiden Engines erneut geprüft. Die Offline-Bereitschaft wird erst nach Kontrolle der geöffneten Seite durch den Service Worker gemeldet, nicht bereits allein nach dessen Installation.

## Praktisch noch nicht geprüft

- Kein physisches iPhone oder iPad war angeschlossen. Playwright-WebKit ist eine echte WebKit-Engine, aber kein vollständiges Safari auf iOS.
- Das Hinzufügen zum Home-Bildschirm, das Aussehen des Icons auf einem echten Home-Bildschirm, reales Standalone-Verhalten und reale Displayausschnitte benötigen eine praktische Geräteprüfung. Manifest, Startpfad, Scope, Icon-Dateien und Apple-Metadaten sind eingerichtet und geprüft.
- Die echte iOS-Bildschirmtastatur, deren Animationen, die iOS-Dateien-App und das native Teilen einer Sicherungsdatei konnten nicht auf echter Hardware geprüft werden. Die Oberfläche berücksichtigt `visualViewport`, dynamische Höhe und Safe Areas; Downloads/Dateiimporte wurden in beiden Browser-Engines getestet.
- Kein umfassender VoiceOver-/TalkBack-Test. Dialoge nutzen native Fokusführung, beschriftete Steuerelemente, Tastaturbedienung und reduzierte Animationen. Eine formale Barrierefreiheitsprüfung liegt nicht vor.
- Browser können lokale Website-Daten löschen. Eine unbedingte Dauerhaftigkeitsgarantie wird nicht gegeben; Hinweise und freiwillige Speicheranfrage stehen in den Einstellungen. Eine Sicherung bleibt beim Nutzer.
- Es gibt kein Backend und keine geräteübergreifende Synchronisierung. Änderungen an künftig notwendigen IndexedDB-Schemaversionen müssen mit Migrationen und Migrationstests ergänzt werden; die erste Version verwendet Schema 1.

## Bereitstellung

- Öffentlicher App-Link: https://intelouis.github.io/freiraum-pwa/
- Quellcode, Workflow und reproduzierbarer Build: https://github.com/Intelouis/freiraum-pwa
- Installations- und Sicherungsanleitung: `README.md`.
- Lokale PNG-Vorschauen: `qa-artifacts/<Browserkonfiguration>/` (nicht Teil der veröffentlichten App).

Neue Installationen sind leer. Die Screenshots enthalten ausschließlich synthetische Beispieldaten aus den Tests.
