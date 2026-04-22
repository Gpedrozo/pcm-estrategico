import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MasterContratosPanel } from './MasterContratosPanel';
import * as useOwner2Portal from '@/hooks/useOwner2Portal';
import * as reportGenerator from '@/lib/reportGenerator';
import type { OwnerContract } from '@/services/ownerPortal.service';

// Mock dependencies
vi.mock('@/hooks/useOwner2Portal');
vi.mock('@/lib/reportGenerator');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isSystemOwner: true }),
}));

// Mock UI components
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, onOpenChange, children }: any) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetDescription: ({ children }: any) => <div>{children}</div>,
  SheetClose: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ onClick, disabled, children, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>Loading...</div>,
}));

describe('MasterContratosPanel', () => {
  const mockContract: OwnerContract = {
    id: 'contract-1',
    empresa_id: 'emp-1',
    plan_id: 'plan-1',
    status: 'ativo',
    content: 'Contrato de teste com cláusulas.',
    summary: 'Resumo do contrato de teste.',
    amount: 1000,
    starts_at: '2026-04-01',
    ends_at: '2027-04-01',
    generated_at: '2026-04-01',
    signed_at: '2026-04-15',
    created_at: '2026-04-01',
    updated_at: '2026-04-15',
    version: 1,
    empresas: { nome: 'Empresa Teste' },
    plans: { name: 'Plano Premium', code: 'PREMIUM' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza painel de contratos com lista de contratos', async () => {
    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [mockContract] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    await waitFor(() => {
      expect(screen.getByText('Empresa Teste')).toBeInTheDocument();
      expect(screen.getByText('Plano Premium')).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando não há contratos', async () => {
    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum contrato encontrado/),
      ).toBeInTheDocument();
    });
  });

  it('abre modal de prévia ao clicar em Visualizar', async () => {
    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [mockContract] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    const visualizarButton = await screen.findByRole('button', {
      name: /Visualizar/,
    });
    fireEvent.click(visualizarButton);

    await waitFor(() => {
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
      expect(screen.getByText('Prévia do Contrato')).toBeInTheDocument();
    });
  });

  it('desabilita botão Visualizar quando contrato não possui conteúdo', async () => {
    const contractWithoutContent: OwnerContract = {
      ...mockContract,
      content: null,
      summary: null,
    };

    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [contractWithoutContent] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    const visualizarButton = await screen.findByRole('button', {
      name: /Visualizar/,
    });
    await waitFor(() => {
      expect(visualizarButton).toBeDisabled();
    });
  });

  it('chama generateOwnerContractPDF ao clicar em Baixar PDF na prévia', async () => {
    const generatePDFMock = vi.spyOn(reportGenerator, 'generateOwnerContractPDF');
    generatePDFMock.mockResolvedValue(undefined);

    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [mockContract] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    const visualizarButton = await screen.findByRole('button', {
      name: /Visualizar/,
    });
    fireEvent.click(visualizarButton);

    await waitFor(() => {
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
    });

    const baixarPDFButton = screen.getByRole('button', {
      name: /Baixar PDF/,
    });
    fireEvent.click(baixarPDFButton);

    await waitFor(() => {
      expect(generatePDFMock).toHaveBeenCalled();
    });
  });

  it('chama printOwnerContractDocument ao clicar em Imprimir na prévia', async () => {
    const printMock = vi.spyOn(reportGenerator, 'printOwnerContractDocument');
    printMock.mockImplementation(() => {
      // mock do window.open
    });

    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [mockContract] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    const visualizarButton = await screen.findByRole('button', {
      name: /Visualizar/,
    });
    fireEvent.click(visualizarButton);

    await waitFor(() => {
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
    });

    const imprimirButton = screen.getByRole('button', {
      name: /Imprimir/,
    });
    fireEvent.click(imprimirButton);

    await waitFor(() => {
      expect(printMock).toHaveBeenCalled();
    });
  });

  it('exibe estado erro ao falhar carregamento de contratos', async () => {
    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Falha ao carregar contratos'),
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Falha ao carregar contratos/)).toBeInTheDocument();
    });
  });

  it('exibe truncated preview do conteúdo do contrato na prévia', async () => {
    const longContent = 'Lorem ipsum '.repeat(100);
    const contractWithLongContent: OwnerContract = {
      ...mockContract,
      content: longContent,
    };

    const useOwner2ContractsMock = vi.spyOn(useOwner2Portal, 'useOwner2Contracts');
    useOwner2ContractsMock.mockReturnValue({
      data: { contracts: [contractWithLongContent] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as any);

    render(<MasterContratosPanel />);

    const visualizarButton = await screen.findByRole('button', {
      name: /Visualizar/,
    });
    fireEvent.click(visualizarButton);

    await waitFor(() => {
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
    });

    const previewContent = screen.getByText(/Lorem ipsum/);
    expect(previewContent.textContent).toContain('...');
  });
});
