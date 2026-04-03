import { describe, it, expect } from 'vitest';
import { 
  equipamentoSchema,
  equipamentoCreateSchema,
  equipamentoUpdateSchema,
  safeParse,
  type EquipamentoFormData
} from '@/schemas';

/**
 * FASE 2 Test Pattern — Equipamentos Module
 * Purpose: Validate Zod schema across CRUD lifecycle
 * Template: Replicate across all 28 modules with minimal changes
 */

describe('EquipamentoSchema - FASE 2 Validation Suite', () => {
  
  const validEmpresaId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  
  const validEquipamentoCreate: EquipamentoFormData = {
    nome: 'Moto Compressor XYZ',
    tipo: 'COMPRESSOR',
    localizacao: 'Garagem - Prateleira 1',
    status: 'ATIVO',
  };

  describe('CREATE - Valid Scenarios', () => {
    it('should parse valid equipamento with all required fields', () => {
      const result = safeParse(equipamentoCreateSchema, validEquipamentoCreate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.nome).toBe('Moto Compressor XYZ');
      }
    });

    it('should parse valid equipamento with optional localizacao', () => {
      const data = { ...validEquipamentoCreate, localizacao: undefined };
      const result = safeParse(equipamentoCreateSchema, data);
      expect(result.success).toBe(true);
    });

    it('should parse with different valid statuses', () => {
      const statuses = ['ATIVO', 'INATIVO', 'MANUTENÇÃO'];
      statuses.forEach(status => {
        const data = { ...validEquipamentoCreate, status };
        const result = safeParse(equipamentoCreateSchema, data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CREATE - Invalid Scenarios', () => {
    it('should reject missing required fields', () => {
      const data = { tipo: 'COMPRESSOR' }; // missing nome, status
      const result = safeParse(equipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid tipo enum value', () => {
      const data = { ...validEquipamentoCreate, tipo: 'INVALIDO' };
      const result = safeParse(equipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status enum value', () => {
      const data = { ...validEquipamentoCreate, status: 'UNKNOWN' };
      const result = safeParse(equipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject empty nome', () => {
      const data = { ...validEquipamentoCreate, nome: '' };
      const result = safeParse(equipamentoCreateSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('UPDATE - Valid Scenarios', () => {
    it('should parse partial update with single field', () => {
      const data = { nome: 'New Name' };
      const result = safeParse(equipamentoUpdateSchema, data);
      expect(result.success).toBe(true);
    });

    it('should parse partial update with multiple fields', () => {
      const data = {
        nome: 'Updated Name',
        status: 'INATIVO',
        localizacao: 'New Location',
      };
      const result = safeParse(equipamentoUpdateSchema, data);
      expect(result.success).toBe(true);
    });

    it('should parse empty update object', () => {
      const data = {};
      const result = safeParse(equipamentoUpdateSchema, data);
      expect(result.success).toBe(true);
    });
  });

  describe('UPDATE - Invalid Scenarios', () => {
    it('should reject update with invalid status', () => {
      const data = { status: 'INVALID' };
      const result = safeParse(equipamentoUpdateSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject update with invalid tipo', () => {
      const data = { tipo: 'UNKNOWN_TYPE' };
      const result = safeParse(equipamentoUpdateSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('ERROR DETAILS', () => {
    it('should provide meaningful error messages', () => {
      const invalidData = {
        nome: '',
        tipo: 'INVALID',
        status: 'UNKNOWN',
      };
      const result = safeParse(equipamentoCreateSchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
