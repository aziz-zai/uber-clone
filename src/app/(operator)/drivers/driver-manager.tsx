"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { SearchableSelect } from "~/components/ui/searchable-select";

type LicenseClass = "B" | "BE" | "C" | "CE";
type DriverStatus = "OFFLINE" | "ONLINE" | "BUSY";

const LICENSE_LABELS: Record<LicenseClass, string> = {
  B: "B — PKW",
  BE: "BE — PKW + Anhänger",
  C: "C — LKW",
  CE: "CE — LKW + Anhänger",
};

const STATUS_LABELS: Record<DriverStatus, string> = {
  OFFLINE: "Offline",
  ONLINE: "Verfügbar",
  BUSY: "Besetzt",
};

const STATUS_VARIANTS: Record<
  DriverStatus,
  "default" | "secondary" | "destructive"
> = {
  ONLINE: "default",
  BUSY: "secondary",
  OFFLINE: "destructive",
};

type FormState = {
  name: string;
  licenseNumber: string;
  licenseClass: LicenseClass;
};

const EMPTY_FORM: FormState = { name: "", licenseNumber: "", licenseClass: "B" };

function DriverFormFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (form: FormState) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Max Müller"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="licenseNumber">Führerscheinnummer</Label>
        <Input
          id="licenseNumber"
          value={form.licenseNumber}
          onChange={(e) => onChange({ ...form, licenseNumber: e.target.value })}
          placeholder="B123456789"
        />
      </div>
      <div className="grid gap-2">
        <Label>Führerscheinklasse</Label>
        <Select
          value={form.licenseClass}
          onValueChange={(value) =>
            onChange({ ...form, licenseClass: value as LicenseClass })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>{LICENSE_LABELS[form.licenseClass]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LICENSE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function DriverManager() {
  const utils = api.useUtils();
  const { data: drivers, isLoading } = api.driver.list.useQuery();
  const { data: vehicles } = api.vehicle.list.useQuery();

  // --- Filter state ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "ALL">("ALL");
  const [licenseFilter, setLicenseFilter] = useState<LicenseClass | "ALL">("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState<
    "ALL" | "ASSIGNED" | "UNASSIGNED"
  >("ALL");

  const isFiltered =
    search !== "" ||
    statusFilter !== "ALL" ||
    licenseFilter !== "ALL" ||
    assignmentFilter !== "ALL";

  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setLicenseFilter("ALL");
    setAssignmentFilter("ALL");
  }

  const filtered = useMemo(() => {
    if (!drivers) return [];
    const q = search.toLowerCase();
    return drivers.filter((d) => {
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.licenseNumber.toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (licenseFilter !== "ALL" && d.licenseClass !== licenseFilter)
        return false;
      if (assignmentFilter === "ASSIGNED" && !d.vehicleId) return false;
      if (assignmentFilter === "UNASSIGNED" && d.vehicleId) return false;
      return true;
    });
  }, [drivers, search, statusFilter, licenseFilter, assignmentFilter]);

  // --- Dialog / mutation state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [assignDriver, setAssignDriver] = useState<{
    id: string;
    name: string;
    vehicleId: string | null;
  } | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  const invalidate = () => {
    void utils.driver.list.invalidate();
    void utils.vehicle.list.invalidate();
  };

  const create = api.driver.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    },
  });
  const update = api.driver.update.useMutation({
    onSuccess: () => { invalidate(); setEditId(null); },
  });
  const setStatus = api.driver.setStatus.useMutation({ onSuccess: invalidate });
  const assign = api.driver.assign.useMutation({
    onSuccess: () => { invalidate(); setAssignDriver(null); },
  });
  const unassign = api.driver.unassign.useMutation({
    onSuccess: () => { invalidate(); setAssignDriver(null); },
  });

  function openAssignDialog(driver: {
    id: string;
    name: string;
    vehicleId: string | null;
  }) {
    setAssignDriver(driver);
    setSelectedVehicleId(driver.vehicleId ?? "");
    assign.reset();
    unassign.reset();
  }

  function handleAssignSubmit() {
    if (!assignDriver) return;
    if (selectedVehicleId) {
      assign.mutate({ driverId: assignDriver.id, vehicleId: selectedVehicleId });
    } else {
      unassign.mutate({ driverId: assignDriver.id });
    }
  }

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Name oder Führerschein-Nr. …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v ?? "ALL") as typeof statusFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue>
              {statusFilter === "ALL" ? "Alle Status" : STATUS_LABELS[statusFilter]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Führerschein */}
        <Select
          value={licenseFilter}
          onValueChange={(v) => setLicenseFilter((v ?? "ALL") as typeof licenseFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue>
              {licenseFilter === "ALL" ? "Alle Klassen" : licenseFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Klassen</SelectItem>
            {Object.keys(LICENSE_LABELS).map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Zuweisung */}
        <Select
          value={assignmentFilter}
          onValueChange={(v) =>
            setAssignmentFilter((v ?? "ALL") as typeof assignmentFilter)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {assignmentFilter === "ALL"
                ? "Alle Zuweisungen"
                : assignmentFilter === "ASSIGNED"
                ? "Mit Fahrzeug"
                : "Ohne Fahrzeug"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Zuweisungen</SelectItem>
            <SelectItem value="ASSIGNED">Mit Fahrzeug</SelectItem>
            <SelectItem value="UNASSIGNED">Ohne Fahrzeug</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset */}
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-3.5" />
            Zurücksetzen
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {drivers && (
            <span className="text-xs text-muted-foreground">
              {filtered.length} von {drivers.length}
            </span>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>Neuer Fahrer</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Fahrer anlegen</DialogTitle></DialogHeader>
              <DriverFormFields form={createForm} onChange={setCreateForm} />
              {create.error && (
                <p className="text-sm text-destructive">
                  Anlegen fehlgeschlagen — bitte Eingaben prüfen.
                </p>
              )}
              <DialogFooter>
                <Button onClick={() => create.mutate(createForm)} disabled={create.isPending}>
                  {create.isPending ? "Speichert…" : "Anlegen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Führerschein-Nr.</TableHead>
              <TableHead>Klasse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fahrzeug</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">Lädt…</TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {isFiltered
                    ? "Keine Fahrer entsprechen den Filtern."
                    : "Noch keine Fahrer — lege den ersten an."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell className="font-mono text-sm">{driver.licenseNumber}</TableCell>
                <TableCell>{driver.licenseClass}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[driver.status]}>
                    {STATUS_LABELS[driver.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {driver.vehicle ? (
                    <span className="font-mono">{driver.vehicle.licensePlate}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Select
                    value={driver.status}
                    onValueChange={(value) =>
                      setStatus.mutate({ id: driver.id, status: value as DriverStatus })
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>{STATUS_LABELS[driver.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => openAssignDialog(driver)}>
                    Fahrzeug
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditId(driver.id);
                      setEditForm({
                        name: driver.name,
                        licenseNumber: driver.licenseNumber,
                        licenseClass: driver.licenseClass,
                      });
                    }}
                  >
                    Bearbeiten
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fahrer bearbeiten</DialogTitle></DialogHeader>
          <DriverFormFields form={editForm} onChange={setEditForm} />
          {update.error && (
            <p className="text-sm text-destructive">
              Speichern fehlgeschlagen — bitte Eingaben prüfen.
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => editId && update.mutate({ id: editId, ...editForm })}
              disabled={update.isPending}
            >
              {update.isPending ? "Speichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Vehicle Dialog */}
      <Dialog
        open={assignDriver !== null}
        onOpenChange={(open) => !open && setAssignDriver(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fahrzeug zuweisen — {assignDriver?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Fahrzeug</Label>
            <SearchableSelect
              value={selectedVehicleId}
              onChange={setSelectedVehicleId}
              placeholder="Kein Fahrzeug zugewiesen"
              emptyLabel="— Keine Zuweisung —"
              searchPlaceholder="Kennzeichen suchen …"
              options={
                vehicles?.map((v) => ({
                  value: v.id,
                  label: v.licensePlate,
                  hint:
                    v.driver && v.driver.id !== assignDriver?.id
                      ? v.driver.name
                      : undefined,
                })) ?? []
              }
            />
            {vehicles?.find(
              (v) =>
                v.id === selectedVehicleId &&
                v.driver &&
                v.driver.id !== assignDriver?.id,
            ) && (
              <p className="text-xs text-muted-foreground">
                Bisherige Zuweisung wird automatisch aufgehoben.
              </p>
            )}
          </div>
          {(assign.error ?? unassign.error) && (
            <p className="text-sm text-destructive">Zuweisung fehlgeschlagen.</p>
          )}
          <DialogFooter>
            <Button
              onClick={handleAssignSubmit}
              disabled={assign.isPending || unassign.isPending}
            >
              {assign.isPending || unassign.isPending ? "Speichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
