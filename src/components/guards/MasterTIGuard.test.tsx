import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MasterTIGuard } from "./MasterTIGuard";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

function renderWithRoutes() {
  render(
    <MemoryRouter initialEntries={["/master-ti"]}>
      <Routes>
        <Route
          path="/master-ti"
          element={
            <MasterTIGuard>
              <div>Master TI content</div>
            </MasterTIGuard>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("MasterTIGuard", () => {
  it("allows Master TI users", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isMasterTI: true,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Master TI content")).toBeInTheDocument();
  });

  it("redirects regular authenticated users to dashboard", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isMasterTI: false,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isMasterTI: false,
    } as never);

    renderWithRoutes();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
