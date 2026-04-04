import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Owner from "./Owner";
import { createAuthContextValue } from "@/test/auth-context-mock";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useOwner2Portal", () => ({
  useOwner2Health: () => ({ data: { service: 'owner-portal-admin', status: 'ok', version: 'test', supported_actions: [], timestamp: new Date().toISOString() }, isLoading: false, isFetching: false }),
  useOwner2Dashboard: () => ({ data: { total_companies: 1, total_users: 1, active_subscriptions: 1, mrr: 0 }, isLoading: false }),
  useOwner2Companies: () => ({ data: { companies: [] }, isLoading: false }),
  useOwner2Users: () => ({ data: { users: [] }, isLoading: false }),
  useOwner2Plans: () => ({ data: { plans: [] }, isLoading: false }),
  useOwner2Subscriptions: () => ({ data: { subscriptions: [] }, isLoading: false }),
  useOwner2Contracts: () => ({ data: { contracts: [] }, isLoading: false }),
  useOwner2Audits: () => ({ data: { logs: [] }, isLoading: false }),
  useOwner2Tickets: () => ({ data: { tickets: [] }, isLoading: false }),
  useOwner2PlatformOwners: () => ({ data: { owners: [] }, isLoading: false }),
  useOwner2Tables: () => ({ data: { tables: [] }, isLoading: false }),
  useOwner2Settings: () => ({ data: { settings: [] }, isLoading: false }),
  useOwner2Actions: () => ({
    execute: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

vi.stubEnv('VITE_OWNER_MASTER_EMAIL', 'owner-master@gppis.com.br')

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
    expect(screen.getByText(/SYSTEM_OWNER/i)).toBeInTheDocument();
  });

  it("allows SYSTEM_OWNER users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: true,
    }));

    renderWithQuery(<Owner />);
    expect(screen.getByText("Owner Portal")).toBeInTheDocument();
    expect(screen.getByText("Visao executiva do ecossistema multiempresa.")).toBeInTheDocument();
  });

  it('hides owner master tab for non-master system owner', () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: true,
      user: {
        ...createAuthContextValue().user,
        email: 'outro-owner@gppis.com.br',
      },
    }))

    renderWithQuery(<Owner />)
    expect(screen.queryByText('Owner Master')).not.toBeInTheDocument()
  })

  it('shows owner master tab for configured owner master', () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: true,
      user: {
        ...createAuthContextValue().user,
        email: 'owner-master@gppis.com.br',
      },
    }))

    renderWithQuery(<Owner />)
    expect(screen.getByText('Owner Master')).toBeInTheDocument()
  })
});
