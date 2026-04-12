import { describe, it, expect } from 'vitest';
import { equipamentoSchema } from '../equipamento.schema';
import { ordemServicoSchema, ordemServicoUpdateSchema } from '../ordemServico.schema';
import { materialSchema } from '../material.schema';
import { plantaSchema, areaSchema, sistemaSchema } from '../hierarquia.schema';
import { mecanicoSchema } from '../mecanico.schema';

// ======================== EQUIPAMENTO ========================
describe('equipamentoSchema', () => {
  it('aceita payload válido completo', () => {
    const result = equipamentoSchema.parse({
      tag: 'EQ-001',
      nome: 'Bomba centrífuga',
      criticidade: 'A',
      nivel_risco: 'ALTO',
      sistema_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.tag).toBe('EQ-001');
    expect(result.ativo).toBe(true);
  });

  it('aplica defaults de criticidade/risco/ativo', () => {
    const result = equipamentoSchema.parse({ tag: 'EQ', nome: 'Nome' });
    expect(result.criticidade).toBe('C');
    expect(result.nivel_risco).toBe('MEDIO');
    expect(result.ativo).toBe(true);
  });

  it('rejeita tag curta', () => {
    expect(() => equipamentoSchema.parse({ tag: 'X', nome: 'Nome válido' }))
      .toThrow();
  });

  it('rejeita criticidade inválida', () => {
    expect(() => equipamentoSchema.parse({ tag: 'EQ', nome: 'Nome', criticidade: 'Z' }))
      .toThrow();
  });

  it('rejeita sistema_id não-UUID', () => {
    expect(() => equipamentoSchema.parse({ tag: 'EQ', nome: 'Nome', sistema_id: 'invalido' }))
      .toThrow();
  });
});

// ======================== ORDEM DE SERVIÇO ========================
describe('ordemServicoSchema', () => {
  const validOS = {
    tipo: 'CORRETIVA' as const,
    tag: 'EQ-001',
    equipamento: 'Bomba',
    solicitante: 'João',
    problema: 'Vibração excessiva no eixo',
  };

  it('aceita payload válido', () => {
    const result = ordemServicoSchema.parse(validOS);
    expect(result.prioridade).toBe('MEDIA');
    expect(result.tipo).toBe('CORRETIVA');
  });

  it('rejeita tipo inválido', () => {
    expect(() => ordemServicoSchema.parse({ ...validOS, tipo: 'INVALIDO' }))
      .toThrow();
  });

  it('rejeita problema curto', () => {
    expect(() => ordemServicoSchema.parse({ ...validOS, problema: 'abc' }))
      .toThrow();
  });

  it('aceita mecanico_responsavel_id UUID', () => {
    const result = ordemServicoSchema.parse({
      ...validOS,
      mecanico_responsavel_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.mecanico_responsavel_id).toBeDefined();
  });
});

describe('ordemServicoUpdateSchema', () => {
  it('aceita update parcial de status', () => {
    const result = ordemServicoUpdateSchema.parse({ status: 'FECHADA' });
    expect(result.status).toBe('FECHADA');
  });

  it('rejeita status inválido', () => {
    expect(() => ordemServicoUpdateSchema.parse({ status: 'INVALIDO' }))
      .toThrow();
  });

  it('aceita campos opcionais nullable', () => {
    const result = ordemServicoUpdateSchema.parse({
      modo_falha: null,
      causa_raiz: 'Desgaste',
    });
    expect(result.modo_falha).toBeNull();
    expect(result.causa_raiz).toBe('Desgaste');
  });
});

// ======================== MATERIAL ========================
describe('materialSchema', () => {
  it('aceita payload válido com defaults', () => {
    const result = materialSchema.parse({ codigo: 'MAT-01', nome: 'Parafuso M10' });
    expect(result.unidade).toBe('UN');
    expect(result.custo_unitario).toBe(0);
    expect(result.estoque_atual).toBe(0);
    expect(result.ativo).toBe(true);
  });

  it('rejeita custo negativo', () => {
    expect(() => materialSchema.parse({ codigo: 'MAT', nome: 'Parafuso', custo_unitario: -5 }))
      .toThrow();
  });

  it('rejeita código curto', () => {
    expect(() => materialSchema.parse({ codigo: 'M', nome: 'Parafuso' }))
      .toThrow();
  });
});

// ======================== HIERARQUIA ========================
describe('plantaSchema', () => {
  it('aceita payload válido', () => {
    const result = plantaSchema.parse({ codigo: 'PL-01', nome: 'Planta Norte' });
    expect(result.ativo).toBe(true);
  });

  it('rejeita nome curto', () => {
    expect(() => plantaSchema.parse({ codigo: 'PL', nome: 'AB' }))
      .toThrow();
  });
});

describe('areaSchema', () => {
  it('aceita payload com planta_id UUID', () => {
    const result = areaSchema.parse({
      planta_id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'AR-01',
      nome: 'Área Caldeiras',
    });
    expect(result.planta_id).toBeDefined();
  });

  it('rejeita planta_id não-UUID', () => {
    expect(() => areaSchema.parse({ planta_id: 'xyz', codigo: 'AR', nome: 'Área' }))
      .toThrow();
  });
});

describe('sistemaSchema', () => {
  it('aceita payload válido', () => {
    const result = sistemaSchema.parse({
      area_id: '550e8400-e29b-41d4-a716-446655440000',
      codigo: 'SIS-01',
      nome: 'Sistema Hidráulico',
      funcao_principal: 'Bombeamento',
    });
    expect(result.funcao_principal).toBe('Bombeamento');
  });

  it('rejeita area_id não-UUID', () => {
    expect(() => sistemaSchema.parse({ area_id: 'abc', codigo: 'SIS', nome: 'Sistema' }))
      .toThrow();
  });
});

// ======================== MECÂNICO ========================
describe('mecanicoSchema', () => {
  it('aceita payload válido com defaults', () => {
    const result = mecanicoSchema.parse({ nome: 'Carlos Silva' });
    expect(result.tipo).toBe('INTERNO');
    expect(result.ativo).toBe(true);
  });

  it('aceita tipo TERCEIRIZADO', () => {
    const result = mecanicoSchema.parse({ nome: 'Prestador', tipo: 'TERCEIRIZADO' });
    expect(result.tipo).toBe('TERCEIRIZADO');
  });

  it('rejeita nome curto', () => {
    expect(() => mecanicoSchema.parse({ nome: 'AB' })).toThrow();
  });

  it('rejeita custo_hora negativo', () => {
    expect(() => mecanicoSchema.parse({ nome: 'Carlos', custo_hora: -10 }))
      .toThrow();
  });

  it('aceita todos os campos opcionais como null', () => {
    const result = mecanicoSchema.parse({
      nome: 'Carlos',
      telefone: null,
      especialidade: null,
      custo_hora: null,
      codigo_acesso: null,
    });
    expect(result.telefone).toBeNull();
  });
});
