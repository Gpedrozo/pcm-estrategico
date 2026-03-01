import { describe, it, expect } from "vitest";
import { OWNER_FILES } from "@/pages/ArquivosOwner";

describe("ArquivosOwner", () => {
  it("deve expor os caminhos dos arquivos do owner para administração", () => {
    expect(OWNER_FILES.map((item) => item.path)).toEqual([
      "src/pages/MasterTI.tsx",
      "src/components/master-ti/",
      "src/components/layout/AppSidebar.tsx",
      "src/contexts/AuthContext.tsx",
    ]);
  });
});
