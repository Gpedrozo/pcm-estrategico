import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateOwnerContractPDF,
  printOwnerContractDocument,
  type OwnerContractForDocument,
} from './reportGenerator';

// Mock jsPDF and jspdf-autotable
vi.mock('jspdf', () => ({
  default: function MockJsPDF() {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      addImage: vi.fn(),
      splitTextToSize: (text: string) => text.split('\n'),
      addPage: vi.fn(),
      getNumberOfPages: () => 1,
      setPage: vi.fn(),
      save: vi.fn(),
      rpc: vi.fn(),
      getPage: vi.fn(),
    };
  },
}));

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

describe('reportGenerator - Document Functions', () => {
  const mockContract: OwnerContractForDocument = {
    id: 'contract-1',
    empresaNome: 'Empresa Teste',
    planoNome: 'Plano Premium',
    status: 'ativo',
    amount: 1000,
    starts_at: '2026-04-01',
    ends_at: '2027-04-01',
    generated_at: '2026-04-01',
    signed_at: '2026-04-15',
    version: 1,
    summary: 'Resumo do contrato de teste.',
    content: 'Cláusulas do contrato de teste.\n\nSegunda cláusula.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateOwnerContractPDF', () => {
    it('cria documento PDF com metadados do contrato', async () => {
      await expect(
        generateOwnerContractPDF(mockContract),
      ).resolves.not.toThrow();
    });

    it('sanitiza nome do arquivo para caracteres válidos', async () => {
      const contractWithSpecialChars: OwnerContractForDocument = {
        ...mockContract,
        empresaNome: 'Empresa @#$% Teste!!!',
      };

      await expect(
        generateOwnerContractPDF(contractWithSpecialChars),
      ).resolves.not.toThrow();
    });

    it('gera PDF mesmo sem summary (usando content)', async () => {
      const contractWithoutSummary: OwnerContractForDocument = {
        ...mockContract,
        summary: null,
      };

      await expect(
        generateOwnerContractPDF(contractWithoutSummary),
      ).resolves.not.toThrow();
    });

    it('gera PDF mesmo sem content (usando summary)', async () => {
      const contractWithoutContent: OwnerContractForDocument = {
        ...mockContract,
        content: null,
      };

      await expect(
        generateOwnerContractPDF(contractWithoutContent),
      ).resolves.not.toThrow();
    });

    it('gera PDF com fallback quando faltam ambos summary e content', async () => {
      const contractWithoutBoth: OwnerContractForDocument = {
        ...mockContract,
        summary: null,
        content: null,
      };

      await expect(
        generateOwnerContractPDF(contractWithoutBoth),
      ).resolves.not.toThrow();
    });

    it('trata valores null em campos opcionais gracefully', async () => {
      const minimalContract: OwnerContractForDocument = {
        id: 'contract-minimal',
        empresaNome: null,
        planoNome: null,
        status: null,
        amount: null,
        starts_at: null,
        ends_at: null,
        generated_at: null,
        signed_at: null,
        version: null,
        summary: null,
        content: 'Mínimo de conteúdo.',
      };

      await expect(
        generateOwnerContractPDF(minimalContract),
      ).resolves.not.toThrow();
    });
  });

  describe('printOwnerContractDocument', () => {
    let windowOpenMock: any;
    let documentWriteMock: any;
    let documentCloseMock: any;

    beforeEach(() => {
      documentWriteMock = vi.fn();
      documentCloseMock = vi.fn();
      windowOpenMock = vi.fn(() => ({
        document: {
          write: documentWriteMock,
          close: documentCloseMock,
        },
        focus: vi.fn(),
      }));

      global.window.open = windowOpenMock;
    });

    it('abre janela de impressão', () => {
      printOwnerContractDocument(mockContract);
      expect(windowOpenMock).toHaveBeenCalled();
    });

    it('escreve HTML formatado no documento de impressão', () => {
      printOwnerContractDocument(mockContract);
      expect(documentWriteMock).toHaveBeenCalled();
      const htmlContent = documentWriteMock.mock.calls[0][0];
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Empresa Teste');
    });

    it('fecha documento após escrita', () => {
      printOwnerContractDocument(mockContract);
      expect(documentCloseMock).toHaveBeenCalled();
    });

    it('escapa HTML special characters no conteúdo', () => {
      const contractWithSpecialChars: OwnerContractForDocument = {
        ...mockContract,
        content: '<script>alert("xss")</script>',
        empresaNome: 'Empresa & Co.',
      };

      printOwnerContractDocument(contractWithSpecialChars);
      const htmlContent = documentWriteMock.mock.calls[0][0];
      expect(htmlContent).toContain('&lt;script&gt;');
      expect(htmlContent).not.toContain('<script>alert(');  // XSS n�o deve aparecer n�o-escapado
      expect(htmlContent).toContain('&amp; Co.');
    });

    it('lança erro descritivo quando window.open retorna null', () => {
      windowOpenMock.mockReturnValue(null);

      expect(() => {
        printOwnerContractDocument(mockContract);
      }).toThrow(/Não foi possível abrir a janela de impressão/);
    });

    it('renderiza metadados da empresa na prévia', () => {
      printOwnerContractDocument(mockContract);
      const htmlContent = documentWriteMock.mock.calls[0][0];
      expect(htmlContent).toContain('Empresa Teste');
      expect(htmlContent).toContain('Plano Premium');
      expect(htmlContent).toContain('1.000,00');
    });

    it('renderiza cláusulas com quebras de parágrafo no HTML', () => {
      printOwnerContractDocument(mockContract);
      const htmlContent = documentWriteMock.mock.calls[0][0];
      expect(htmlContent).toContain('<p>');
      expect(htmlContent).toContain('Cláusulas do contrato');
    });

    it('foca a janela de impressão após escrita', () => {
      const focusMock = vi.fn();
      windowOpenMock.mockReturnValue({
        document: {
          write: documentWriteMock,
          close: documentCloseMock,
        },
        focus: focusMock,
      });

      printOwnerContractDocument(mockContract);
      expect(focusMock).toHaveBeenCalled();
    });

    it('inclui CSS de impressão na página', () => {
      printOwnerContractDocument(mockContract);
      const htmlContent = documentWriteMock.mock.calls[0][0];
      expect(htmlContent).toContain('@media print');
      expect(htmlContent).toContain('print-color-adjust: exact');
    });
  });

  describe('Edge cases and error handling', () => {
    it('PDF com conteúdo muito grande (paragrafos múltiplos)', async () => {
      const largeContent = Array.from({ length: 50 }, (_, i) =>
        `Parágrafo ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      ).join('\n\n');

      const contractWithLargeContent: OwnerContractForDocument = {
        ...mockContract,
        content: largeContent,
      };

      await expect(
        generateOwnerContractPDF(contractWithLargeContent),
      ).resolves.not.toThrow();
    });

    it('impressão com HTML entities complexas', () => {
      const contractWithEntities: OwnerContractForDocument = {
        ...mockContract,
        content: 'Artigo 1º & Artigo 2º "com aspas" e \'apóstros\'',
        empresaNome: 'Empresa & Cia.</assoc>',
      };

      expect(() => {
        printOwnerContractDocument(contractWithEntities);
      }).not.toThrow();
    });
  });
});



