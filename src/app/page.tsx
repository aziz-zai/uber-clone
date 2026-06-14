import Link from "next/link";
import { Car, Users, MapPin } from "lucide-react";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const FEATURES = [
  {
    icon: Car,
    title: "Fahrzeugverwaltung",
    desc: "Flottenstatus, Klassen und Verfügbarkeit — immer im Überblick.",
  },
  {
    icon: Users,
    title: "Fahrerverwaltung",
    desc: "Lizenzen, Status und Einsatzplanung für Ihr gesamtes Team.",
  },
  {
    icon: MapPin,
    title: "Dispatch & Fahrten",
    desc: "Aufträge intelligent zuweisen und Fahrten live verfolgen.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="flex h-16 items-center border-b border-border px-6 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <span className="text-[11px] font-bold text-primary-foreground">
              OP
            </span>
          </div>
          <span className="font-semibold tracking-tight">Operator Portal</span>
        </div>
        <nav className="ml-auto flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Anmelden
          </Link>
          <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
            Registrieren
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Operator Portal · Beta
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Transport-Management
            <br className="hidden sm:block" />
            für Ihre Flotte
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground">
            Verwalten Sie Fahrzeuge, Fahrer und Fahrten zentral —
            Echtzeit-Dispatch, Auslastung und Abrechnung in einem Portal.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              Kostenlos starten
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Bereits Kunde
            </Link>
          </div>
        </div>
      </main>

      {/* Feature cards */}
      <section className="border-t border-border px-6 py-16 md:px-10">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © 2026 Operator Portal · Alle Rechte vorbehalten
      </footer>
    </div>
  );
}
