"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "./input";

export interface SearchableOption {
  value: string;
  label: string;
  hint?: string; // z.B. "(anderes Fahrzeug)"
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Auswählen …",
  emptyLabel = "— Keine Auswahl —",
  searchPlaceholder = "Suchen …",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none",
          "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30 dark:hover:bg-input/50",
        )}
      >
        <span className={cn("flex-1 truncate text-left", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {/* Search input */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                className="h-7 pl-8 text-sm"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setSearch(""); }
                  if (e.key === "Enter" && filtered.length === 1) select(filtered[0]!.value);
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1">
            {/* Empty option */}
            <OptionRow
              label={emptyLabel}
              hint=""
              selected={value === ""}
              muted
              onClick={() => select("")}
            />

            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Keine Treffer
              </p>
            )}

            {filtered.map((opt) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                hint={opt.hint}
                selected={value === opt.value}
                onClick={() => select(opt.value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  muted,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        "hover:bg-accent hover:text-accent-foreground",
        selected && "bg-accent/50",
        muted && "text-muted-foreground",
      )}
    >
      <span className="flex-1 truncate text-left">{label}</span>
      {hint && <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>}
      {selected && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
}
