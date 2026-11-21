# Fahrzeugcheck – Ankaufsbewertung fürs iPhone

Web-App zum Bewerten von Fahrzeugen beim Ankauf. Sie wird über Safari auf den
Home-Bildschirm gelegt, läuft danach wie eine App und funktioniert offline.
Alle Daten und Fotos bleiben auf dem iPhone. Es gibt keinen Server und kein Konto.

## Funktionen

- **Fahrzeugtyp:** Kleinwagen, Limousine, Kombi, SUV, Coupé, Cabrio, Van/Bus,
  Transporter oder Pickup, jeweils mit Türvariante (2/4 Türen, Schiebetüren).
- **Karosserie-Skizze** (aufgeklappte Draufsicht): Teil antippen, dann Lackschichtdicke
  (mehrere Messpunkte), Material, Schäden mit Schwere und Kosten, Fotos und Notiz erfassen.
  - Die Ampelfarbe zeigt den Zustand.
  - Ansicht umschaltbar: Gesamt, Lack oder Schäden.
- **Lack-Rundgang:** Alle Teile werden der Reihe nach im Uhrzeigersinn abgefragt.
  Wert eintippen, „Weiter“ tippen, fertig.
- **Reifen & Bremsen:**
  - Profiltiefe und DOT-Alter pro Rad, mit Ampel
  - Radsatz, zweiter Radsatz, Ersatzrad
  - Bremsen mit automatischem Kostenvorschlag
- **Checkliste:** rund 60 Prüfpunkte in Gruppen (Unterlagen, Außen, Innen, Elektrik,
  Motorraum, Probefahrt, Diagnose, bei E-Autos und Hybriden auch das Hochvoltsystem).
  - Jeder Punkt: i.O., Mangel oder n.v.
  - Bei einem Mangel lassen sich Notiz, Kosten und Foto ergänzen.
  - Eigene Prüfpunkte kommen in den Einstellungen dazu.
- **Fotos:** geführte Foto-Runde mit 20 Positionen, dazu weitere Fotos.
  „Alle Fotos teilen“ legt sie z. B. in der Fotos-App ab.
- **Texterkennung**, lokal auf dem Gerät:
  - FIN, der Hersteller wird aus der FIN abgeleitet
  - km-Stand
  - Fahrzeugschein: FIN, Erstzulassung, HSN/TSN, Marke, Modell, kW, Hubraum,
    Kraftstoff, Farbe, Kennzeichen
  - Vor der Übernahme wird alles zur Kontrolle angezeigt.
- **Ergebnis:**
  - Gesamtnote 1–5 mit Punktzahl und Hinweisen, z. B. Unfallverdacht, Spachtel,
    Reifen unter 1,6 mm, kritische Mängel oder abgelaufene HU
  - **Ankaufsrechner:** Verkaufspreis minus Kosten und Gewinn ergibt den maximalen
    Ankaufspreis und ein Einstiegsangebot, wahlweise mit Differenzbesteuerung (§ 25a).
  - Vergleich mit der Preisvorstellung des Verkäufers
- **PDF-Protokoll** mit Skizze, Messwerten, Schäden, Reifen, Checkliste, Kalkulation,
  Unterschrift des Verkäufers und Fotodokumentation, teilbar per Mail, WhatsApp oder Dateien.
- **Backup:** Alle Daten lassen sich als Datei exportieren und wieder importieren.

## Aufs iPhone bringen

Die App muss einmal über eine HTTPS-Adresse erreichbar sein. Danach läuft sie auch offline.

1. Den Ordner hosten (es ist kein Build-Schritt nötig). Möglichkeiten:
   - **GitHub Pages:** Repo öffentlich machen (oder GitHub Pro), dann unter
     *Settings → Pages* den Branch und den Ordner `/` wählen.
   - **Netlify** oder **Cloudflare Pages:** das Repo verbinden (geht auch privat),
     Build-Befehl leer lassen, Ausgabeordner `/`.
2. Die Adresse in **Safari** öffnen, auf **Teilen** tippen, dann **„Zum Home-Bildschirm“**.
3. Einmal in den Einstellungen **„Texterkennung offline bereitstellen“** antippen.

## Entwicklung

- Reines HTML/CSS/JavaScript mit ES-Modulen, ohne Build-Schritt.
- Lokal starten: `python3 -m http.server` und dann `http://localhost:8000` öffnen.
- **Nach Änderungen** in `sw.js` die Konstante `VERSION` erhöhen, sonst bekommt das
  iPhone die neuen Dateien nicht. Die App meldet dann „Neue Version verfügbar“.

| Datei | Inhalt |
| --- | --- |
| `js/data.js` | Fahrzeugtypen, Checkliste, Foto-Positionen, Standardwerte |
| `js/sketch.js` | Fahrzeugskizze je Typ |
| `js/eval.js` | Bewertung, Note, Hinweise, Ankaufsrechner |
| `js/ocr.js` | Texterkennung und Auswertung |
| `js/pdf.js` | PDF-Protokoll |
| `js/views/` | Bildschirme und Tabs |

## Verwendete Bibliotheken (im Ordner `vendor/`)

- [jsPDF](https://github.com/parallax/jsPDF) – MIT-Lizenz
- [Tesseract.js](https://github.com/naptha/tesseract.js) und tesseract.js-core – Apache-2.0
- Deutsche Sprachdaten von Tesseract (`deu`, best_int) – Apache-2.0
