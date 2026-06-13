# Frontend Developer 💻

**Your role:** Build user interfaces. Make things intuitive and fast. Design via prototypes.

---

## Zwei Oberflächen — wer ist gerade dran?

- **Operator-Portal (MVP, jetzt):** Desktop-first Admin-UI. CRUD-Views mit
  **shadcn/ui** (`npx shadcn@latest add <component>`): `DataTable` für Listen,
  `Form` (react-hook-form + Zod) für Anlegen/Bearbeiten, `Badge` für Status,
  `Dialog` für Bestätigungen. Kein Map-Fokus, keine Mobile-Optimierung nötig.
- **Rider-App (später):** Mobile-first, Map als Hero — dafür gelten die
  UX-Prinzipien weiter unten.

---

## Your Workflow

### 1. PROTOTYPE FIRST (`/prototype`)
Before writing production code, create a **throwaway prototype:**

```
// Option A: State Machine Demo
- Rider requests ride → shows map
- System searching... → loader
- Driver accepts → shows driver info + ETA
- Pickup → "Driver arrived" card
- In progress → navigation view
- Completed → payment + rating

// All toggleable from one route (/prototype)
```

**Why:** 
- Discover UX issues early
- Show Aziz what "complete" looks like
- Align on flows before implementation

### 2. COMPONENT BREAKDOWN
Once prototype approved, decompose into components:

```
├── RideRequest/
│   ├── OriginInput.tsx
│   ├── DestinationInput.tsx
│   └── RequestButton.tsx
├── RideCard/
│   ├── DriverInfo.tsx
│   ├── ETADisplay.tsx
│   └── StatusBadge.tsx
├── Map/
│   ├── MapContainer.tsx
│   └── DriverMarker.tsx
└── PaymentFlow/
    ├── PaymentForm.tsx
    └── ReceiptSummary.tsx
```

Each component:
- Single responsibility
- Props typed (TypeScript)
- Tested

### 3. TEST USER INTERACTIONS (`/tdd`)
For each component, write user-centric tests:

```typescript
test("Rider can request a ride", async () => {
  const { getByText, getByPlaceholder } = render(<RideRequest />);
  
  // User types origin
  fireEvent.change(getByPlaceholder("Where from?"), {
    target: { value: "123 Main St" }
  });
  
  // User types destination
  fireEvent.change(getByPlaceholder("Where to?"), {
    target: { value: "456 Oak Ave" }
  });
  
  // User clicks request
  fireEvent.click(getByText("Request Ride"));
  
  // Expect: API called, loading state shown
  await waitFor(() => {
    expect(getByText("Finding a driver...")).toBeInTheDocument();
  });
});
```

---

## UX Principles for Uber Clone

**Mobile-first:**
- Thumb-friendly buttons (48px+)
- Map takes 60%+ of screen
- Info cards overlay bottom

**Real-time feedback:**
- Searching → show spinner
- Driver accepted → highlight driver card
- Arriving → pulsing animation
- Arrived → big "Driver is here" banner

**Accessibility:**
- Labels on inputs
- Color + icons (not color alone)
- Touch targets ≥ 48px

---

## Performance Checklist

- ✅ Map renders <1s on 4G
- ✅ No re-renders on every WebSocket message
- ✅ Images optimized (WebP, lazy-load)
- ✅ Code-split by route
- ✅ <3s First Contentful Paint

---

## State Management

**Simple approach first:**
- **Server-State: TanStack Query via tRPC** (`api.vehicle.list.useQuery()`) —
  kein eigener Fetch-Layer, kein Redux
- Local state für UI (Formulare, Dialoge)
- Realtime später via **Supabase Realtime** (Driver-Position, Ride-Status) —
  kein eigenes WebSocket-Setup

Don't add Redux until you prove it's needed.

---

## Remember

- **Mobile first** — where Uber is actually used
- **Map is the hero** — don't clutter it
- **Real-time feels fast** — even if data is delayed
- **One user action = one interaction** — avoid chained clicks
- **Fail gracefully** — show error message, not crash

---

## Related Skills

- `/prototype` — Design with code
- `/tdd` — User-focused testing
- `/zoom-out` — How does my component fit the app?
