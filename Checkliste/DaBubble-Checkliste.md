# Projektabgabe DABubble

Bitte erfülle alle Punkte auf dieser Liste, bevor du das Projekt einreichst. Diese Definition of Done (DoD) kannst du für alle deine Projekte verwenden.

## Allgemein

### Funktioniert die Seite?

- [ ] Funktionieren alle Links / Buttons?
- [ ] Es treten keine Fehlermeldungen auf in der Console.
- [ ] Funktioniert die Seite auch im Inkognito-Modus?

### Design

- [ ] Bitte setze das Design 1:1 wie in Figma um
  - [ ] Gleiche Farben
  - [ ] Gleiche Abstände & Konsistenz
    - [ ] Abstände zwischen Elementen sind immer gleich groß
    - [ ] Abstände zum Rand sind auf jeder Unterseite gleich groß
  - [ ] Gleiche Schriftarten
- [ ] Favicon vorhanden
- [ ] Haben Buttons die CSS Eigenschaft `cursor: pointer;`?
- [ ] Inputs und Buttons haben keinen Standard-Border

### Responsiveness

- [ ] Jede Seite ist responsive bis 320px
- [ ] Kein Scrollbalken bei kleineren Auflösungen

### Formulare

- [ ] Form-Validation: Was passiert bei leeren Inputs?
- [ ] Der Nutzer bekommt spezifische Fehlermeldungen angezeigt (keine Alerts / Html5)
- [ ] Beachte enabled / disabled / onhover State der Buttons

### TypeScript / Clean Code

- [ ] Strict mode ist im Compiler aktiviert
- [ ] Eine Funktion hat nur eine Aufgabe
- [ ] Eine Funktion ist maximal 14 Zeilen lang
- [ ] Beschreibende Funktionsnamen kurz und prägnant
- [ ] Vermeidung von Namenskonflikten mit Variablen und anderen reservierten Wörtern
- [ ] Geschrieben in camelCase (Richtig: `shoppingCart`, falsch: `Shopping_Cart`)
- [ ] Der erste Buchstabe von Funktionen / Variablen ist klein geschrieben
- [ ] 1-2 Leerzeilen Abstand zwischen Funktionen
- [ ] Max 400 LOCs (Lines of Code) pro Datei
- [ ] Sinnvolle Ordnerstruktur
  - [ ] Ordner für Komponenten
  - [ ] Ordner für Bilder (img)
  - [ ] Shared Ordner
  - [ ] ggf. pipes Ordner
