import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SystemOwnerGuard } from "./SystemOwnerGuard";
import { createAuthContextValue } from "@/test/auth-context-mock";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function renderWithRoutes() {
  render(
    <MemoryRouter initialEntries={["/owner"]}>
      <Routes>
        <Route
          path="/owner"
          element={
            <SystemOwnerGuard>
              <div>Owner content</div>
            </SystemOwnerGuard>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SystemOwnerGuard", () => {
  it("keeps loading state while auth is hydrating", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: false,
      isLoading: true,
      isHydrating: true,
      authStatus: 'hydrating',
      isSystemOwner: false,
    }));

    renderWithRoutes();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });

  it("allows system owner users", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: true,
      isLoading: false,
      isSystemOwner: true,
    }));

    renderWithRoutes();
    expect(screen.getByText("Owner content")).toBeInTheDocument();
  });

  it("redirects regular authenticated users to dashboard", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: true,
      isLoading: false,
      isSystemOwner: false,
    }));

    renderWithRoutes();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    mockedUseAuth.mockReturnValue(createAuthContextValue({
      isAuthenticated: false,
      isLoading: false,
      isSystemOwner: false,
    }));

    renderWithRoutes();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
