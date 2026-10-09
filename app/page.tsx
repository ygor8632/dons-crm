'use client';

import Link from "next/link";
import { ArrowRight, BarChart3, Users, Zap, ChevronRight, CheckCircle2, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FFFE] font-sans selection:bg-[#345B63] selection:text-white overflow-x-hidden scroll-smooth">
      
      {/* NAVEGAÇÃO (Header) - Efeito Glassmorphism */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#F8FFFE]/70 backdrop-blur-xl border-b border-[#D4ECDD]/30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#112031] to-[#345B63] text-white font-bold text-2xl shadow-lg group-hover:scale-105 transition-transform duration-300">
              D
            </div>
            <span className="text-2xl font-extrabold text-[#112031] tracking-tight group-hover:text-[#345B63] transition-colors">
              Dons CRM
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-10 font-semibold text-[#152D35]/70">
            <Link href="#funcionalidades" className="hover:text-[#112031] transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#345B63] hover:after:w-full after:transition-all after:duration-300">Funcionalidades</Link>
            <Link href="#planos" className="hover:text-[#112031] transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#345B63] hover:after:w-full after:transition-all after:duration-300">Planos</Link>
          </nav>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden md:block font-bold text-[#112031] hover:text-[#345B63] transition-colors">
              Entrar
            </Link>
            <Link 
              href="/login" 
              className="bg-[#112031] hover:bg-[#345B63] text-white px-7 py-3 rounded-full font-bold transition-all duration-300 shadow-[0_4px_20px_rgba(17,32,49,0.2)] hover:shadow-[0_8px_30px_rgba(52,91,99,0.3)] hover:-translate-y-1 flex items-center gap-2 group"
            >
              Começar Grátis
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION (Secção Principal) */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#D4ECDD] to-transparent rounded-full blur-[100px] opacity-60 -z-10"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#345B63] rounded-full blur-[150px] opacity-20 -z-10 animate-pulse"></div>
        <div className="absolute top-60 left-10 w-72 h-72 bg-[#112031] rounded-full blur-[150px] opacity-10 -z-10"></div>
        
        <div className="max-w-5xl mx-auto text-center z-10 relative">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-[#D4ECDD] text-[#345B63] text-sm font-bold mb-10 shadow-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#345B63] animate-pulse"></span>
            O CRM 100% focado em fechar negócios
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black text-[#112031] tracking-tight leading-[1.05] mb-8">
            Centralize leads. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#345B63] to-[#152D35]">
              Multiplique vendas.
            </span>
          </h1>
          
          <p className="text-xl text-[#152D35]/80 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            A plataforma definitiva para gerir empresas, organizar o funil de atendimento e transformar contactos de WhatsApp em clientes fiéis.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link 
              href="/login" 
              className="w-full sm:w-auto bg-[#112031] hover:bg-[#152D35] text-white text-lg px-10 py-5 rounded-full font-bold transition-all duration-300 shadow-[0_10px_40px_rgba(17,32,49,0.3)] hover:shadow-[0_15px_50px_rgba(17,32,49,0.4)] hover:-translate-y-2 flex items-center justify-center gap-3 group"
            >
              Criar a minha conta
              <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link 
              href="#funcionalidades" 
              className="w-full sm:w-auto bg-white/50 backdrop-blur-sm border-2 border-[#D4ECDD] hover:border-[#345B63] hover:bg-white text-[#112031] text-lg px-10 py-5 rounded-full font-bold transition-all duration-300 flex items-center justify-center"
            >
              Ver como funciona
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-4 text-sm font-bold text-[#152D35]/60">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-200"></div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-300"></div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-400"></div>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex text-yellow-400">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <span>Mais de 500 vendedores ativos</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview (Mockup Rico) */}
        <div className="mt-24 max-w-6xl mx-auto relative group perspective-[2000px]">
          <div className="rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl p-3 md:p-5 shadow-[0_20px_80px_rgba(17,32,49,0.1)] relative z-10 transition-transform duration-700 ease-out hover:scale-[1.02]">
            <div className="rounded-2xl border border-gray-100 bg-[#F8FFFE] overflow-hidden aspect-[16/9] flex shadow-inner relative">
              <div className="w-1/5 bg-[#112031] h-full hidden md:flex flex-col p-6 border-r border-[#152D35]">
                <div className="w-12 h-12 bg-[#345B63] rounded-full mb-10 opacity-80"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-[#152D35] rounded-md w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded-md w-full"></div>
                  <div className="h-4 bg-white/10 rounded-md w-5/6"></div>
                </div>
              </div>
              <div className="flex-1 p-6 md:p-10 bg-[#F8FFFE] flex flex-col gap-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4ECDD] rounded-full blur-[80px] opacity-40"></div>
                <div className="flex justify-between items-center">
                  <div className="h-8 bg-gray-200 rounded-md w-48"></div>
                  <div className="h-10 bg-[#345B63] rounded-xl w-32"></div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-32 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-end">
                    <div className="h-10 bg-gray-100 rounded-lg w-16"></div>
                  </div>
                  <div className="h-32 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-end">
                    <div className="h-10 bg-[#D4ECDD] rounded-lg w-24"></div>
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="space-y-4 mt-4">
                    <div className="h-12 bg-gray-50 rounded-xl w-full"></div>
                    <div className="h-12 bg-gray-50 rounded-xl w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS / SOCIAL PROOF */}
      <section className="py-10 border-y border-[#D4ECDD]/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-8">Empresas que confiam na nossa tecnologia</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-2xl font-black text-[#112031]">AcmeCorp</div>
            <div className="text-2xl font-black text-[#112031]">GlobalSales</div>
            <div className="text-2xl font-black text-[#112031]">TechNova</div>
            <div className="text-2xl font-black text-[#112031]">PrimeLeads</div>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES PREMIUM */}
      <section id="funcionalidades" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-[#112031] mb-6">Poderoso. Simples. <span className="text-[#345B63]">Inteligente.</span></h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-xl font-medium">Tudo o que a sua equipa precisa para focar-se no fecho de vendas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-10 rounded-[2rem] bg-white border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4ECDD] rounded-bl-[100px] -z-10 transition-all duration-500 group-hover:scale-150"></div>
              <div className="h-16 w-16 rounded-2xl bg-[#F8FFFE] border border-[#D4ECDD] text-[#345B63] flex items-center justify-center mb-8 group-hover:bg-[#345B63] group-hover:text-white transition-colors duration-500">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-bold text-[#112031] mb-4">Gestão Multi-Empresa</h3>
              <p className="text-gray-600 leading-relaxed text-lg">Crie espaços isolados para clientes. Um painel central (Superadmin) para dominar todo o negócio.</p>
            </div>

            <div className="p-10 rounded-[2rem] bg-[#112031] shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden transform md:-translate-y-4">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#345B63] rounded-full blur-[80px] opacity-40 transition-all duration-500 group-hover:opacity-70"></div>
              <div className="h-16 w-16 rounded-2xl bg-[#345B63] border border-[#152D35] text-white flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 transition-transform duration-500">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Webhooks Automáticos</h3>
              <p className="text-[#D4ECDD] opacity-90 leading-relaxed text-lg relative z-10">Ligue as suas campanhas de Marketing diretamente ao CRM. As leads caem em tempo real no painel.</p>
            </div>

            <div className="p-10 rounded-[2rem] bg-white border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#F8FFFE] border-l border-t border-[#D4ECDD] rounded-tl-[100px] -z-10 transition-all duration-500 group-hover:scale-150"></div>
              <div className="h-16 w-16 rounded-2xl bg-[#F8FFFE] border border-[#D4ECDD] text-[#345B63] flex items-center justify-center mb-8 group-hover:bg-[#345B63] group-hover:text-white transition-colors duration-500">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-[#112031] mb-4">Dados Inteligentes</h3>
              <p className="text-gray-600 leading-relaxed text-lg">Métricas visuais e claras. Saiba qual a origem que traz mais leads e o estado do seu funil.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS E PREÇOS */}
      <section id="planos" className="py-32 bg-white relative border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-[#112031] mb-6">Planos à medida</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-xl font-medium">Transparência total. Sem taxas escondidas. Cancele quando quiser.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-10 rounded-[2.5rem] bg-[#F8FFFE] border-2 border-[#D4ECDD] transition-all hover:border-[#345B63] flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#112031] mb-2">Plano Basic</h3>
                <p className="text-gray-500">Ideal para negócios em fase inicial.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-[#112031]">€29</span>
                <span className="text-gray-500 font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-[#112031] font-medium"><CheckCircle2 className="text-[#345B63]" size={20} /> Até 500 Leads mensais</li>
                <li className="flex items-center gap-3 text-[#112031] font-medium"><CheckCircle2 className="text-[#345B63]" size={20} /> 1 Utilizador (Tenant)</li>
                <li className="flex items-center gap-3 text-[#112031] font-medium"><CheckCircle2 className="text-[#345B63]" size={20} /> Suporte por E-mail</li>
              </ul>
              <Link href="/login" className="w-full py-4 rounded-xl font-bold border-2 border-[#112031] text-[#112031] hover:bg-[#112031] hover:text-white transition-colors text-center inline-block">
                Começar Basic
              </Link>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-[#112031] border-2 border-[#345B63] relative shadow-2xl flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 right-10 transform -translate-y-1/2 bg-[#345B63] text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                Mais Popular
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Plano Master</h3>
                <p className="text-[#D4ECDD]">Para empresas que precisam de escalar.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-white">€89</span>
                <span className="text-[#D4ECDD] font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-white font-medium"><CheckCircle2 className="text-[#D4ECDD]" size={20} /> Leads Ilimitadas</li>
                <li className="flex items-center gap-3 text-white font-medium"><CheckCircle2 className="text-[#D4ECDD]" size={20} /> Múltiplos Tenants / Filiais</li>
                <li className="flex items-center gap-3 text-white font-medium"><CheckCircle2 className="text-[#D4ECDD]" size={20} /> Webhooks Premium</li>
                <li className="flex items-center gap-3 text-white font-medium"><CheckCircle2 className="text-[#D4ECDD]" size={20} /> Suporte Prioritário 24/7</li>
              </ul>
              <Link href="/login" className="w-full py-4 rounded-xl font-bold bg-[#345B63] hover:bg-[#D4ECDD] hover:text-[#112031] text-white transition-colors text-center inline-block">
                Escolher Master
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL DE ALTO IMPACTO */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto rounded-[3rem] bg-[#112031] p-12 md:p-24 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(17,32,49,0.4)]">
          <div className="absolute inset-0 bg-white opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-[#345B63] to-[#152D35] rounded-full blur-[100px] opacity-50"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
              Acelere as suas vendas hoje.
            </h2>
            <p className="text-xl text-[#D4ECDD] mb-12 max-w-2xl mx-auto font-medium">
              Centralize tudo e foque-se no que importa: faturar.
            </p>
            <Link 
              href="/login" 
              className="inline-flex bg-white hover:bg-[#D4ECDD] text-[#112031] text-xl px-12 py-6 rounded-full font-black transition-all duration-300 items-center gap-3 hover:scale-105 shadow-2xl"
            >
              Criar Conta Gratuita
              <ArrowRight size={24} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#F8FFFE] border-t border-[#D4ECDD] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#112031] text-white font-bold text-xl">
                  D
                </div>
                <span className="text-2xl font-extrabold text-[#112031]">Dons CRM</span>
              </div>
              <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
                A ferramenta desenhada para empresas que levam as vendas a sério.
              </p>
            </div>
          </div>
          
          <div className="border-t border-[#D4ECDD] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 font-medium text-sm">
              © {new Date().getFullYear()} DonsTech. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-[#112031]">
              Feito com <span className="text-[#345B63]">❤</span> para equipas de vendas.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}