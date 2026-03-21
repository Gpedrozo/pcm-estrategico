import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreventivaPrintTemplate } from './PreventivaPrintTemplate';

describe('PreventivaPrintTemplate', () => {
  it('renderiza cabeçalho e rodapé padrão de impressão', () => {
    render(
      <PreventivaPrintTemplate
        ref={createRef<HTMLDivElement>()}
        data={{
          plano: {
            id: 'plano-1',
            codigo: 'PR-001',
            nome: 'Inspeção mensal',
            tag: 'EQ-01',
            tipo_gatilho: 'TEMPO',
            frequencia_dias: 30,
            proxima_execucao: '2026-03-15',
            descricao: 'Descrição do plano',
            instrucoes: 'Instruções do plano',
          } as any,
          atividades: [
            {
              id: 'atv-1',
              nome: 'Verificar rolamentos',
              responsavel: 'Técnico A',
              tempo_total_min: 30,
              servicos: [],
            } as any,
          ],
          tempoTotal: 30,
        }}
      />
    );

    expect(screen.getByText('Nº Documento:')).toBeInTheDocument();
    expect(screen.getByText(/Página 1 \/ 1/i)).toBeInTheDocument();
    expect(screen.getByText('ATIVIDADES E SERVIÇOS')).toBeInTheDocument();
  });
});
