# CONTEXT.md - Shared Language for Uber Clone

## Domain Model

### Core Entities
- **User** → Person using the app (driver or rider)
- **Ride** → Single trip from origin to destination
- **Driver** → User in driver mode, accepts rides
- **Rider** → User requesting rides
- **Location** → GPS point with address
- **Vehicle** → Car assigned to driver

### Key Workflows

#### Ride Request Flow
1. Rider opens app → searches for ride
2. System matches with nearest driver
3. Driver accepts → ride status = `ACCEPTED`
4. Driver arrives at pickup → status = `ARRIVED`
5. Rider gets in → status = `IN_PROGRESS`
6. Destination reached → status = `COMPLETED`
7. Payment processed → status = `PAID`

#### Driver Mode
- Driver comes online → goes into "available" state
- Receives ride requests → can accept/decline
- Navigation to pickup + dropoff
- Earnings tracking

### Technical Jargon

| Term | Definition |
|------|-----------|
| **Materialization** | Converting a data model into actual app state (state machine) |
| **Matching Algorithm** | Service that finds nearest driver for rider request |
| **Geofencing** | Location-based trigger for ride zones |
| **ETA** | Estimated Time of Arrival |
| **Surge Pricing** | Dynamic pricing based on demand |

---

## Architecture Decisions

See `docs/adr/` for detailed decisions on:
- Authentication approach
- Real-time sync strategy
- Payment integration
- etc.

---

## Tech Stack (TBD)

Will be defined in first architecture session.

---

## Communication Rules

- Use domain terms when possible (not "trip" → "ride")
- Avoid vague references ("the user" → be specific: "driver" or "rider")
- When adding new features, update this document first
