import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Users, AlertTriangle, Ban, CreditCard, Mail } from 'lucide-react';

export default function Termos() {
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
          <span className="text-slate-300 text-sm font-medium">Termos de Uso</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Título */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Termos de Uso</h1>
            <p className="text-slate-500 text-sm">Última atualização: janeiro de 2026 · GPPIS Tecnologia</p>
          </div>
        </div>

        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3 mb-8 text-sm text-purple-300">
          Ao utilizar o PCM Estratégico, você concorda com estes Termos de Uso. Leia com atenção antes de prosseguir.
        </div>

        {/* Seções */}
        <div className="space-y-8 text-sm leading-relaxed">

          <Section icon={FileText} title="1. O serviço">
            <p>
              O <strong className="text-slate-300">PCM Estratégico</strong> é um sistema SaaS (Software as a Service) de gestão de manutenção industrial
              desenvolvido e operado pela <strong className="text-slate-300">GPPIS Tecnologia</strong>.
            </p>
            <p className="mt-3">
              O serviço é fornecido via internet, acessível por navegadores modernos e aplicativo móvel. Não há instalação
              de software local — todo processamento ocorre em servidores seguros gerenciados pela GPPIS.
            </p>
          </Section>

          <Section icon={Users} title="2. Cadastro e acesso">
            <p>Para utilizar o sistema, é necessário:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-400">
              <li>Ter capacidade legal para contratar (ser maior de 18 anos ou representante legal de empresa).</li>
              <li>Fornecer informações verídicas no cadastro.</li>
              <li>Manter as credenciais de acesso em sigilo e não compartilhá-las.</li>
              <li>Notificar imediatamente em caso de acesso não autorizado suspeito.</li>
            </ul>
            <p className="mt-3 text-slate-500">
              Cada empresa tem acesso isolado aos seus próprios dados. Usuários de uma empresa nunca têm acesso
              a dados de outras empresas cadastradas na plataforma.
            </p>
          </Section>

          <Section icon={CreditCard} title="3. Trial gratuito e planos">
            <p>
              O <strong className="text-slate-300">período de trial de 30 dias</strong> é gratuito e sem necessidade de cartão de crédito.
              Durante o trial, todos os módulos ficam disponíveis para uso com dados reais.
            </p>
            <p className="mt-3">
              Após o trial, é possível contratar um plano pago conforme negociação com a GPPIS. Os valores e condições
              são definidos de acordo com a realidade de cada empresa — número de usuários, plantas e módulos utilizados.
            </p>
            <p className="mt-3 text-slate-500">
              Dados inseridos durante o trial são preservados na contratação do plano. Em caso de não contratação,
              os dados permanecem disponíveis para exportação por 30 dias adicionais após o encerramento do trial.
            </p>
          </Section>

          <Section icon={Ban} title="4. Uso proibido">
            <p>É expressamente proibido:</p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-400">
              <li>Utilizar o sistema para fins ilegais ou fraudulentos.</li>
              <li>Tentar acessar dados de outras empresas ou realizar engenharia reversa.</li>
              <li>Sobrecarregar intencionalmente a infraestrutura (ataques DoS, scraping agressivo).</li>
              <li>Inserir dados falsos ou maliciosos que possam comprometer a integridade do sistema.</li>
              <li>Revender, sublicenciar ou transferir o acesso a terceiros não autorizados.</li>
              <li>Compartilhar credenciais de acesso entre múltiplas pessoas não cadastradas.</li>
            </ul>
            <p className="mt-3 text-slate-500">
              O descumprimento pode resultar em suspensão ou encerramento imediato da conta, sem reembolso.
            </p>
          </Section>

          <Section icon={AlertTriangle} title="5. Disponibilidade e limitação de responsabilidade">
            <p>
              A GPPIS se esforça para manter disponibilidade de <strong className="text-slate-300">99,9%</strong> ao mês,
              mas não garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência.
            </p>
            <p className="mt-3">
              A GPPIS não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-3 text-slate-400">
              <li>Decisões operacionais tomadas com base nos dados do sistema.</li>
              <li>Falhas decorrentes de infraestrutura de terceiros (internet, energia, etc.).</li>
              <li>Perda de dados causada por uso inadequado do sistema pelo cliente.</li>
            </ul>
          </Section>

          <Section icon={FileText} title="6. Propriedade intelectual">
            <p>
              Todo o código-fonte, interfaces, algoritmos e metodologias do PCM Estratégico são propriedade exclusiva
              da GPPIS Tecnologia, protegidos por direito autoral.
            </p>
            <p className="mt-3 text-slate-500">
              Os dados inseridos pelos clientes pertencem ao próprio cliente. A GPPIS não reivindica propriedade
              sobre os dados operacionais das empresas usuárias.
            </p>
          </Section>

          <Section icon={Mail} title="7. Contato e foro">
            <p>Dúvidas sobre estes termos:</p>
            <div className="mt-3 bg-slate-800/40 border border-slate-700/40 rounded-lg p-4 space-y-1">
              <div className="text-slate-200 font-semibold">GPPIS Tecnologia</div>
              <div className="text-slate-400 text-xs">E-mail: <a href="mailto:contato@gppis.com.br" className="text-purple-400 hover:underline">contato@gppis.com.br</a></div>
              <div className="text-slate-400 text-xs">Foro eleito: Comarca de Curitiba — PR, Brasil.</div>
            </div>
          </Section>

          <div className="border-t border-slate-800/60 pt-6">
            <p className="text-slate-600 text-xs">
              Estes Termos de Uso podem ser atualizados periodicamente. O uso continuado após alterações implica
              aceitação dos novos termos. Para dúvidas, entre em contato antes de continuar usando o sistema.
            </p>
            <p className="mt-2 text-slate-700 text-xs">
              Veja também nossa{' '}
              <Link to="/privacidade" className="text-blue-600 hover:text-blue-400 underline-offset-2 hover:underline">
                Política de Privacidade
              </Link>.
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
        <Icon className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="pl-6.5 text-slate-400">{children}</div>
    </div>
  );
}
