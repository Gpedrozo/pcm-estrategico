import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Owner from "./Owner";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

const mockedUseAuth = vi.mocked(useAuth);

describe("Owner page access", () => {
  it("blocks common users", () => {
    mockedUseAuth.mockReturnValue({
      isSystemOwner: false,
    } as never);

    render(<Owner />);
    expect(screen.getByText("Acesso Negado")).toBeInTheDocument();
  });

  it("blocks MASTER_TI users", () => {
    mockedUseAuth.mockReturnValue({
      isSystemOwner: false,
    } as never);

    render(<Owner />);
    expect(screen.getByText(/exclusivo para o perfil SYSTEM_OWNER/i)).toBeInTheDocument();
  });

  it("allows SYSTEM_OWNER users", () => {
    mockedUseAuth.mockReturnValue({
      isSystemOwner: true,
    } as never);

    render(<Owner />);
    expect(screen.getByText("SYSTEM OWNER")).toBeInTheDocument();
    expect(screen.getByText("AMBIENTE GLOBAL")).toBeInTheDocument();
  });
});
