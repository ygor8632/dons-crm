'use client';

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Columns, Palette, Zap, ShieldCheck, ArrowRight, CheckCircle2, ChevronDown, PlayCircle } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-[#5483B3] selection:text-white" style={{ backgroundColor: '#021024', color: '#ffffff' }}>
      
      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(2, 16, 36, 0.8)', borderColor: '#052659' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#052659' }}>
              <Sparkles size={18} className="text-[#C1E8FF]" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">Dons CRM</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/login')} className="text-xs font-semibold hover:text-[#C1E8FF] transition-colors" style={{ color: '#7DA0CA' }}>
              Área do Cliente
            </button>
            <Button onClick={() => router.push('/demo')} className="text-white text-xs font-bold rounded-xl px-4 py-2 shadow-lg hover:-translate-y-0.5 transition-transform" style={{ backgroundColor: '#5483B3' }}>
              Ver Demonstração
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 overflow-hidden text-center">
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-[500px] h-[500px] rounded-full blur-[150px]" style={{ backgroundColor: '#052659' }}></div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border" style={{ backgroundColor: '#052659', borderColor: '#5483B3', color: '#C1E8FF' }}>
            <Sparkles size={14} /> CRM Exclusivo para Operações de Alta Performance
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white">
            O controle total das suas vendas num <span style={{ color: '#5483B3' }}>único painel</span>.
          </h1>
          
          <p className="text-sm md:text-base max-w-2xl mx-auto" style={{ color: '#7DA0CA' }}>
            Acesso sob medida. Esqueça sistemas complexos. A nossa plataforma é implementada especificamente para a sua empresa, garantindo segurança e adoção imediata da equipa.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => router.push('/demo')} className="w-full sm:w-auto text-white text-xs font-bold rounded-xl px-6 py-6 shadow-xl hover:-translate-y-1 transition-all" style={{ backgroundColor: '#5483B3' }}>
              <PlayCircle size={18} className="mr-2" /> Explorar Ambiente Demo
            </Button>
            <Button variant="outline" className="w-full sm:w-auto text-xs font-bold rounded-xl px-6 py-6 border transition-colors hover:bg-white/5" style={{ borderColor: '#052659', color: '#C1E8FF', backgroundColor: 'transparent' }}>
              Falar com um Consultor
            </Button>
          </div>

          {/* MOCKUP PREVIEW */}
          <div className="mt-16 p-2 rounded-3xl border shadow-2xl max-w-5xl mx-auto" style={{ backgroundColor: '#052659', borderColor: '#5483B3' }}>
            <div className="rounded-2xl p-6 text-left border" style={{ backgroundColor: '#021024', borderColor: '#052659' }}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: '#052659' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-[11px] font-mono" style={{ color: '#7DA0CA' }}>demo.donscrm.com</span>
              </div>
              <div className="grid grid-cols-3 gap-4 opacity-80 pointer-events-none">
                {['Aguardando Contato', 'Em Atendimento', 'Venda Concluída'].map((col, idx) => (
                  <div key={idx} className="p-4 rounded-xl border" style={{ backgroundColor: '#052659', borderColor: '#5483B3' }}>
                    <div className="font-bold text-xs mb-3 text-white">{col}</div>
                    <div className="p-3 rounded-lg border mb-2 text-xs font-semibold" style={{ backgroundColor: '#021024', borderColor: '#052659', color: '#C1E8FF' }}>Lead de Demonstração 0{idx+1}</div>
                    <div className="p-3 rounded-lg border text-xs font-semibold" style={{ backgroundColor: '#021024', borderColor: '#052659', color: '#C1E8FF' }}>Empresa Parceira 0{idx+1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS PRINCIPAIS */}
      <section className="py-24 px-6 border-t" style={{ borderColor: '#052659', backgroundColor: '#021024' }}>
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Por que um CRM sob medida?</h2>
            <p className="text-xs md:text-sm max-w-2xl mx-auto" style={{ color: '#7DA0CA' }}>Diferente das ferramentas de mercado, nós implementamos e configuramos o seu ambiente antes de entregar as chaves.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Implementação Guiada", desc: "Não perca tempo a configurar. Entregamos o sistema pronto com as etapas do seu funil e utilizadores cadastrados.", icon: ShieldCheck },
              { title: "Gestão White-Label", desc: "Personalize com o logotipo e as cores da sua empresa. A plataforma torna-se uma extensão da sua marca.", icon: Palette },
              { title: "Sem Limites de Acesso", desc: "Testemunhe a velocidade de um sistema limpo, construído com tecnologia de ponta e focada no essencial.", icon: Zap }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl border transition-all hover:-translate-y-1" style={{ backgroundColor: '#052659', borderColor: '#5483B3' }}>
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: '#021024', color: '#C1E8FF' }}>
                    <Icon size={18} />
                  </div>
                  <h3 className="font-bold text-sm mb-2 text-white">{item.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#7DA0CA' }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t text-center text-xs" style={{ borderColor: '#052659', backgroundColor: '#021024' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#5483B3' }}>D</div>
            <span className="font-bold" style={{ color: '#7DA0CA' }}>Dons CRM &copy; 2026. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-6">
            <button onClick={() => router.push('/demo')} className="font-bold hover:text-white transition-colors" style={{ color: '#C1E8FF' }}>Acessar Demo</button>
            <button onClick={() => router.push('/login')} className="font-bold hover:text-white transition-colors" style={{ color: '#C1E8FF' }}>Área do Cliente</button>
          </div>
        </div>
      </footer>

    </div>
  );
}