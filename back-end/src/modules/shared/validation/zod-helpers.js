import mongoose from 'mongoose';
import { z } from 'zod';

/**
 * ObjectId string param/body validation.
 */
export const objectIdString = z
  .string()
  .trim()
  .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: 'Invalid id' });

/**
 * Optional ObjectId.
 */
export const optionalObjectIdString = objectIdString.optional();

/**
 * Non-empty trimmed string with max length.
 * @param {number} max
 */
export function shortText(max) {
  return z.string().trim().min(1).max(max);
}

/** Optional schedule date: string | Date, nullable — rejects invalid timestamps. */
export const optionalScheduleDateNullable = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined || val === null) return;
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date' });
    }
  });

/** Patch payload: date fields may be cleared with null. */
export const optionalScheduleDateNullablePatch = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined || val === null) return;
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date' });
    }
  });
