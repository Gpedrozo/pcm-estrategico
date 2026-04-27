import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail } from 'lucide-react';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Início
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm font-medium">Política de Privacidade</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Título */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Política de Privacidade</h1>
            <p className="text-slate-500 text-sm">Última atualização: janeiro de 2026 · GPPIS Tecnologia</p>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 mb-8 text-sm text-blue-300">
          Este documento descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a
          Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </div>

        {/* Seções */}
        <div className="space-y-8 text-sm leading-relaxed">

          <Section icon={Eye} title="1. Quais dados coletamos">
            <p>Coletamos apenas os dados estritamente necessários para operação do sistema:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-400">
              <li><strong className="text-slate-300">Dados de cadastro:</strong> nome, e-mail e senha (hash) fornecidos no registro.</li>
              <li><strong className="text-slate-300">Dados operacionais:</strong> ordens de serviço, equipamentos, histórico de manutenção e relatórios inseridos pelos usuários da empresa.</li>
              <li><strong className="text-slate-300">Dados técnicos:</strong> endereço IP, tipo de navegador e timestamps de acesso para fins de segurança e monitoramento.</li>
              <li><strong className="text-slate-300">Dados de faturamento:</strong> CNPJ ou CPF para emissão de notas fiscais, quando aplicável.</li>
            </ul>
            <p className="mt-3 text-slate-500">Não coletamos dados sensíveis conforme definido pelo art. 5º, II da LGPD.</p>
          </Section>

          <Section icon={Lock} title="2. Como usamos seus dados">
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-400">
              <li>Autenticação e controle de acesso ao sistema.</li>
              <li>Prestação dos serviços contratados (gestão de manutenção industrial).</li>
              <li>Envio de notificações operacionais (alertas de OS, vencimento de planos).</li>
              <li>Suporte técnico quando solicitado.</li>
              <li>Cumprimento de obrigações legais e fiscais.</li>
            </ul>
            <p className="mt-3 text-slate-500">
              <strong className="text-slate-400">Jamais</strong> vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais ou publicitários.
            </p>
          </Section>

          <Section icon={Shield} title="3. Armazenamento e segurança">
            <p>Os dados são armazenados em infraestrutura Supabase (PostgreSQL) com:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-400">
              <li>Criptografia em trânsito via TLS 1.2+.</li>
              <li>Criptografia em repouso nos volumes de dados.</li>
              <li>Isolamento completo por empresa (multi-tenancy com Row Level Security).</li>
              <li>Backups automáticos diários com retenção mínima de 7 dias.</li>
              <li>Acesso administrativo restrito e auditado.</li>
            </ul>
            <p className="mt-3 text-slate-500">
              Servidores localizados no Brasil ou com adequação às normas de transferência internacional de dados da LGPD.
            </p>
          </Section>

          <Section icon={Trash2} title="4. Seus direitos como titular">
            <p>Conforme a LGPD, você tem direito a:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {[
                ['Confirmação', 'Confirmar se tratamos seus dados'],
                ['Acesso', 'Receber cópia dos seus dados'],
                ['Correção', 'Corrigir dados incompletos ou desatualizados'],
                ['Eliminação', 'Solicitar exclusão de dados desnecessários'],
                ['Portabilidade', 'Receber seus dados em formato estruturado'],
                ['Revogação', 'Revogar consentimentos fornecidos'],
              ].map(([title, desc]) => (
                <div key={title} className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2">
                  <div className="text-slate-200 font-medium text-xs mb-0.5">{title}</div>
                  <div className="text-slate-500 text-xs">{desc}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-slate-500">
              Para exercer esses direitos, entre em contato pelo e-mail abaixo. Respondemos em até 15 dias úteis.
            </p>
          </Section>

          <Section icon={Mail} title="5. Contato e DPO">
            <p>Responsável pelo tratamento de dados (controlador):</p>
            <div className="mt-3 bg-slate-800/40 border border-slate-700/40 rounded-lg p-4 space-y-1">
              <div className="text-slate-200 font-semibold">GPPIS Tecnologia</div>
              <div className="text-slate-400 text-xs">E-mail: <a href="mailto:privacidade@gppis.com.br" className="text-blue-400 hover:underline">privacidade@gppis.com.br</a></div>
              <div className="text-slate-400 text-xs">Site: <a href="https://gppis.com.br" className="text-blue-400 hover:underline">gppis.com.br</a></div>
            </div>
          </Section>

          <div className="border-t border-slate-800/60 pt-6">
            <p className="text-slate-600 text-xs">
              Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos usuários ativos sobre mudanças
              relevantes por e-mail. O uso continuado do sistema após alterações implica aceitação dos novos termos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="pl-6.5 text-slate-400">{children}</div>
    </div>
  );
}
