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
  useOwnerBackendHealth: () => ({ data: { service: 'owner-portal-admin', status: 'ok', version: 'test', supported_actions: [], timestamp: new Date().toISOString() }, isLoading: false, isFetching: false }),
  useOwnerCompanies: () => ({ data: { companies: [] }, isLoading: false }),
  useOwnerUsers: () => ({ data: [], isLoading: false }),
  useOwnerPlans: () => ({ data: [], isLoading: false }),
  useOwnerSubscriptions: () => ({ data: [], isLoading: false }),
  useOwnerContracts: () => ({ data: [], isLoading: false }),
  useOwnerAuditLogs: () => ({ data: [], isLoading: false }),
  useOwnerSupportTickets: () => ({ data: [], isLoading: false }),
  useOwnerMasterOwners: () => ({ data: [], isLoading: false }),
  useOwnerDatabaseTables: () => ({ data: [], isLoading: false }),
  useOwnerCompanySettings: () => ({ data: { settings: [] }, isLoading: false }),
  useOwnerCompanyActions: () => ({
    createCompanyMutation: { mutateAsync: vi.fn(), isPending: false },
    updateCompanyMutation: { mutateAsync: vi.fn(), isPending: false },
    setCompanyLifecycle: { mutateAsync: vi.fn(), isPending: false },
    createUserMutation: { mutateAsync: vi.fn(), isPending: false },
    setUserStatusMutation: { mutateAsync: vi.fn(), isPending: false },
    createPlanMutation: { mutateAsync: vi.fn(), isPending: false },
    updatePlanMutation: { mutateAsync: vi.fn(), isPending: false },
    changePlan: { mutateAsync: vi.fn(), isPending: false },
    createSubscriptionMutation: { mutateAsync: vi.fn(), isPending: false },
    setSubscriptionStatusMutation: { mutateAsync: vi.fn(), isPending: false },
    updateSubscriptionBillingMutation: { mutateAsync: vi.fn(), isPending: false },
    updateContractMutation: { mutateAsync: vi.fn(), isPending: false },
    regenerateContractMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteContractMutation: { mutateAsync: vi.fn(), isPending: false },
    respondSupportMutation: { mutateAsync: vi.fn(), isPending: false },
    updateCompanySettingsMutation: { mutateAsync: vi.fn(), isPending: false },
    createPlatformOwnerMutation: { mutateAsync: vi.fn(), isPending: false },
    createSystemAdminMutation: { mutateAsync: vi.fn(), isPending: false },
    cleanupCompanyDataMutation: { mutateAsync: vi.fn(), isPending: false },
    purgeTableDataMutation: { mutateAsync: vi.fn(), isPending: false },
    deleteCompanyByOwnerMutation: { mutateAsync: vi.fn(), isPending: false },
  }),
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
    expect(screen.getByText("Acesso negado")).toBeInTheDocument();
  });

  it("blocks MASTER_TI users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: false,
    }));

    renderWithQuery(<Owner />);
    expect(screen.getByText(/exclusivo para SYSTEM_OWNER/i)).toBeInTheDocument();
  });

  it("allows SYSTEM_OWNER users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: true,
    }));

    renderWithQuery(<Owner />);
    expect(screen.getByText("Owner Portal")).toBeInTheDocument();
    expect(screen.getByText("Visao executiva do ecossistema multiempresa.")).toBeInTheDocument();
  });
});
