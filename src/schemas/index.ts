/**
 * Consolidated Zod Schema Index
 * FASE 2: Standardization Foundation
 * Date: 2026-04-02
 * 
 * Purpose: Central export point for all validation schemas
 * This file re-exports individual schemas and provides utilities
 */

// =====================
// Individual Schema Exports
// =====================

export * from './contrato.schema';
export * from './equipamento.schema';
export * from './material.schema';
export * from './mecanico.schema';
// TODO: Add remaining 24 schemas as they're standardized

// =====================
// Zod Import
// =====================

import { z } from 'zod';

// =====================
// Utility Functions
// =====================

/**
 * Safe parse wrapper with consistent error formatting
 * Returns { success: true, data } or { success: false, errors }
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError['errors'] } {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      errors: result.error.errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          code: 'custom',
          path: [],
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * Parse with error throwing - use in services/server-side
 * Throws ZodError if validation fails
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Format Zod errors for user display
 * Returns object with field-level messages: { fieldName: 'error message' }
 */
export function formatZodErrors(errors: z.ZodError['errors']): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const error of errors) {
    const path = error.path.length > 0 ? String(error.path[0]) : 'root';
    if (!formatted[path]) {
      formatted[path] = error.message;
    }
  }
  
  return formatted;
}

// =====================
// Type Exports (for convenience)
// =====================

/**
 * Extracted types for components that need TypeScript inference
 * Example: const createData: EquipamentoCreate = {...}
 */
export type { ContratoFormData } from './contrato.schema';
export type { EquipamentoFormData } from './equipamento.schema';
export type { MaterialFormData } from './material.schema';
export type { MecanicoFormData } from './mecanico.schema';

// =====================
// Schema References (for advanced usage)
// =====================

export { 
  contratoSchema, 
  contratoCreateSchema, 
  contratoUpdateSchema 
} from './contrato.schema';

export { 
  equipamentoSchema, 
  equipamentoCreateSchema, 
  equipamentoUpdateSchema 
} from './equipamento.schema';

export { 
  materialSchema, 
  materialCreateSchema, 
  materialUpdateSchema 
} from './material.schema';

export { 
  mecanicoSchema, 
  mecanicoCreateSchema, 
  mecanicoUpdateSchema 
} from './mecanico.schema';

// =====================
// Batch Validator (advanced)
// =====================

/**
 * Validate multiple records at once
 * Returns { valid: [], invalid: [{ data, errors }] }
 */
export function validateBatch<T>(
  schema: z.ZodSchema<T>,
  records: unknown[]
): {
  valid: T[];
  invalid: Array<{ data: unknown; message: string }>;
} {
  const valid: T[] = [];
  const invalid: Array<{ data: unknown; message: string }> = [];

  for (const record of records) {
    const parse = safeParse(schema, record);
    if (parse.success) {
      valid.push(parse.data);
    } else {
      invalid.push({
        data: record,
        message: parse.errors.map(e => e.message).join('; '),
      });
    }
  }

  return { valid, invalid };
}
