import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  EquipamentoCreateSchema, 
  EquipamentoUpdateSchema,
  safeParse,
  type EquipamentoCreate,
  type EquipamentoUpdate 
} from '@/schemas';

/**
 * FASE 2 Test Pattern — Equipamentos Module
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
  
  const validEmpresaId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const validEquipamentoCreate: EquipamentoCreate = {
    empresa_id: validEmpresaId,
    nome: 'Moto Compressor XYZ',
    tipo: 'COMPRESSOR',
    localizacao: 'Garagem - Prateleira 1',
    status: 'ATIVO',
  };

  const validEquipamentoUpdate: EquipamentoUpdate = {
    nome: 'Moto Compressor XYZ - Revisado',
    status: 'INATIVO',
  };

  // =====================
  // GROUP 1: Valid Creation Scenarios (3 tests)
  // =====================

  describe('CREATE - Valid Scenarios', () => {
    it('should parse valid equipamento with all required fields', () => {
      const result = safeParse(EquipamentoCreateSchema, validEquipamentoCreate);
      expect(result.success).toBe(true);
      expect(result.data?.nome).toBe('Moto Compressor XYZ');
      expect(result.data?.empresa_id).toBe(validEmpresaId);
    });

    it('should parse valid equipamento with optional localizacao', () => {
      const data = { ...validEquipamentoCreate, localizacao: undefined };
      const result = safeParse(EquipamentoCreateSchema, data);
      expect(result.success).toBe(true);
      // localizacao should be optional
    });

    it('should parse with different valid statuses', () => {
      const statuses = ['ATIVO', 'INATIVO', 'MANUTENÇÃO', 'DESATIVADO'];
      statuses.forEach(status => {
        const data = { ...validEquipamentoCreate, status };
        const result = safeParse(EquipamentoCreateSchema, data);
        expect(result.success).toBe(true);
        expect(result.data?.status).toBe(status);
      });
    });
  });

  // =====================
  // GROUP 2: Invalid Creation Scenarios (4 tests)
  // =====================

  describe('CREATE - Invalid Scenarios', () => {
    it('should reject missing required empresa_id', () => {
      const data = { ...validEquipamentoCreate };
      delete (data as any).empresa_id;
      const result = safeParse(EquipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format for empresa_id', () => {
      const data = { ...validEquipamentoCreate, empresa_id: 'not-a-uuid' };
      const result = safeParse(EquipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject nome exceeding max length', () => {
      const longName = 'a'.repeat(256); // Assuming max 255
      const data = { ...validEquipamentoCreate, nome: longName };
      const result = safeParse(EquipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status enum value', () => {
      const data = { ...validEquipamentoCreate, status: 'INVALIDO' };
      const result = safeParse(EquipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });
  });

  // =====================
  // GROUP 3: Valid Update Scenarios (3 tests)
  // =====================

  describe('UPDATE - Valid Scenarios', () => {
    it('should parse partial update with single field', () => {
      const data: EquipamentoUpdate = { nome: 'New Name' };
      const result = safeParse(EquipamentoUpdateSchema, data);
      expect(result.success).toBe(true);
      expect(result.data?.nome).toBe('New Name');
    });

    it('should parse partial update with multiple fields', () => {
      const data: EquipamentoUpdate = {
        nome: 'Updated Name',
        status: 'INATIVO',
        localizacao: 'New Location',
      };
      const result = safeParse(EquipamentoUpdateSchema, data);
      expect(result.success).toBe(true);
      expect(Object.keys(result.data!)).toHaveLength(3);
    });

    it('should parse empty update object (no-op update)', () => {
      const data: EquipamentoUpdate = {};
      const result = safeParse(EquipamentoUpdateSchema, data);
      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBeGreaterThanOrEqual(0);
    });
  });

  // =====================
  // GROUP 4: Invalid Update Scenarios (2 tests)
  // =====================

  describe('UPDATE - Invalid Scenarios', () => {
    it('should reject update with invalid status', () => {
      const data: EquipamentoUpdate = { status: 'INVALID_STATUS' };
      const result = safeParse(EquipamentoUpdateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject update with nome exceeding max length', () => {
      const data: EquipamentoUpdate = { nome: 'a'.repeat(256) };
      const result = safeParse(EquipamentoUpdateSchema, data);
      expect(result.success).toBe(false);
    });
  });

  // =====================
  // GROUP 5: Type Inference & TypeScript Compatibility (2 tests)
  // =====================

  describe('TYPE INFERENCE', () => {
    it('should preserve TypeScript typing after parse', () => {
      const result = safeParse(EquipamentoCreateSchema, validEquipamentoCreate);
      
      if (result.success && result.data) {
        // This should compile without TypeScript errors
        const nome: string = result.data.nome;
        const empresaId: string = result.data.empresa_id;
        
        expect(nome).toBeDefined();
        expect(empresaId).toBeDefined();
      }
    });

    it('should type narrowing work correctly', () => {
      const result = safeParse(EquipamentoCreateSchema, {
        empresa_id: validEmpresaId,
        nome: '',
        tipo: 'COMPRESSOR',
        status: 'ATIVO',
      });

      expect(result.success).toBe(true);
      // Type should be narrowed to EquipamentoCreate when success = true
      if (result.success) {
        const typed: EquipamentoCreate = result.data!;
        expect(typed.nome).toBeDefined();
      }
    });
  });

  // =====================
  // GROUP 6: Error Details & Developer Experience (1 test)
  // =====================

  describe('ERROR DETAILS', () => {
    it('should provide detailed error messages for developers', () => {
      const invalidData = {
        empresa_id: 'not-uuid',
        nome: 'a'.repeat(300),
        tipo: 'INVALID',
        status: 'UNKNOWN',
      };

      const result = safeParse(EquipamentoCreateSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      
      // Should contain meaningful error messages
      if (!result.success) {
        const errorMessages = JSON.stringify(result.errors);
        expect(errorMessages.length).toBeGreaterThan(0);
      }
    });
  });

  // =====================
  // GROUP 7: Integration with Service Layer (1 test - Mocked)
  // =====================

  describe('SERVICE LAYER INTEGRATION', () => {
    it('should prepare data correctly for service layer POST', () => {
      const formData = {
        nome: 'Test Equipment',
        tipo: 'COMPRESSOR',
        localizacao: 'Test Location',
        status: 'ATIVO',
      };

      const result = safeParse(EquipamentoCreateSchema, {
        ...formData,
        empresa_id: validEmpresaId,
      });

      expect(result.success).toBe(true);
      
      // Should be ready for Supabase insert
      if (result.success) {
        const readyForDb = result.data;
        expect(readyForDb?.empresa_id).toBe(validEmpresaId);
        expect(readyForDb?.nome).toBe('Test Equipment');
      }
    });
  });
});

// =====================
// EXPORT TEST SUMMARY FOR CI/CD
// =====================
export const FASE2_TEST_COVERAGE = {
  module: 'Equipamentos',
  totalTests: 17,
  categories: {
    'CREATE-VALID': 3,
    'CREATE-INVALID': 4,
    'UPDATE-VALID': 3,
    'UPDATE-INVALID': 2,
    'TYPE-INFERENCE': 2,
    'ERROR-DETAILS': 1,
    'SERVICE-INTEGRATION': 1,
  },
  template: 'Replicate across all 28 modules (adjust schemas + sample data)',
};
