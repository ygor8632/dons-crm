'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Users, Zap, Shield } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FFFE] font-sans flex flex-col">
      
      {/* HEADER ESCURO */}
      <header className="w-full py-6 px-8 flex items-center justify-between bg-[#0A1118] border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img 
            src="https://donstech.com.br/wp-content/uploads/2026/04/6cb92590-b19d-4961-a672-70eb454dd2411-1-e1776969200237.png" 
            alt="DonsTech Logo" 
            className="h-8 object-contain brightness-0 invert" 
          />
          <span className="text-xl font-extrabold text-white ml-2 border-l-2 border-white/20 pl-4">CRM</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/login')}
            className="text-sm font-bold text-gray-300 hover:text-white transition-colors hidden sm:block"
          >
            Já tem conta?
          </button>
          <Button 
            onClick={() => router.push('/login')}
            className="bg-[#4361EE] hover:bg-[#3A56D4] text-white rounded-full px-6 shadow-md border-none"
          >
            Acessar Painel
          </Button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-[#4361EE]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-[#345B63]/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
            <Zap size={14} /> O motor de vendas da sua empresa
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-[#112031] tracking-tight mb-8 leading-[1.1]">
            Acelere suas vendas com <span className="text-[#4361EE]">inteligência.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl leading-relaxed">
            O CRM desenvolvido pela DonsTech para centralizar contatos, automatizar oportunidades via webhooks e oferecer visibilidade total sobre o seu funil de vendas.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Button 
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto h-14 bg-[#112031] hover:bg-[#152D35] text-white rounded-xl px-8 text-lg font-bold transition-all shadow-xl shadow-[#112031]/10 flex items-center justify-center gap-2"
            >
              Começar a usar agora <ArrowRight size={20} />
            </Button>
            <Button 
              variant="outline"
              className="w-full sm:w-auto h-14 border-gray-200 text-[#112031] rounded-xl px-8 text-lg font-bold hover:bg-gray-50 bg-white"
            >
              Conhecer a DonsTech
            </Button>
          </div>
        </div>

        {/* FEATURES (Blocos de Benefícios) */}
        <div className="grid sm:grid-cols-3 gap-8 mt-24 max-w-5xl w-full z-10 text-left">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-[#4361EE] rounded-2xl flex items-center justify-center mb-6">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#112031] mb-3">Gestão Centralizada</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Diga adeus às planilhas confusas. Cada cliente, cada contato e cada anotação organizados em uma interface limpa e eficiente.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#112031] mb-3">Métricas em Tempo Real</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Saiba exatamente como está a saúde do seu negócio. Nosso painel de operações mostra os seus KPIs sem complexidade.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#112031] mb-3">Arquitetura Multi-Tenant</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Desenhado como um verdadeiro SaaS. Dados totalmente isolados e seguros para você e para os seus clientes de forma robusta.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 text-center text-gray-400 text-sm border-t border-gray-100 bg-white">
        &copy; {new Date().getFullYear()} Desenvolvido com excelência por <strong className="text-[#112031]">DonsTech</strong>. Todos os direitos reservados.
      </footer>
    </div>
  );
}