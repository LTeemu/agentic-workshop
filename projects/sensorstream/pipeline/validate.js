import { z } from 'zod';
import config from '../config.js';

const sensorTypes = Object.keys(config.sensor.types);
const unitMap = {};
for (const [type, t] of Object.entries(config.sensor.types)) {
  unitMap[type] = t.unit;
}

/**
 * Zod schema for an incoming sensor reading.
 * Rejects: missing fields, wrong types, out-of-range values, invalid units.
 */
const readingSchema = z
  .object({
    id: z.string().uuid(),
    timestamp: z.number().int().positive(),
    type: z.enum(sensorTypes),
    value: z.number().finite(),
    unit: z.string(),
  })
  .strict()
  .refine(
    (data) => {
      const expectedUnit = unitMap[data.type];
      return data.unit === expectedUnit;
    },
    (data) => ({
      message: `Expected unit "${unitMap[data.type]}" for type "${data.type}", got "${data.unit}"`,
    }),
  )
  .refine(
    (data) => {
      const t = config.sensor.types[data.type];
      const extendedMin = t.min - (t.max - t.min) * 0.3;
      const extendedMax = t.max + (t.max - t.min) * 0.5;
      return data.value >= extendedMin && data.value <= extendedMax;
    },
    (data) => ({
      message: `Value ${data.value} outside extended range for ${data.type}`,
    }),
  );

/**
 * Validates a raw sensor reading against the schema.
 *
 * @param {unknown} raw - The raw input to validate.
 * @returns {{ success: true, data: import('zod').SafeParseSuccess['data'] }}
 * @throws {ZodError} if validation fails.
 */
export function validateReading(raw) {
  return readingSchema.parse(raw);
}

/**
 * Safe variant that returns a result object instead of throwing.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, data: object } | { ok: false, errors: Array<{ path: string, message: string }> }}
 */
export function validateReadingSafe(raw) {
  const result = readingSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
