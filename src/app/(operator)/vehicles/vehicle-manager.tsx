"use client";

import { useState } from "react";

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

type VehicleClass = "STANDARD" | "VAN" | "PREMIUM";
type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";

const CLASS_LABELS: Record<VehicleClass, string> = {
  STANDARD: "Standard",
  VAN: "Van",
  PREMIUM: "Premium",
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: "Aktiv",
  MAINTENANCE: "Wartung",
  INACTIVE: "Inaktiv",
};

const STATUS_VARIANTS: Record<
  VehicleStatus,
  "default" | "secondary" | "destructive"
> = {
  ACTIVE: "default",
  MAINTENANCE: "secondary",
  INACTIVE: "destructive",
};

type FormState = {
  licensePlate: string;
  vehicleClass: VehicleClass;
  seats: number;
};

const EMPTY_FORM: FormState = {
  licensePlate: "",
  vehicleClass: "STANDARD",
  seats: 4,
};

function VehicleFormFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (form: FormState) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="licensePlate">Kennzeichen</Label>
        <Input
          id="licensePlate"
          value={form.licensePlate}
          onChange={(e) => onChange({ ...form, licensePlate: e.target.value })}
          placeholder="B-XY 1234"
        />
      </div>
      <div className="grid gap-2">
        <Label>Klasse</Label>
        <Select
          value={form.vehicleClass}
          onValueChange={(value) =>
            onChange({ ...form, vehicleClass: value as VehicleClass })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>{CLASS_LABELS[form.vehicleClass]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CLASS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="seats">Sitzplätze</Label>
        <Input
          id="seats"
          type="number"
          min={1}
          max={50}
          value={form.seats}
          onChange={(e) => onChange({ ...form, seats: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

export function VehicleManager() {
  const utils = api.useUtils();
  const { data: vehicles, isLoading } = api.vehicle.list.useQuery();
  const { data: drivers } = api.driver.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  // Fahrer-Zuweisung vom Fahrzeug aus
  const [assignVehicle, setAssignVehicle] = useState<{
    id: string;
    licensePlate: string;
    driverId: string | null;
  } | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const invalidate = () => {
    void utils.vehicle.list.invalidate();
    void utils.driver.list.invalidate();
  };

  const create = api.vehicle.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    },
  });

  const update = api.vehicle.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditId(null);
    },
  });

  const setStatus = api.vehicle.setStatus.useMutation({ onSuccess: invalidate });

  const assign = api.driver.assign.useMutation({
    onSuccess: () => {
      invalidate();
      setAssignVehicle(null);
    },
  });

  const unassign = api.driver.unassign.useMutation({
    onSuccess: () => {
      invalidate();
      setAssignVehicle(null);
    },
  });

  function openDriverDialog(vehicle: {
    id: string;
    licensePlate: string;
    driver: { id: string; name: string } | null;
  }) {
    setAssignVehicle({
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      driverId: vehicle.driver?.id ?? null,
    });
    setSelectedDriverId(vehicle.driver?.id ?? "");
    assign.reset();
    unassign.reset();
  }

  function handleDriverSubmit() {
    if (!assignVehicle) return;
    if (selectedDriverId) {
      assign.mutate({ driverId: selectedDriverId, vehicleId: assignVehicle.id });
    } else if (assignVehicle.driverId) {
      unassign.mutate({ driverId: assignVehicle.driverId });
    } else {
      setAssignVehicle(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>Neues Fahrzeug</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fahrzeug anlegen</DialogTitle>
            </DialogHeader>
            <VehicleFormFields form={createForm} onChange={setCreateForm} />
            {create.error && (
              <p className="text-sm text-destructive">
                Anlegen fehlgeschlagen — bitte Eingaben prüfen.
              </p>
            )}
            <DialogFooter>
              <Button
                onClick={() => create.mutate(createForm)}
                disabled={create.isPending}
              >
                {create.isPending ? "Speichert…" : "Anlegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kennzeichen</TableHead>
              <TableHead>Klasse</TableHead>
              <TableHead>Sitzplätze</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fahrer</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {vehicles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Noch keine Fahrzeuge — lege das erste an.
                </TableCell>
              </TableRow>
            )}
            {vehicles?.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">
                  {vehicle.licensePlate}
                </TableCell>
                <TableCell>{CLASS_LABELS[vehicle.vehicleClass]}</TableCell>
                <TableCell>{vehicle.seats}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[vehicle.status]}>
                    {STATUS_LABELS[vehicle.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {vehicle.driver ? (
                    vehicle.driver.name
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="flex items-center justify-end gap-2">
                  <Select
                    value={vehicle.status}
                    onValueChange={(value) =>
                      setStatus.mutate({
                        id: vehicle.id,
                        status: value as VehicleStatus,
                      })
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>{STATUS_LABELS[vehicle.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDriverDialog(vehicle)}
                  >
                    Fahrer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditId(vehicle.id);
                      setEditForm({
                        licensePlate: vehicle.licensePlate,
                        vehicleClass: vehicle.vehicleClass,
                        seats: vehicle.seats,
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

      {/* Fahrzeug bearbeiten */}
      <Dialog
        open={editId !== null}
        onOpenChange={(open) => !open && setEditId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fahrzeug bearbeiten</DialogTitle>
          </DialogHeader>
          <VehicleFormFields form={editForm} onChange={setEditForm} />
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

      {/* Fahrer zuweisen vom Fahrzeug aus */}
      <Dialog
        open={assignVehicle !== null}
        onOpenChange={(open) => !open && setAssignVehicle(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Fahrer — {assignVehicle?.licensePlate}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Fahrer</Label>
            <Select
              value={selectedDriverId}
              onValueChange={(v) => setSelectedDriverId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kein Fahrer zugewiesen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Kein Fahrer —</SelectItem>
                {drivers?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    {d.vehicleId &&
                    d.vehicleId !== assignVehicle?.id
                      ? ` (${d.vehicle?.licensePlate ?? "anderes Fahrzeug"})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {drivers?.find(
              (d) =>
                d.id === selectedDriverId &&
                d.vehicleId &&
                d.vehicleId !== assignVehicle?.id,
            ) && (
              <p className="text-xs text-muted-foreground">
                Bisherige Fahrzeugzuweisung des Fahrers wird aufgehoben.
              </p>
            )}
          </div>
          {(assign.error ?? unassign.error) && (
            <p className="text-sm text-destructive">
              Zuweisung fehlgeschlagen.
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={handleDriverSubmit}
              disabled={assign.isPending || unassign.isPending}
            >
              {assign.isPending || unassign.isPending
                ? "Speichert…"
                : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
