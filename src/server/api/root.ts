import { driverRouter } from "~/server/api/routers/driver";
import { vehicleRouter } from "~/server/api/routers/vehicle";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  vehicle: vehicleRouter,
  driver: driverRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
