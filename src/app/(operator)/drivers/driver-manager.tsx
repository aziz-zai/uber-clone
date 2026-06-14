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

const STATUS_VARIANTS: Record<DriverStatus, "default" | "secondary" | "destructive"> = {
  ONLINE: "default",
  BUSY: "secondary",
  OFFLINE: "destructive",
};

type FormState = {
  name: string;
  licenseNumber: string;
  licenseClass: LicenseClass;
};

const EMPTY_FORM: FormState = {
  name: "",
  licenseNumber: "",
  licenseClass: "B",
};

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
          onValueChange={(value) => onChange({ ...form, licenseClass: value as LicenseClass })}
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

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const invalidate = () => utils.driver.list.invalidate();

  const create = api.driver.create.useMutation({
    onSuccess: async () => {
      await invalidate();
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    },
  });

  const update = api.driver.update.useMutation({
    onSuccess: async () => {
      await invalidate();
      setEditId(null);
    },
  });

  const setStatus = api.driver.setStatus.useMutation({ onSuccess: invalidate });

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>Neuer Fahrer</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fahrer anlegen</DialogTitle>
            </DialogHeader>
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Führerschein-Nr.</TableHead>
              <TableHead>Klasse</TableHead>
              <TableHead>Status</TableHead>
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
            {drivers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Noch keine Fahrer — lege den ersten an.
                </TableCell>
              </TableRow>
            )}
            {drivers?.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell className="font-mono text-sm">{driver.licenseNumber}</TableCell>
                <TableCell>{driver.licenseClass}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[driver.status]}>
                    {STATUS_LABELS[driver.status]}
                  </Badge>
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
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      <Dialog open={editId !== null} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fahrer bearbeiten</DialogTitle>
          </DialogHeader>
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
    </div>
  );
}
