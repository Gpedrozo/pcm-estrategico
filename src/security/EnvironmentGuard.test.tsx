import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, afterEach } from "vitest";
import { EnvironmentGuard } from "./EnvironmentGuard";

describe("EnvironmentGuard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects owner domain away from non-owner routes", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <EnvironmentGuard hostnameOverride="owner.gppis.com.br">
          <Routes>
            <Route path="/owner" element={<div>owner-home</div>} />
            <Route path="/dashboard" element={<div>dashboard-home</div>} />
          </Routes>
        </EnvironmentGuard>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("owner-home")).toBeInTheDocument();
    });
  });

  it("blocks owner route outside owner domain and logs warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/owner"]}>
        <EnvironmentGuard hostnameOverride="app.gppis.com.br">
          <Routes>
            <Route path="/" element={<div>root-home</div>} />
            <Route path="/owner" element={<div>owner-home</div>} />
          </Routes>
        </EnvironmentGuard>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("root-home")).toBeInTheDocument();
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
