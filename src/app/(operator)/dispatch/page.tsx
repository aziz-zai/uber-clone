import { type Metadata } from "next";

import { DispatchManager } from "./dispatch-manager";

export const metadata: Metadata = {
  title: "Dispatch — Operator-Portal",
};

export default function DispatchPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-14 items-center border-b border-border px-8">
        <div>
          <h1 className="text-sm font-semibold">Dispatch</h1>
          <p className="text-xs text-muted-foreground">
            Aufträge erfassen, Fahrer zuweisen, Fahrten verfolgen
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-8 py-6">
        <DispatchManager />
      </div>
    </div>
  );
}
