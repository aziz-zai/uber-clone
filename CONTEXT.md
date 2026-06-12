# CONTEXT.md — Gemeinsame Sprache (Personentransport-Plattform)

Diese Datei definiert das Domänenmodell. Bei neuen Features: **zuerst hier aktualisieren**, dann bauen.

## Zwei Oberflächen

- **Rider-App** — Endkunde bestellt & erlebt die Fahrt.
- **Operator-Portal** — Betreiber verwaltet Flotte, Personal, Fahrten, Aufträge.

## Kern-Entitäten

| Entität | Beschreibung |
|---|---|
| **Operator** | Das Transportunternehmen (Mandant/Tenant). Besitzt Fahrzeuge & beschäftigt Fahrer. |
| **Vehicle** | Fahrzeug der Flotte: Kennzeichen, Typ/Klasse, Sitzplätze, Status (aktiv/Wartung/inaktiv). |
| **Driver** | Mitarbeiter im Fahrdienst: Stammdaten, Führerschein/Lizenz, Status (online/offline/busy), aktuelle Vehicle-Zuordnung. |
| **Rider** | Endkunde, der Fahrten bestellt. |
| **Ride / Trip** | Eine konkrete Fahrt von Origin zu Destination, mit Status-Statemachine. |
| **Order / Auftrag** | Buchung einer Fahrt — sofort (on-demand) oder geplant/vorbestellt. Mündet in eine Ride. |
| **Location** | GPS-Punkt (lat/lng) + Adresse. |
| **Shift** | Schicht eines Drivers (geplant/aktiv/beendet) — fürs Portal (Personalplanung). |

> Hinweis: **Rider** und **Driver** sind unterschiedliche Rollen, kein gemeinsamer „User"-Topf. Auth-Rollen: `rider`, `driver`, `operator_admin`.

## Ride-Statemachine

```
REQUESTED → ASSIGNED → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED → PAID
                  ↘ CANCELLED (durch Rider/Operator/Driver, mit Grund)
```

- **REQUESTED** — Auftrag angelegt, noch kein Fahrer.
- **ASSIGNED** — Dispatch/Matching hat einen Driver zugewiesen.
- **ACCEPTED** — Driver hat angenommen.
- **ARRIVED** — Driver am Pickup.
- **IN_PROGRESS** — Rider an Bord, Fahrt läuft.
- **COMPLETED** — Ziel erreicht.
- **PAID** — Zahlung verbucht.

## Schlüssel-Workflows

### Auftrag → Fahrt (on-demand)
1. Rider bestellt (Origin/Destination) → **Order**, Ride = `REQUESTED`.
2. Matching/Dispatch findet nächsten freien Driver (PostGIS-Umkreissuche) → `ASSIGNED`.
3. Driver nimmt an → `ACCEPTED`, navigiert zum Pickup → `ARRIVED`.
4. Rider steigt ein → `IN_PROGRESS`, Ziel erreicht → `COMPLETED`.
5. Zahlung → `PAID`.

### Operator-Portal (Admin)
- **Flotte:** Vehicles CRUD, Status & Wartung pflegen.
- **Personal:** Drivers CRUD, Lizenzen, Schichten, Vehicle-Zuordnung.
- **Dispatch:** offene Aufträge sehen, manuell/automatisch zuweisen.
- **Tracking:** laufende Fahrten + (später) Live-Position.
- **Auswertung:** Auslastung, Umsatz, abgeschlossene Fahrten.

## Fachbegriffe

| Begriff | Bedeutung |
|---|---|
| **Dispatch / Matching** | Zuweisung eines freien Drivers zu einem Auftrag (Umkreissuche via PostGIS). |
| **ETA** | Estimated Time of Arrival. |
| **Geo-Query** | Räumliche Abfrage (z. B. „Fahrer im 5-km-Umkreis"). |
| **Tenant / Mandant** | Ein Operator; Daten sind pro Operator getrennt. |

## Kommunikationsregeln

- Domain-Begriffe statt Allgemeinplätze: „Rider"/„Driver" statt „User", „Ride" statt „Trip".
- Neue Features: dieses Dokument zuerst erweitern.
- Größere Entscheidungen → ADR unter `docs/adr/`.
