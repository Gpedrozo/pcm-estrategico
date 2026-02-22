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

const BUCKET = "logos";

function getPublicUrl(path?: string | null) {
  if (!path) return null;

  if (path.startsWith("http")) return path;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export function MasterLogoManager() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("dados_empresa")
      .select("*")
      .single();

    setEmpresa(data);
  }

  function fixCache(url?: string | null) {
    if (!url) return null;
    return url + "?v=" + Date.now();
  }

  const logoPrincipal = fixCache(getPublicUrl(empresa?.logo_principal_url));
  const logoMenu = fixCache(getPublicUrl(empresa?.logo_menu_url));
  const logoLogin = fixCache(getPublicUrl(empresa?.logo_login_url));

  return (
    <div className="space-y-6">

      <div>
        <p>Logo Principal</p>
        <img src={logoPrincipal || "/logo.png"} className="h-16 object-contain" />
      </div>

      <div>
        <p>Logo Menu</p>
        <img src={logoMenu || "/logo.png"} className="h-12 object-contain" />
      </div>

      <div>
        <p>Logo Login</p>
        <img src={logoLogin || "/logo.png"} className="h-20 object-contain" />
      </div>

    </div>
  );
}
