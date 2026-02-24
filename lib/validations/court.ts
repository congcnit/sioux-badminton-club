import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^https?:\/\/.+/i.test(value),
    "Location link must be a valid http/https URL.",
  );

export const createCourtSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  locationLink: optionalUrl,
  notes: z.string().trim().max(500, "Notes is too long.").optional(),
});

export const updateCourtSchema = createCourtSchema.extend({
  courtId: z.string().min(1, "Court id is required."),
});

export const deleteCourtSchema = z.object({
  courtId: z.string().min(1, "Court id is required."),
});
