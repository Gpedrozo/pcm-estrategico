import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Empresa = {
  logo_principal_url: string | null;
  logo_menu_url: string | null;
  logo_login_url: string | null;
  logo_pdf_url: string | null;
  logo_os_url: string | null;
  logo_relatorio_url: string | null;
};

export function MasterLogoManager() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregarEmpresa() {
    const { data, error } = await supabase
      .from("dados_empresa")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Erro ao carregar empresa", error);
      setLoading(false);
      return;
    }

    setEmpresa(data);
    setLoading(false);
  }

  useEffect(() => {
    carregarEmpresa();
  }, []);

  function noCache(url: string | null) {
    if (!url) return null;
    return url + "?v=" + new Date().getTime();
  }

  if (loading) {
    return <div>Carregando logos...</div>;
  }

  return (
    <div className="flex flex-col gap-6">

      <div>
        <p className="text-sm font-semibold">Logo Principal</p>
        <img
          src={noCache(empresa?.logo_principal_url) || "/logo.png"}
          className="h-16 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>

      <div>
        <p className="text-sm font-semibold">Logo Menu</p>
        <img
          src={noCache(empresa?.logo_menu_url) || "/logo.png"}
          className="h-12 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>

      <div>
        <p className="text-sm font-semibold">Logo Login</p>
        <img
          src={noCache(empresa?.logo_login_url) || "/logo.png"}
          className="h-20 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>

    </div>
  );
}
