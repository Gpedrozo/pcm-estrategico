import React from 'react';
import { SystemOwnerGuard } from '@/guards/SystemOwnerGuard';
import { OwnerLayout } from '@/owner/OwnerLayout';

export default function OwnerPortal() {
  return (
    <SystemOwnerGuard>
      <OwnerLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Painel Owner</h2>
            <p className="text-sm text-slate-400">
              Acesso exclusivo para administracao global. Use as rotas de gestao internas para auditoria,
              validacao e monitoramento do ambiente.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-lg font-semibold">Seguranca</h3>
              <p className="text-sm text-slate-400">
                Verifique roles, RLS e isolamento entre tenants.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-lg font-semibold">Auditoria</h3>
              <p className="text-sm text-slate-400">
                Acompanhe acessos e eventos criticos do sistema.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-lg font-semibold">Tenant Control</h3>
              <p className="text-sm text-slate-400">
                Gerencie tenants e branding sem expor dados entre empresas.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-lg font-semibold">Integracoes</h3>
              <p className="text-sm text-slate-400">
                Monitoramento de Supabase, storage e autenticacao.
              </p>
            </div>
          </div>
        </div>
      </OwnerLayout>
    </SystemOwnerGuard>
  );
}
