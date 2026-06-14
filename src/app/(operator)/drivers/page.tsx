import { type Metadata } from "next";

import { DriverManager } from "./driver-manager";

export const metadata: Metadata = {
  title: "Fahrer — Operator-Portal",
};

export default function DriversPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 items-center border-b border-border px-8">
        <div>
          <h1 className="text-sm font-semibold">Fahrer</h1>
          <p className="text-xs text-muted-foreground">Personal verwalten</p>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-8 py-6">
        <DriverManager />
      </div>
    </div>
  );
}
