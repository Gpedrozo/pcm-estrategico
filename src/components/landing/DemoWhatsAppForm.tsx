import { useState } from 'react';
import { MessageCircle, ArrowRight, CheckCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '5546991106129';

export function DemoWhatsAppForm() {
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [segmento, setSegmento] = useState('');
  const [maquinas, setMaquinas] = useState('');
  const [sent, setSent] = useState(false);

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const msg = encodeURIComponent(
      `Olá! Gostaria de solicitar uma demonstração guiada do PCM Estratégico.\n\n` +
      `👤 Nome: ${nome}\n` +
      `🏢 Empresa: ${empresa}\n` +
      `📱 WhatsApp: ${whatsapp}\n` +
      `🏭 Segmento: ${segmento || 'Não informado'}\n` +
      `⚙️ Nº de máquinas: ${maquinas || 'Não informado'}\n\n` +
      `Aguardo o contato para agendar a demonstração!`
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h4 className="text-white font-semibold text-lg">WhatsApp aberto!</h4>
          <p className="text-slate-400 text-sm mt-1 max-w-xs">
            Sua mensagem foi preparada. Envie pelo WhatsApp e nossa equipe responde em até 2h.
          </p>
        </div>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Enviar novamente
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Seu nome *"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          className="bg-slate-800/60 border border-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all"
        />
        <input
          type="text"
          placeholder="Empresa *"
          value={empresa}
          onChange={e => setEmpresa(e.target.value)}
          required
          className="bg-slate-800/60 border border-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="tel"
          placeholder="WhatsApp *"
          value={whatsapp}
          onChange={e => setWhatsapp(formatPhone(e.target.value))}
          required
          className="bg-slate-800/60 border border-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all"
        />
        <select
          value={segmento}
          onChange={e => setSegmento(e.target.value)}
          className="bg-slate-800/60 border border-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
        >
          <option value="" className="bg-slate-800 text-slate-400">Segmento (opcional)</option>
          <option value="Metalúrgico" className="bg-slate-800">Metalúrgico</option>
          <option value="Alimentício" className="bg-slate-800">Alimentício</option>
          <option value="Têxtil" className="bg-slate-800">Têxtil</option>
          <option value="Químico/Farmacêutico" className="bg-slate-800">Químico / Farmacêutico</option>
          <option value="Papel e Celulose" className="bg-slate-800">Papel e Celulose</option>
          <option value="Mineração" className="bg-slate-800">Mineração</option>
          <option value="Automotivo" className="bg-slate-800">Automotivo</option>
          <option value="Energia/Utilidades" className="bg-slate-800">Energia / Utilidades</option>
          <option value="Outro" className="bg-slate-800">Outro</option>
        </select>
      </div>

      <select
        value={maquinas}
        onChange={e => setMaquinas(e.target.value)}
        className="w-full bg-slate-800/60 border border-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
      >
        <option value="" className="bg-slate-800 text-slate-400">Quantas máquinas/equipamentos? (opcional)</option>
        <option value="1-20" className="bg-slate-800">1 a 20</option>
        <option value="21-50" className="bg-slate-800">21 a 50</option>
        <option value="51-100" className="bg-slate-800">51 a 100</option>
        <option value="100+" className="bg-slate-800">Mais de 100</option>
      </select>

      <button
        type="submit"
        disabled={!nome || !empresa || !whatsapp}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl px-6 py-4 transition-all duration-200 text-sm shadow-lg shadow-green-500/20"
      >
        <MessageCircle className="w-4 h-4" />
        Solicitar demonstração via WhatsApp
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-center text-slate-500 text-[11px]">
        Nossa equipe responde em até 2h em horário comercial.
      </p>
    </form>
  );
}
