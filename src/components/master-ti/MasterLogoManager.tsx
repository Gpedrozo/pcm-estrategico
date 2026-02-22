import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Empresa = {
  id: string;
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
      console.error(error);
      setLoading(false);
      return;
    }

    setEmpresa(data);
    setLoading(false);
  }

  useEffect(() => {
    carregarEmpresa();
  }, []);

  function fixCache(url?: string | null) {
    if (!url) return null;
    return url + "?v=" + Date.now();
  }

  if (loading) {
    return <div>Carregando logos...</div>;
  }

  return (
    <div className="grid gap-6">

      <LogoItem
        titulo="Logo Principal"
        url={fixCache(empresa?.logo_principal_url)}
      />

      <LogoItem
        titulo="Logo Menu"
        url={fixCache(empresa?.logo_menu_url)}
      />

      <LogoItem
        titulo="Logo Login"
        url={fixCache(empresa?.logo_login_url)}
      />

      <LogoItem
        titulo="Logo PDF"
        url={fixCache(empresa?.logo_pdf_url)}
      />

      <LogoItem
        titulo="Logo OS"
        url={fixCache(empresa?.logo_os_url)}
      />

      <LogoItem
        titulo="Logo Relatório"
        url={fixCache(empresa?.logo_relatorio_url)}
      />

    </div>
  );
}

function LogoItem({ titulo, url }: { titulo: string; url?: string | null }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{titulo}</p>

      <div className="border rounded-xl p-4 flex items-center justify-center bg-white">
        <img
          src={url || "/logo.png"}
          className="max-h-20 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/logo.png";
          }}
        />
      </div>
    </div>
  );
}
