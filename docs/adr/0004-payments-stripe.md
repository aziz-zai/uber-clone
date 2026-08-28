# ADR 0004 — Zahlungsabwicklung: Stripe Checkout (gehosteter Link)

**Status:** Akzeptiert (2026-08-28)

## Kontext

Die letzte Statemachine-Stufe (`COMPLETED → PAID`, siehe CONTEXT.md) braucht eine
echte Zahlungsabwicklung. Der alte, nie eingecheckte Prototyp
(`docs/legacy-dispatch-prototype-2026-06-14.json`) hatte bereits Stripe-Felder
(`stripePaymentIntentId`, `RiderProfile.stripeCustomerId`) vorgesehen — dieses
ADR macht die Entscheidung diesmal bewusst und dokumentiert.

Es gibt noch keine Rider-App und kein Checkout-UI. Ein Zahlungsfluss mit
gespeicherter Karte („off-session charging") würde einen SetupIntent-Flow zur
Kartenerfassung voraussetzen, den es nicht gibt.

## Entscheidungen

### 1. Provider: Stripe, über Vercel Marketplace

Laut `vercel integration discover --category payments` der einzige/empfohlene
Provider für „Zahlung ohne Katalog" (kein Shopify-artiger Produktkatalog nötig).
Provisioniert über `vercel integration add stripe` — Sandbox-Ressource
(`stripe-amber-mirror`), Test-Mode-Keys automatisch in die Vercel-Env gezogen
(`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
Nur das Server-SDK (`npm install stripe`) wird gebraucht — keine
`@stripe/stripe-js`/`@stripe/react-stripe-js`, da nichts in unserer UI eingebettet
wird (siehe Punkt 2).

### 2. Hosted Checkout Link statt Embedded Checkout

Der offizielle Vercel-Guide (`vercel integration guide stripe --framework nextjs`)
zeigt ein Embedded-Checkout-Muster (`ui_mode: 'embedded'`, `EmbeddedCheckout`-
Komponente) — das setzt voraus, dass der zahlende Rider auf unserer eigenen Seite
sitzt. Passt nicht: bei uns löst der **Dispatcher** im Operator-Portal die
Zahlungsanfrage nach Fahrtende aus, der Rider ist nicht im Browser anwesend.

Stattdessen: `stripe.checkout.sessions.create({ mode: "payment", ... })` ohne
`ui_mode` (= gehostete Stripe-Seite), Rückgabe ist `session.url` — ein Link, den
der Dispatcher kopiert und dem Rider schickt (SMS/WhatsApp/E-Mail, außerhalb der
App). Kein eigenes Kartenformular, kein PCI-Scope bei uns. Ein Webhook
(`checkout.session.completed`) setzt die Ride serverseitig auf `PAID` — der
Dispatcher muss nicht manuell nachfragen/bestätigen.

### 3. Preis: feste Preistabelle statt Berechnung

`src/server/api/lib/pricing.ts` — `BASE_FARE_CENTS` pro `VehicleClass`, grobe
Platzhalterwerte. Kein distanz-/zeitbasiertes Pricing in diesem Slice (bräuchte
eine eigene Tarifgestaltung, die noch nicht entschieden ist). Der Dispatcher sieht
den Vorschlag vorausgefüllt im UI, kann ihn vor dem Erzeugen des Links anpassen.

### 4. Rider-Stripe-Customer: lazy angelegt, auf `Rider` gespeichert

`Rider.stripeCustomerId` (optional) statt einer separaten `RiderProfile`-Tabelle
wie im alten Prototyp — unnötige Extra-Entität für ein einzelnes Feld. Wird beim
ersten `requestPayment`-Aufruf für einen Rider angelegt und wiederverwendet
(getestet: zweiter Aufruf für denselben Rider erzeugt keinen zweiten Customer).

### 5. Webhook: eigene, ungeschützte Route mit Signaturprüfung als Auth

`src/app/api/webhooks/stripe/route.ts` — kein `operatorProcedure`, kein
Nutzer-Kontext: Stripe ruft das server-zu-server auf. Die
Signaturprüfung (`stripe.webhooks.constructEvent` mit `STRIPE_WEBHOOK_SECRET`)
ist die einzige und richtige Authentifizierung hier — nicht zusätzlich über Auth
absichern, das würde den Webhook kaputt machen. Der Statusübergang läuft trotzdem
durch dieselbe zentrale Statemachine-Validierung (`assertValidTransition`) wie
jeder andere Übergang.

Der Webhook-Endpoint wurde direkt über die Stripe-API angelegt (`stripe.webhookEndpoints.create`),
zeigt auf die feste Preview-Branch-Alias-URL
(`https://workspace-git-slice-6-dispatch-azizzais-projects.vercel.app/api/webhooks/stripe`).
Nach dem Merge nach `master` muss ein weiterer Endpoint für die Produktions-URL
angelegt werden (oder der bestehende umgehängt) — als offener Punkt für den
nächsten Merge-Schritt vermerkt.

## Konsequenzen

**Positiv:** Kein eigenes Kartenformular/PCI-Scope; Zahlungsstatus wird
automatisch synchronisiert statt manuell vom Dispatcher gepflegt; Rider-Wiedererkennung
über `stripeCustomerId` spart bei Folgefahrten keine neue Stripe-Customer-Anlage.

**Negativ / Kosten:** Fahrpreis ist manuell/pauschal, nicht real kalkuliert; der
Checkout-Link muss der Dispatcher außerhalb der App an den Rider weiterreichen
(kein automatischer Versand — SMS/E-Mail-Integration wäre ein eigenes Feature);
Webhook-Endpoint ist aktuell an die Preview-Branch-URL gebunden, nicht an Production.

**Bewusst zurückgestellt:** Off-session-Charging mit gespeicherter Karte
(bräuchte SetupIntent + Rider-Checkout-UI), distanzbasiertes Pricing,
automatischer Versand des Zahlungslinks an den Rider.
