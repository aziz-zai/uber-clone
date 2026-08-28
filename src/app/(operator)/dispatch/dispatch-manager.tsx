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
import { SearchableSelect } from "~/components/ui/searchable-select";
import { BASE_FARE_CENTS } from "~/server/api/lib/pricing";
import { api } from "~/trpc/react";

type VehicleClass = "STANDARD" | "VAN" | "PREMIUM";
type RideStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAID"
  | "CANCELLED";

const STATUS_LABELS: Record<RideStatus, string> = {
  REQUESTED: "Angefragt",
  ASSIGNED: "Zugewiesen",
  ACCEPTED: "Angenommen",
  ARRIVED: "Am Abholort",
  IN_PROGRESS: "Unterwegs",
  COMPLETED: "Abgeschlossen",
  PAID: "Bezahlt",
  CANCELLED: "Storniert",
};

const STATUS_VARIANTS: Record<
  RideStatus,
  "default" | "secondary" | "destructive"
> = {
  REQUESTED: "secondary",
  ASSIGNED: "secondary",
  ACCEPTED: "default",
  ARRIVED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  PAID: "default",
  CANCELLED: "destructive",
};

type ManualStatus = "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";

/** Nächster manueller Statusschritt (Storno immer separat verfügbar). */
const NEXT_STATUS: Partial<Record<RideStatus, ManualStatus>> = {
  ASSIGNED: "ACCEPTED",
  ACCEPTED: "ARRIVED",
  ARRIVED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  STANDARD: "Standard",
  VAN: "Van",
  PREMIUM: "Premium",
};

type OrderFormState = {
  riderName: string;
  riderPhone: string;
  originAddress: string;
  originLat: string;
  originLng: string;
  destinationAddress: string;
  destinationLat: string;
  destinationLng: string;
  vehicleClass: VehicleClass | "";
};

const EMPTY_ORDER_FORM: OrderFormState = {
  riderName: "",
  riderPhone: "",
  originAddress: "",
  originLat: "",
  originLng: "",
  destinationAddress: "",
  destinationLat: "",
  destinationLng: "",
  vehicleClass: "",
};

