# CONTEXT.md — Gemeinsame Sprache (Personentransport-Plattform)

Diese Datei definiert das Domänenmodell. Bei neuen Features: **zuerst hier aktualisieren**, dann bauen.

## Drei Oberflächen

- **Rider-App** — Endkunde bestellt, bezahlt & trackt die Fahrt.
- **Driver-App** — Fahrer sieht seine Fahrten-Übersicht, nimmt Buchungen an/ab, navigiert, sieht Verdienst.
- **Operator-Portal** — Betreiber (Unternehmer) verwaltet Flotte, Personal, Fahrten, Aufträge — inkl. eigener Subunternehmen/Teams (siehe unten).

> MVP-Reihenfolge bleibt: Operator-Portal zuerst, danach Rider-App, danach Driver-App (siehe CLAUDE.md).

## Kern-Entitäten

| Entität | Beschreibung |
|---|---|
| **Operator** | Das Transportunternehmen (Mandant/Tenant). Besitzt Fahrzeuge & beschäftigt Fahrer. Kann intern in **Teams** gegliedert sein. |
| **Team / Sub-Operator** | Optionale Untergliederung eines Operators (z. B. Subunternehmen, Standort, Fuhrpark-Gruppe). Fahrzeuge & Fahrer gehören zum Operator und optional zu einem Team; der Operator-Admin sieht alle Teams, ein Team-Lead nur sein Team. Kein eigenständiger Tenant — RLS bleibt auf `operator_id`-Ebene (ADR 0001), Team ist ein Filter/Scope *innerhalb* eines Tenants. |
| **Vehicle** | Fahrzeug der Flotte: Kennzeichen, Typ/Klasse, Sitzplätze, Status (aktiv/Wartung/inaktiv), optional einem Team zugeordnet. |
| **Driver** | Mitarbeiter im Fahrdienst: Stammdaten, Führerschein/Lizenz, Status (online/offline/busy), aktuelle Vehicle-Zuordnung, optional einem Team zugeordnet. Nutzt die Driver-App. |
| **Rider** | Endkunde, der Fahrten bestellt. Nutzt die Rider-App. |
| **Ride / Trip** | Eine konkrete Fahrt von Origin zu Destination, mit Status-Statemachine. |
| **Order / Auftrag** | Buchung einer Fahrt — sofort (on-demand) oder geplant/vorbestellt. Mündet in eine Ride. |
| **Location** | GPS-Punkt (lat/lng) + Adresse. |
| **Shift** | Schicht eines Drivers (geplant/aktiv/beendet) — fürs Portal (Personalplanung). |

> Hinweis: **Rider** und **Driver** sind unterschiedliche Rollen, kein gemeinsamer „User"-Topf. Auth-Rollen: `rider`, `driver`, `operator_admin` (perspektivisch `team_lead`). „Team" ist bewusst **keine** zweite Tenant-Ebene — es ändert nichts an ADR 0001, sondern gruppiert Vehicles/Drivers *innerhalb* eines Operators. Eine echte verschachtelte Mandantenschaft (Sub-Tenant mit eigenem Billing/eigener Isolation) ist explizit **nicht** MVP-Scope und müsste, falls später gebraucht, eine eigene ADR bekommen.

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
- **Teams/Subunternehmen:** Fahrzeuge & Fahrer optional Teams zuordnen, Auswertung pro Team.
- **Dispatch:** offene Aufträge sehen, manuell/automatisch zuweisen.
- **Tracking:** laufende Fahrten + (später) Live-Position.
- **Auswertung:** Auslastung, Umsatz, abgeschlossene Fahrten — gesamt und pro Team.

### Driver-App (Fahrer)
- **Fahrten-Übersicht:** zugewiesene & vergangene Fahrten sehen.
- **Buchung annehmen/ablehnen:** eingehende Order sehen, Status setzen (`ACCEPTED` → `ARRIVED` → `IN_PROGRESS` → `COMPLETED`).
- **Status:** online/offline/busy selbst steuern.
- **(später)** Navigation, Verdienstübersicht, Schichtplanung einsehen.

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
