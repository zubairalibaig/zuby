import { z } from "zod";

/**
 * Zod schemas for the jsonb columns. The database stores these as jsonb (flexible,
 * no joins on the hot path); the app is responsible for validating shape on write
 * and parsing on read.
 */

const timeString = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "expected 24-hour HH:MM");

/** A single day: either closed, or open with an optional order cutoff. */
export const dayScheduleSchema = z.union([
  z.object({ closed: z.literal(true) }),
  z.object({
    open: timeString,
    close: timeString,
    /** e.g. "take orders until 21:00 for next-day delivery" */
    order_cutoff: timeString.optional(),
    closed: z.literal(false).optional(),
  }),
]);

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** chefs.timings — weekly schedule plus a vacation switch. */
export const timingsSchema = z.object({
  /** Vacation mode: public page shows "Currently on a break". */
  vacation: z.boolean().default(false),
  days: z.record(z.enum(WEEKDAYS), dayScheduleSchema).default({}),
});

export type Timings = z.infer<typeof timingsSchema>;
export type DaySchedule = z.infer<typeof dayScheduleSchema>;

/** menu_items.nutrition — all fields optional; per serving. */
export const nutritionSchema = z.object({
  calories_kcal: z.number().nonnegative().max(10000).optional(),
  protein_g: z.number().nonnegative().max(1000).optional(),
  carbs_g: z.number().nonnegative().max(1000).optional(),
  fat_g: z.number().nonnegative().max(1000).optional(),
  serving_g: z.number().nonnegative().max(10000).optional(),
});

export type Nutrition = z.infer<typeof nutritionSchema>;

/** Safe parse helpers for reading jsonb out of the database. */
export function parseTimings(value: unknown): Timings | null {
  const result = timingsSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseNutrition(value: unknown): Nutrition | null {
  if (value === null || value === undefined) return null;
  const result = nutritionSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** E.164 — the only phone format stored anywhere (multi-country from day zero). */
export const e164Schema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "expected E.164, e.g. +919900000001");

/** India FSSAI registration number. */
export const fssaiSchema = z.string().regex(/^\d{14}$/, "FSSAI number must be 14 digits");

/** URL slug used in public paths. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and hyphens only");
