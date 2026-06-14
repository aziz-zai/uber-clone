import { redirect } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { Car, Users, Activity, ArrowRight } from "lucide-react";
import { createClient } from "~/lib/supabase/server";
import { db } from "~/server/db";

export const metadata: Metadata = { title: "Dashboard — Operator Portal" };

type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
type DriverStatus = "OFFLINE" | "ONLINE" | "BUSY";

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: "Aktiv",
  MAINTENANCE: "Wartung",
  INACTIVE: "Inaktiv",
};
const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ONLINE: "Verfügbar",
  BUSY: "Besetzt",
  OFFLINE: "Offline",
};
const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  ACTIVE: "bg-green-500",
  MAINTENANCE: "bg-amber-500",
  INACTIVE: "bg-red-500",
};
const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  ONLINE: "bg-green-500",
  BUSY: "bg-blue-500",
  OFFLINE: "bg-slate-400",
};

function StatCard({
  icon: Icon,
  title,
  total,
  href,
  breakdown,
  colors,
}: {
  icon: React.ElementType;
  title: string;
  total: number;
  href: string;
  breakdown: { label: string; count: number; color: string }[];
  colors: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex size-9 items-center justify-center rounded-md ${colors}`}>
          <Icon className="size-4 text-white" />
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Alle <ArrowRight className="size-3" />
        </Link>
      </div>
      <p className="text-3xl font-bold tracking-tight">{total}</p>
      <p className="mb-4 text-sm text-muted-foreground">{title}</p>
      <div className="space-y-1.5">
        {breakdown.map(({ label, count, color }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${color}`} />
              <span className="text-muted-foreground">{label}</span>
            </div>
            <span className="font-medium tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UtilizationCard({
  assigned,
  total,
}: {
  assigned: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((assigned / total) * 100);
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-md bg-cyan-500/20">
          <Activity className="size-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">
        {assigned}
        <span className="text-lg font-normal text-muted-foreground">
          /{total}
        </span>
      </p>
      <p className="mb-4 text-sm text-muted-foreground">Fahrzeuge besetzt</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const operatorId = user.app_metadata?.operator_id as string | undefined;
  if (!operatorId) redirect("/login");

  const [vehicleGroups, driverGroups, assignedCount, recentVehicles, recentDrivers] =
    await Promise.all([
      db.vehicle.groupBy({
        by: ["status"],
        where: { operatorId },
        _count: { _all: true },
      }),
      db.driver.groupBy({
        by: ["status"],
        where: { operatorId },
        _count: { _all: true },
      }),
      db.vehicle.count({ where: { operatorId, driver: { isNot: null } } }),
      db.vehicle.findMany({
        where: { operatorId },
        include: { driver: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.driver.findMany({
        where: { operatorId },
        include: { vehicle: { select: { licensePlate: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const vehicleCount = (s: VehicleStatus) =>
    vehicleGroups.find((g) => g.status === s)?._count._all ?? 0;
  const driverCount = (s: DriverStatus) =>
    driverGroups.find((g) => g.status === s)?._count._all ?? 0;
  const totalVehicles = vehicleGroups.reduce((sum, g) => sum + g._count._all, 0);
  const totalDrivers = driverGroups.reduce((sum, g) => sum + g._count._all, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Übersicht deiner Flotte.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Car}
            title="Fahrzeuge gesamt"
            total={totalVehicles}
            href="/vehicles"
            colors="bg-primary/80"
            breakdown={[
              { label: VEHICLE_STATUS_LABELS.ACTIVE, count: vehicleCount("ACTIVE"), color: VEHICLE_STATUS_COLORS.ACTIVE },
              { label: VEHICLE_STATUS_LABELS.MAINTENANCE, count: vehicleCount("MAINTENANCE"), color: VEHICLE_STATUS_COLORS.MAINTENANCE },
              { label: VEHICLE_STATUS_LABELS.INACTIVE, count: vehicleCount("INACTIVE"), color: VEHICLE_STATUS_COLORS.INACTIVE },
            ]}
          />
          <StatCard
            icon={Users}
            title="Fahrer gesamt"
            total={totalDrivers}
            href="/drivers"
            colors="bg-violet-500/80"
            breakdown={[
              { label: DRIVER_STATUS_LABELS.ONLINE, count: driverCount("ONLINE"), color: DRIVER_STATUS_COLORS.ONLINE },
              { label: DRIVER_STATUS_LABELS.BUSY, count: driverCount("BUSY"), color: DRIVER_STATUS_COLORS.BUSY },
              { label: DRIVER_STATUS_LABELS.OFFLINE, count: driverCount("OFFLINE"), color: DRIVER_STATUS_COLORS.OFFLINE },
            ]}
          />
          <UtilizationCard assigned={assignedCount} total={totalVehicles} />
        </div>

        {/* Recent tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent vehicles */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Letzte Fahrzeuge</h2>
              <Link href="/vehicles" className="text-xs text-muted-foreground hover:text-foreground">
                Alle →
              </Link>
            </div>
            {recentVehicles.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Noch keine Fahrzeuge.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentVehicles.map((v) => (
                  <li key={v.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-mono text-sm font-medium">{v.licensePlate}</p>
                      <p className="text-xs text-muted-foreground">{v.vehicleClass}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {v.driver?.name ?? <span className="italic">kein Fahrer</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent drivers */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Letzte Fahrer</h2>
              <Link href="/drivers" className="text-xs text-muted-foreground hover:text-foreground">
                Alle →
              </Link>
            </div>
            {recentDrivers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Noch keine Fahrer.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentDrivers.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {d.licenseNumber}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {d.vehicle?.licensePlate ?? <span className="italic">kein Fahrzeug</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
