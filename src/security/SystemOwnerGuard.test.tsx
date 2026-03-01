import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SystemOwnerGuard } from "./SystemOwnerGuard";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedSupabaseFrom = vi.mocked(supabase.from);

const renderGuard = () =>
  render(
    <MemoryRouter initialEntries={["/owner"]}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route
          path="/owner"
          element={
            <SystemOwnerGuard>
              <div>owner-page</div>
            </SystemOwnerGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("SystemOwnerGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows SYSTEM_OWNER users with active session", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const maybeSingle = vi.fn().mockResolvedValue({ data: { role: "SYSTEM_OWNER" } });

    mockedUseAuth.mockReturnValue({
      user: { id: "user-1", nome: "Owner", email: "owner@test.com", tipo: "SYSTEM_OWNER" },
      session: { user: { id: "user-1" }, expires_at: Math.floor(Date.now() / 1000) + 3600 } as never,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout,
      isAdmin: false,
      isMasterTI: false,
      isSystemOwner: true,
    });

    mockedSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
      }),
    } as never);

    renderGuard();

    await waitFor(() => {
      expect(screen.getByText("owner-page")).toBeInTheDocument();
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out and redirects when role is missing or removed", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });

    mockedUseAuth.mockReturnValue({
      user: { id: "user-2", nome: "Master", email: "master@test.com", tipo: "MASTER_TI" },
      session: { user: { id: "user-2" }, expires_at: Math.floor(Date.now() / 1000) + 3600 } as never,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout,
      isAdmin: true,
      isMasterTI: true,
      isSystemOwner: false,
    });

    mockedSupabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
      }),
    } as never);

    renderGuard();

    await waitFor(() => {
      expect(screen.getByText("login-page")).toBeInTheDocument();
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