- [ ] Optional: Verwendung von [compodoc.app](https://compodoc.app) zur Dokumentation des Codes

### GitHub-Richtlinien

- [ ] **Pflicht:** GitHub von Anfang an nutzen und pflegen. Denkt dran: Euer GitHub-Profil ist eure Visitenkarte für Arbeitgeber – nutzt diese Chance!
- [ ] Euer **gemeinsames Repository** muss public sein
- [ ] Regelmäßige Commits von jedem Teilnehmer (mindestens ein Commit pro Arbeitssitzung)
- [ ] Verwendet **aussagekräftige** Commit-Messages
- [ ] `.gitignore` verwenden, um unnötige Dateien auszuschließen
- [ ] Nach Abschluss der Gruppenarbeit sollte jedes Gruppenmitglied das Projekt *forken*

## Benutzeraccount & Administration

### User Story 1

Als neuer Benutzer möchte ich mich registrieren können, um Zugang zur App zu erhalten und sie nutzen zu können.

- [ ] Es gibt ein Registrierungsformular, auf dem Benutzer ihre E-Mail-Adresse, ihren Namen und ihr Passwort eingeben können
- [ ] Bei falscher Eingabe (z.B. ungültige E-Mail, schwaches Passwort) erhält der Benutzer eine spezifische Fehlermeldung.
- [ ] Optional: Benutzer können sich mit ihrem Google Account registrieren
- [ ] Optional: Bei erfolgreicher Registrierung erhält der Benutzer eine Bestätigungs-E-Mail.
- [ ] Benutzer können ihren Avatar bei Registrierung auswählen

### User Story 2

Als Benutzer möchte ich mich anmelden können, damit ich auf mein Konto zugreifen kann.

- [ ] Benutzer können ihre E-Mail-Adresse und ihr Passwort eingeben.
- [ ] Wenn die eingegebenen Anmeldedaten korrekt sind, hat der Benutzer Zugriff auf sein Konto.
- [ ] Bei falscher Eingabe erhält der Benutzer eine entsprechende Fehlermeldung unter dem betroffenen Eingabefeld.

### User Story 3

Als Benutzer möchte ich eine "Passwort vergessen"-Option haben, um mein Konto wiederherzustellen, falls ich mein Passwort vergessen habe.

- [ ] Auf der Anmeldeseite gibt es eine Option "Passwort vergessen".
- [ ] Wenn diese Option ausgewählt ist, kann der Benutzer seine E-Mail-Adresse eingeben und erhält eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts.
- [ ] Nachdem das Passwort zurückgesetzt wurde, kann der Benutzer sich mit dem neuen Passwort anmelden.

### User Story 4

Als Benutzer möchte ich meinen Namen und Avatar in meinem Profil bearbeiten können, um sicherzustellen, dass meine persönlichen Informationen aktuell und korrekt sind.

- [ ] Es gibt eine Option in den Benutzereinstellungen, um das Profil zu bearbeiten.
- [ ] Im Bearbeitungsmodus können Benutzer ihren Namen ändern.
- [ ] Nach dem Speichern der Änderungen werden die aktualisierten Informationen im Profil des Benutzers angezeigt.
- [ ] Benutzer können ihren Avatar aus einer vorgegebenen Auswahl ändern

### User Story 5

Als Benutzer möchte ich das Menü mit Channels und Direktnachrichten minimieren können, um mehr Platz auf meinem Bildschirm zu haben und mich auf die aktuelle Chat-Ansicht konzentrieren zu können, besonders auf mobilen Geräten, wo separate Ansichten für das Menü und den Chat vorgesehen sind.

- [ ] Es gibt eine Option (z.B. ein Icon oder Button), um das Menü mit Channels und Direktnachrichten zu minimieren.
- [ ] Bei Auswahl dieser Option wird das Menü minimiert und die Chat-Ansicht nimmt mehr Platz auf dem Bildschirm ein.
- [ ] Es gibt eine Option, um das Menü mit Channels und Direktnachrichten wieder zu maximieren, wenn der Benutzer mehr Details sehen möchte.
- [ ] Auf mobilen Geräten gibt es separate Ansichten für das Menü und die Chat-Ansicht.
- [ ] Durch Auswahl eines Channels oder einer Direktnachricht aus dem Menü, wechselt der Benutzer zur entsprechenden Chat-Ansicht.

### User Story 6 (optional)

Als Benutzer möchte ich den Online-Status von anderen Benutzern sehen können, um zu wissen, wer gerade verfügbar ist und wer nicht.

- [ ] Jeder Benutzer hat einen sichtbaren Online-Status, der anzeigt, ob er online, offline oder abwesend ist.
- [ ] Der Online-Status wird in Echtzeit aktualisiert, basierend auf der Aktivität des Benutzers in der App.
- [ ] Der Online-Status eines Benutzers ist neben seinem Namen oder Profilbild in Chats, Kanälen und im Menü mit Channels und Direktnachrichten sichtbar.

## Schreiben in Channels & Direktnachrichten

### User Story 1

Als Benutzer möchte ich Direktnachrichten an andere Mitglieder schreiben können, um einen persönlichen Austausch zu haben.

- [ ] Benutzer können eine Direktnachrichten-Konversation mit einem beliebigen Benutzer starten.
- [ ] Direktnachrichten sind nur für die beteiligten Benutzer sichtbar.
- [ ] Beim Wechsel vom Channel wird der Fokus automatisch in das Inputfeld gesetzt, damit der Endnutzer sofort schreiben kann.

### User Story 2

Als Benutzer möchte ich auf Nachrichten mit Emoticons reagieren können, um schnell und einfach meine Gefühle auszudrücken.

- [ ] Es gibt eine Option, auf jede Nachricht mit einem Emoticon zu reagieren.
- [ ] Vorgegebene Emoticons sind zur Auswahl verfügbar. Die zwei zuletzt genutzten Emoticons sind direkt über die Aktionsleiste auswählbar. (wenn noch keine verwendet wurden, sollen die Standard Emoticons wie in Figma angezeigt werden)
- [ ] Die ausgewählten Emoticons werden unter der Nachricht angezeigt und sind für alle Benutzer sichtbar.
  - [ ] Desktop: maximal 20 Reaktionen möglich/sichtbar
  - [ ] Mobil (+ Desktop Thread): maximal 7 Reaktionen sichtbar + "+ x weitere" Button
- [ ] Benutzer können sehen, wer auf eine Nachricht mit welchem Emoticon reagiert hat.

### User Story 3

Als Benutzer möchte ich Nachrichten mit Emoticons schreiben können, um meine Nachrichten ausdrucksstärker zu gestalten.

- [ ] Während der Eingabe einer Nachricht kann der Benutzer ein Emoticon aus einer Liste auswählen und in die Nachricht einfügen.
- [ ] Die eingefügten Emoticons werden in der gesendeten Nachricht angezeigt.
- [ ] Vorgegebene Emoticons sind zur Auswahl verfügbar
- [ ] Andere Benutzer können die Emoticons in den Nachrichten sehen.
- [ ] Mehrfach genutzte Emoticons werden durch einen Zählerstand dargestellt.

### User Story 4

Als Nutzer möchte ich die Möglichkeit haben, beim Verfassen einer neuen Nachricht in DaBubble, durch die Verwendung von "#" oder "@" spezifische Kanäle oder Mitglieder schnell zu finden und auszuwählen, um die Adressaten der Nachricht so einfach wie möglich zu bestimmen.

- [ ] Beim Verfassen einer neuen Nachricht, wenn ich "#" in das Adressfeld eingebe, sollten alle existierenden Kanäle in einem Dropdown-Menü zur Auswahl angezeigt werden.
- [ ] Beim Verfassen einer neuen Nachricht, wenn ich "@" in das Adressfeld eingebe, sollte eine Liste aller Mitglieder im aktuellen Space in einem Dropdown-Menü zur Auswahl angezeigt werden.

### User Story 5

Als Benutzer möchte ich einen Thread zu einer bestehenden Nachricht sowohl in Kanälen als auch in privaten Chats starten können, um die Diskussion auf dieses spezifische Thema zu fokussieren und die Hauptkommunikation übersichtlich zu halten.

- [ ] Benutzer können auf eine bestimmte Nachricht in einem Kanal oder privaten Chat klicken und die Option "Thread starten" starten mit Klick auf das Icon
- [ ] Sobald ein Thread gestartet wurde, können andere Benutzer in diesem Thread antworten und die Diskussion fortsetzen.
- [ ] Threads sind in der Benutzeroberfläche klar als solche gekennzeichnet und von den normalen Nachrichten im Hauptkanal oder privaten Chat unterscheidbar.
- [ ] Nach der Eingabe von "#" oder "@" sollte sich ein entsprechendes Dropdown-Menü öffnen, um Kanäle oder andere Mitglieder zu taggen.

### User Story 6

Als Benutzer möchte ich Nachrichten in Kanälen und privaten Chats suchen können, damit ich ältere Diskussionen leicht finden kann.

- [ ] Benutzer können nach Stichworten in allen ihren Chats und Kanälen suchen.
- [ ] Die Suchergebnisse zeigen den Kontext der gefundenen Nachrichten an.
- [ ] Nach der Eingabe von "#" oder "@" sollte sich ein entsprechendes Dropdown-Menü öffnen. Nach weiterer Eingabe sollten sich die Ergebnisse filtern und verfeinern, um die relevantesten Auswahlmöglichkeiten anzuzeigen.
- [ ] Die angezeigte Liste sollte in Echtzeit aktualisiert werden, um eine optimale Benutzererfahrung zu gewährleisten.

## Management von Channels

### User Story 1

Als Benutzer möchte ich Channels erstellen können, um spezifische Diskussionen mit Gruppen von Benutzern zu führen.

- [ ] Benutzer können neue Channels erstellen und einen Namen und eine Beschreibung hinzufügen.
- [ ] Der Ersteller des Channels kann andere Benutzer zum Kanal einladen.
- [ ] Alle Benutzer im Channel können Nachrichten senden und empfangen.
- [ ] Es sollte eine Überprüfung auf Duplikate bei der Namensgebung von Channels geben, um Verwirrungen zu vermeiden.

### User Story 2

Als Mitglied eines Channels möchte ich andere Benutzer nachträglich zum Channel hinzufügen können, um sicherzustellen, dass alle relevanten Personen an den Diskussionen teilnehmen können.

- [ ] Jedes Mitglied eines Channels hat die Möglichkeit, weitere Benutzer zum Channel hinzuzufügen.
- [ ] Die Option zum Hinzufügen von Benutzern ist im Channelmenü verfügbar.
- [ ] Das Channelmitglied kann einen oder mehrere Benutzer aus einer Liste auswählen und sie zum Kanal hinzufügen.

### User Story 3

Als Mitglied eines Kanals möchte ich diesen verlassen können, wenn ich nicht länger an den Diskussionen teilnehmen möchte oder der Kanal für mich nicht mehr relevant ist.

- [ ] Jedes Mitglied eines Kanals hat die Möglichkeit, diesen zu verlassen.
- [ ] Die Option zum Verlassen eines Kanals ist in den Kanaleinstellungen verfügbar.

### User Story 4

Als Benutzer möchte ich die Möglichkeit haben, die Namen und Beschreibungen meiner Channels zu editieren, um eine genaue und relevante Kommunikationsstruktur zu gewährleisten.

- [ ] Benutzer sollten in der Lage sein, auf die Einstellungen eines Channels zugreifen und dort den Namen und die Beschreibung des Channels bearbeiten zu können.
- [ ] Die Änderungen an Namen und Beschreibung sollten sofort wirksam sein und für alle Mitglieder des Channels sichtbar sein.
- [ ] Es sollte eine Überprüfung auf Duplikate bei der Namensgebung von Channels geben, um Verwirrungen zu vermeiden.
- [ ] Benutzer sollten Warnungen oder Fehlermeldungen erhalten, wenn die Änderungen nicht erfolgreich waren

---
*Quelle: Checkliste - DaBubble 2024, Developer Akademie*
