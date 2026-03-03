import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Owner from "./Owner";
import { createAuthContextValue } from "@/test/auth-context-mock";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useOwnerPortal", () => ({
  useOwnerStats: () => ({ data: { total_companies: 1, total_users: 1, active_subscriptions: 1, mrr: 0 }, isLoading: false }),
  useOwnerCompanies: () => ({ data: { companies: [] }, isLoading: false }),
  useOwnerUsers: () => ({ data: [], isLoading: false }),
  useOwnerPlans: () => ({ data: [], isLoading: false }),
  useOwnerSubscriptions: () => ({ data: [], isLoading: false }),
  useOwnerAuditLogs: () => ({ data: [], isLoading: false }),
  useOwnerSupportTickets: () => ({ data: [], isLoading: false }),
  useOwnerCompanyActions: () => ({ blockCompany: { mutate: vi.fn(), isPending: false }, changePlan: { mutate: vi.fn(), isPending: false } }),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function renderWithQuery(ui: JSX.Element) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Owner page access", () => {
  it("blocks common users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: false,
    }));

    renderWithQuery(<Owner />);
    expect(screen.getByText("Acesso Negado")).toBeInTheDocument();
  });

  it("blocks MASTER_TI users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: false,
    }));

    renderWithQuery(<Owner />);
    expect(screen.getByText(/exclusivo para o perfil SYSTEM_OWNER/i)).toBeInTheDocument();
  });

  it("allows SYSTEM_OWNER users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: true,
    }));

    renderWithQuery(<Owner />);
    expect(screen.getByText("Owner Portal")).toBeInTheDocument();
    expect(screen.getByText("Controle global multiempresa")).toBeInTheDocument();
  });
});
