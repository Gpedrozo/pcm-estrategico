import { describe, it, expect } from 'vitest';
import { 
  equipamentoSchema,
  equipamentoBaseSchema,
  type EquipamentoFormData
} from '@/schemas/equipamento.schema';

/**
 * FASE 2 Test Pattern â€” Equipamentos Module
 * Purpose: Validate Zod schema across CRUD lifecycle
 * Template: Replicate across all 28 modules with minimal changes
 * 
 * Test Categories (12+ per module):
 * 1-3. Valid creation scenarios (basic, with optionals, with relationships)
 * 4-7. Invalid creation (missing required, invalid type, invalid enum, invalid length)
 * 8-10. Valid updates (single field, multiple fields, cascade effects)
 * 11-12. Invalid updates + edge cases
 */

describe('EquipamentoSchema - FASE 2 Validation Suite', () => {
  
  // =====================
  // TEST DATA
  // =====================
  
  const validEquipamentoCreate: EquipamentoFormData = {
    tag: 'COMP-001',
    nome: 'Moto Compressor XYZ',
    criticidade: 'A',
    nivel_risco: 'ALTO',
    localizacao: 'Garagem - Prateleira 1',
    fabricante: 'Electrolux',
    modelo: 'X2000',
    numero_serie: 'SN12345',
    data_instalacao: '2025-01-15',
    sistema_id: undefined,
    ativo: true,
  };

  // =====================
  // GROUP 1: Valid Creation Scenarios (3 tests)
  // =====================

  describe('CREATE - Valid Scenarios', () => {
    it('should parse valid equipamento with all required fields', () => {
      const result = equipamentoSchema.safeParse(validEquipamentoCreate);
      expect(result.success).toBe(true);
      expect(result.data?.nome).toBe('Moto Compressor XYZ');
      expect(result.data?.tag).toBe('COMP-001');
    });

    it('should parse valid equipamento with optional fields', () => {
      const data = { 
        ...validEquipamentoCreate, 
        fabricante: undefined,
        modelo: undefined 
      };
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.nome).toBe('Moto Compressor XYZ');
    });

    it('should parse with different valid criticidade values', () => {
      const criticidades = ['A', 'B', 'C'] as const;
      criticidades.forEach(criticidade => {
        const data = { ...validEquipamentoCreate, criticidade };
        const result = equipamentoSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data?.criticidade).toBe(criticidade);
      });
    });
  });

  // =====================
  // GROUP 2: Invalid Creation Scenarios (4 tests)
  // =====================

  describe('CREATE - Invalid Scenarios', () => {
    it('should reject missing required tag field', () => {
      const data = { ...validEquipamentoCreate };
      delete (data as any).tag;
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject tag with insufficient length', () => {
      const data = { ...validEquipamentoCreate, tag: 'C' }; // Min 2 chars
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject nome with insufficient length', () => {
      const data = { ...validEquipamentoCreate, nome: 'AB' }; // Min 3 chars
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid criticidade enum value', () => {
      const data = { ...validEquipamentoCreate, criticidade: 'X' as any };
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // =====================
  // GROUP 3: Valid Update Scenarios (3 tests)
  // =====================

  describe('UPDATE - Valid Scenarios', () => {
    it('should parse partial update with single field', () => {
      const data: Partial<EquipamentoFormData> = { nome: 'New Name' };
      const result = equipamentoBaseSchema.partial().safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.nome).toBe('New Name');
    });

    it('should parse partial update with multiple fields', () => {
      const data: Partial<EquipamentoFormData> = {
        nome: 'Updated Name',
        criticidade: 'B',
        nivel_risco: 'MEDIO',
      };
      const result = equipamentoBaseSchema.partial().safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.criticidade).toBe('B');
    });

    it('should parse empty update object (no-op update)', () => {
      const data: Partial<EquipamentoFormData> = {};
      const result = equipamentoBaseSchema.partial().safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  // =====================
  // GROUP 4: Invalid Update Scenarios (2 tests)
  // =====================

  describe('UPDATE - Invalid Scenarios', () => {
    it('should reject update with invalid nivel_risco', () => {
      const data: Partial<EquipamentoFormData> = { nivel_risco: 'CRITICO' as any };
      const result = equipamentoBaseSchema.partial().safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject update with nome too short', () => {
      const data: Partial<EquipamentoFormData> = { nome: 'AB' }; // Min 3 chars
      const result = equipamentoBaseSchema.partial().safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // =====================
  // GROUP 5: Edge Cases (2 tests)
  // =====================

  describe('Edge Cases', () => {
    it('should apply default criticidade when not provided', () => {
      const data = { ...validEquipamentoCreate };
      delete (data as any).criticidade;
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.criticidade).toBe('C'); // Default value
    });

    it('should apply default ativo boolean when not provided', () => {
      const data = { ...validEquipamentoCreate };
      delete (data as any).ativo;
      const result = equipamentoSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.ativo).toBe(true); // Default value
    });
  });
});

// =====================
// EXPORT TEST SUMMARY FOR CI/CD
// =====================
export const FASE2_TEST_COVERAGE = {
  module: 'Equipamentos',
  totalTests: 14,
  categories: {
    'CREATE-VALID': 3,
    'CREATE-INVALID': 4,
    'UPDATE-VALID': 3,
    'UPDATE-INVALID': 2,
    'EDGE-CASES': 2,
  },
  template: 'Replicate across all 28 modules (adjust schemas + sample data)',
};
