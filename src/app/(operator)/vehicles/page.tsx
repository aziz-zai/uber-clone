import { type Metadata } from "next";

import { VehicleManager } from "./vehicle-manager";

export const metadata: Metadata = {
  title: "Flotte — Operator-Portal",
};

export default function VehiclesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Flotte</h1>
        <p className="text-sm text-muted-foreground">
          Fahrzeuge anlegen, bearbeiten und ihren Status pflegen.
        </p>
      </header>
      <VehicleManager />
    </main>
  );
}
