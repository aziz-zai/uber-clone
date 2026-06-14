import { type Metadata } from "next";

import { VehicleManager } from "./vehicle-manager";

export const metadata: Metadata = {
  title: "Flotte — Operator-Portal",
};

export default function VehiclesPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 items-center border-b border-border px-8">
        <div>
          <h1 className="text-sm font-semibold">Fahrzeuge</h1>
          <p className="text-xs text-muted-foreground">Flotte verwalten</p>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-8 py-6">
        <VehicleManager />
      </div>
    </div>
  );
}
