import { driverRouter } from "~/server/api/routers/driver";
import { orderRouter } from "~/server/api/routers/order";
import { rideRouter } from "~/server/api/routers/ride";
import { vehicleRouter } from "~/server/api/routers/vehicle";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  vehicle: vehicleRouter,
  driver: driverRouter,
  order: orderRouter,
  ride: rideRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