export function DispatchManager() {
  const utils = api.useUtils();
  const { data: rides, isLoading } = api.order.list.useQuery();
  const { data: drivers } = api.driver.list.useQuery();

  const invalidate = () => {
    void utils.order.list.invalidate();
    void utils.driver.list.invalidate();
  };

  // --- Auftrag erfassen ---
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<OrderFormState>(EMPTY_ORDER_FORM);
  const createOrder = api.order.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(EMPTY_ORDER_FORM);
    },
  });

  function handleCreateSubmit() {
    const originLat = Number(createForm.originLat);
    const originLng = Number(createForm.originLng);
    const destinationLat = Number(createForm.destinationLat);
    const destinationLng = Number(createForm.destinationLng);
    createOrder.mutate({
      riderName: createForm.riderName,
      riderPhone: createForm.riderPhone,
      originAddress: createForm.originAddress,
      originLat,
      originLng,
      destinationAddress: createForm.destinationAddress,
      destinationLat,
      destinationLng,
      ...(createForm.vehicleClass ? { vehicleClass: createForm.vehicleClass } : {}),
    });
  }

  // --- Zuweisen ---
  const [assignRideId, setAssignRideId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const assign = api.order.assign.useMutation({
    onSuccess: () => {
      invalidate();
      setAssignRideId(null);
    },
  });

  const onlineDrivers = (drivers ?? []).filter(
    (d) => d.status === "ONLINE" && d.vehicleId,
  );

  // --- Statusübergang ---
  const updateStatus = api.ride.updateStatus.useMutation({ onSuccess: invalidate });

  // --- Stornieren ---
  const [cancelRideId, setCancelRideId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const cancel = api.ride.updateStatus.useMutation({
    onSuccess: () => {
      invalidate();
      setCancelRideId(null);
      setCancelReason("");
    },
  });

  // --- Zahlung anfordern ---
  const [paymentRideId, setPaymentRideId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const requestPayment = api.ride.requestPayment.useMutation({
    onSuccess: (result) => {
      invalidate();
      setCheckoutUrl(result.checkoutUrl);
    },
  });

  function openPaymentDialog(rideId: string, vehicleClass: VehicleClass | null) {
    setPaymentRideId(rideId);
    setPaymentAmount(
      ((BASE_FARE_CENTS[vehicleClass ?? "STANDARD"]) / 100).toFixed(2),
    );
    setCheckoutUrl(null);
    requestPayment.reset();
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>Auftrag erfassen</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auftrag erfassen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="riderName">Kunde</Label>
                <Input
                  id="riderName"
                  value={createForm.riderName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, riderName: e.target.value })
                  }
                  placeholder="Erika Musterfrau"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="riderPhone">Telefon</Label>
                <Input
                  id="riderPhone"
                  value={createForm.riderPhone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, riderPhone: e.target.value })
                  }
                  placeholder="+49 170 1234567"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="originAddress">Abholort — Adresse</Label>
                <Input
                  id="originAddress"
                  value={createForm.originAddress}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, originAddress: e.target.value })
                  }
                  placeholder="Teststraße 1, Stuttgart"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Breitengrad"
                  value={createForm.originLat}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, originLat: e.target.value })
                  }
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Längengrad"
                  value={createForm.originLng}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, originLng: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destinationAddress">Zielort — Adresse</Label>
                <Input
                  id="destinationAddress"
                  value={createForm.destinationAddress}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      destinationAddress: e.target.value,
                    })
                  }
                  placeholder="Zielstraße 2, Stuttgart"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Breitengrad"
                  value={createForm.destinationLat}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, destinationLat: e.target.value })
                  }
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Längengrad"
                  value={createForm.destinationLng}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, destinationLng: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Fahrzeugklasse (optional)</Label>
                <Select
                  value={createForm.vehicleClass || "ANY"}
                  onValueChange={(v) =>
                    setCreateForm({
                      ...createForm,
                      vehicleClass: v === "ANY" ? "" : (v as VehicleClass),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {createForm.vehicleClass
                        ? VEHICLE_CLASS_LABELS[createForm.vehicleClass]
                        : "Beliebig"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Beliebig</SelectItem>
                    {Object.entries(VEHICLE_CLASS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createOrder.error && (
              <p className="text-sm text-destructive">
                Anlegen fehlgeschlagen — bitte Eingaben prüfen.
              </p>
            )}
            <DialogFooter>
              <Button onClick={handleCreateSubmit} disabled={createOrder.isPending}>
                {createOrder.isPending ? "Speichert…" : "Anlegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fahrer</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Lädt…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rides?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Noch keine Aufträge — erfasse den ersten.
                </TableCell>
              </TableRow>
            )}
            {rides?.map((ride) => {
              const nextStatus = NEXT_STATUS[ride.status as RideStatus];
              return (
                <TableRow key={ride.id}>
                  <TableCell className="font-medium">
                    {ride.order.rider.name}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                    {ride.order.originAddress} → {ride.order.destinationAddress}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[ride.status as RideStatus]}>
                      {STATUS_LABELS[ride.status as RideStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ride.driver ? (
                      ride.driver.name
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="flex flex-wrap items-center justify-end gap-2">
                    {ride.status === "REQUESTED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => assign.mutate({ rideId: ride.id })}
                          disabled={assign.isPending}
                        >
                          Automatisch zuweisen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignRideId(ride.id);
                            setSelectedDriverId("");
                            assign.reset();
                          }}
                        >
                          Manuell
                        </Button>
                      </>
                    )}
                    {nextStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ id: ride.id, status: nextStatus })
                        }
                        disabled={updateStatus.isPending}
                      >
                        {STATUS_LABELS[nextStatus]}
                      </Button>
                    )}
                    {ride.status === "COMPLETED" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          openPaymentDialog(ride.id, ride.order.vehicleClass)
                        }
                      >
                        Zahlung anfordern
                      </Button>
                    )}
                    {ride.status !== "CANCELLED" &&
                      ride.status !== "COMPLETED" &&
                      ride.status !== "PAID" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCancelRideId(ride.id);
                            setCancelReason("");
                            cancel.reset();
                          }}
                        >
                          Stornieren
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Manuell zuweisen */}
      <Dialog
        open={assignRideId !== null}
        onOpenChange={(open) => !open && setAssignRideId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fahrer manuell zuweisen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Fahrer</Label>
            <SearchableSelect
              value={selectedDriverId}
              onChange={setSelectedDriverId}
              placeholder="Fahrer wählen"
              emptyLabel="— Keine Auswahl —"
              searchPlaceholder="Name suchen …"
              options={onlineDrivers.map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>
          {assign.error && (
            <p className="text-sm text-destructive">Zuweisung fehlgeschlagen.</p>
          )}
          <DialogFooter>
            <Button
              onClick={() =>
                assignRideId &&
                selectedDriverId &&
                assign.mutate({ rideId: assignRideId, driverId: selectedDriverId })
              }
              disabled={assign.isPending || !selectedDriverId}
            >
              {assign.isPending ? "Speichert…" : "Zuweisen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stornieren */}
      <Dialog
        open={cancelRideId !== null}
        onOpenChange={(open) => !open && setCancelRideId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fahrt stornieren</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="cancelReason">Grund</Label>
            <Input
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Rider nicht erreichbar"
            />
          </div>
          {cancel.error && (
            <p className="text-sm text-destructive">Stornieren fehlgeschlagen.</p>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() =>
                cancelRideId &&
                cancel.mutate({
                  id: cancelRideId,
                  status: "CANCELLED",
                  cancelReason,
                  cancelledByRole: "OPERATOR",
                })
              }
              disabled={cancel.isPending || cancelReason.trim() === ""}
            >
              {cancel.isPending ? "Speichert…" : "Stornieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zahlung anfordern */}
      <Dialog
        open={paymentRideId !== null}
        onOpenChange={(open) => !open && setPaymentRideId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zahlung anfordern</DialogTitle>
          </DialogHeader>
          {checkoutUrl ? (
            <div className="grid gap-2">
              <Label>Checkout-Link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={checkoutUrl} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void navigator.clipboard.writeText(checkoutUrl)}
                >
                  Kopieren
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link an den Kunden schicken — nach Zahlung wird die Fahrt
                automatisch als bezahlt markiert.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="paymentAmount">Betrag (EUR)</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
          )}
          {requestPayment.error && (
            <p className="text-sm text-destructive">
              Zahlungsanfrage fehlgeschlagen.
            </p>
          )}
          <DialogFooter>
            {checkoutUrl ? (
              <Button onClick={() => setPaymentRideId(null)}>Fertig</Button>
            ) : (
              <Button
                onClick={() =>
                  paymentRideId &&
                  requestPayment.mutate({
                    id: paymentRideId,
                    amountInCents: Math.round(Number(paymentAmount) * 100),
                  })
                }
                disabled={requestPayment.isPending || !paymentAmount}
              >
                {requestPayment.isPending ? "Erstellt…" : "Link erstellen"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
