import { describe, it, expect } from "vitest";
import { OWNER_FILES } from "@/pages/ArquivosOwner";

describe("ArquivosOwner", () => {
  it("deve expor os caminhos dos arquivos do owner para administração", () => {
    expect(OWNER_FILES.map((item) => item.path)).toEqual([
      "/master-ti",
      "/usuarios",
      "/auditoria",
    ]);
  });
});
