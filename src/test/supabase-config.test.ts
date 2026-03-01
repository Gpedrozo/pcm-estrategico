import { describe, expect, it } from "vitest";
import { resolveSupabaseConfig } from "@/integrations/supabase/config";

describe("resolveSupabaseConfig", () => {
  it("returns trimmed values when required env vars are present", () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: " https://example.supabase.co ",
        VITE_SUPABASE_PUBLISHABLE_KEY: " test-key ",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      key: "test-key",
    });
  });

  it("throws when required env vars are missing", () => {
    expect(() => resolveSupabaseConfig({})).toThrow(
      "Supabase configuration is missing",
    );
  });
});
