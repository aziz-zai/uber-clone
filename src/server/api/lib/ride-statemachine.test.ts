import { expect, test } from "vitest";
import { assertValidTransition } from "./ride-statemachine";

test("volle gültige Kette REQUESTED → ... → PAID wird akzeptiert", () => {
  const chain = [
    "REQUESTED",
    "ASSIGNED",
    "ACCEPTED",
    "ARRIVED",
    "IN_PROGRESS",
    "COMPLETED",
    "PAID",
  ] as const;

  for (let i = 0; i < chain.length - 1; i++) {
    expect(() => assertValidTransition(chain[i]!, chain[i + 1]!)).not.toThrow();
  }
});

test("CANCELLED ist aus jedem aktiven Status erreichbar", () => {
  for (const from of [
    "REQUESTED",
    "ASSIGNED",
    "ACCEPTED",
    "ARRIVED",
    "IN_PROGRESS",
  ] as const) {
    expect(() => assertValidTransition(from, "CANCELLED")).not.toThrow();
  }
});

test("ungültiger Sprung wird abgelehnt", () => {
  expect(() => assertValidTransition("REQUESTED", "IN_PROGRESS")).toThrow(
    /Ungültiger Statusübergang/,
  );
  expect(() => assertValidTransition("ASSIGNED", "COMPLETED")).toThrow();
});

test("PAID und CANCELLED sind terminal (keine weiteren Übergänge)", () => {
  expect(() => assertValidTransition("PAID", "REQUESTED")).toThrow();
  expect(() => assertValidTransition("CANCELLED", "ASSIGNED")).toThrow();
});
