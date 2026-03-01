import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SystemOwnerGuard } from "./SystemOwnerGuard";

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
  it("allows system owner users", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSystemOwner: true,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Owner content")).toBeInTheDocument();
  });

  it("redirects regular authenticated users to dashboard", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSystemOwner: false,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isSystemOwner: false,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
