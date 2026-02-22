import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function MasterHeader() {
  const [logo, setLogo] = useState<string | null>(null);

  async function carregarLogo() {
    const { data } = await supabase
      .from("dados_empresa")
      .select("logo_menu_url")
      .limit(1)
      .single();

    if (data?.logo_menu_url) {
      setLogo(data.logo_menu_url);
    }
  }

  useEffect(() => {
    carregarLogo();
  }, []);

  function noCache(url: string | null) {
    if (!url) return null;
    return url + "?v=" + new Date().getTime();
  }

  return (
    <div className="flex items-center gap-3">

      <img
        src={noCache(logo) || "/logo.png"}
        alt="logo"
        className="h-10 w-auto object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/logo.png";
        }}
      />

      <h1 className="text-lg font-semibold">
        PCM Estratégico
      </h1>

    </div>
  );
}
