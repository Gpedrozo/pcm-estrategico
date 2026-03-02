import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Owner from "./Owner";
import { createAuthContextValue } from "@/test/auth-context-mock";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useControlPlane", () => ({
  useOwnerDashboardMetrics: () => ({ data: null }),
  useOwnerCompanies: () => ({ data: [] }),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

describe("Owner page access", () => {
  it("blocks common users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: false,
    }));

    render(<Owner />);
    expect(screen.getByText("Acesso Negado")).toBeInTheDocument();
  });

  it("blocks MASTER_TI users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: false,
    }));

    render(<Owner />);
    expect(screen.getByText(/exclusivo para o perfil SYSTEM_OWNER/i)).toBeInTheDocument();
  });

  it("allows SYSTEM_OWNER users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isSystemOwner: true,
    }));

    render(<Owner />);
    expect(screen.getByText("SYSTEM OWNER")).toBeInTheDocument();
    expect(screen.getByText("AMBIENTE GLOBAL")).toBeInTheDocument();
  });
});
