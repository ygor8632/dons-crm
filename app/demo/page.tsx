'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Users, Inbox, Settings, LogOut, Phone, Plus, Trash2, Search, List, Columns, UserPlus, Plug, Copy, Check, Palette, Upload, Menu, X, Sun, Moon, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

// DADOS MOCKADOS (FALSOS) PARA A DEMONSTRAÇÃO
const MOCK_ETAPAS = [
  { id: '1', nome: 'Aguardando Contato', cor: '#f59e0b', ordem: 1 },
  { id: '2', nome: 'Em Atendimento', cor: '#5483B3', ordem: 2 },
  { id: '3', nome: 'Venda Concluída', cor: '#10b981', ordem: 3 }
];

const MOCK_LEADS = [
  { id: 'l1', nome: 'TechCorp Solutions', email: 'contato@techcorp.com', telefone: '11999999999', origem: 'Google Ads', status: 'Aguardando Contato', valor: 15000, created_at: new Date().toISOString() },
  { id: 'l2', nome: 'Indústria Alpha', email: 'vendas@alpha.com', telefone: '11888888888', origem: 'Indicação', status: 'Em Atendimento', valor: 45000, created_at: new Date().toISOString() },
  { id: 'l3', nome: 'Agência Criativa', email: 'ola@criativa.com', telefone: '11777777777', origem: 'Instagram', status: 'Venda Concluída', valor: 8500, created_at: new Date().toISOString() },
  { id: 'l4', nome: 'Construtora Base', email: 'comercial@base.com', telefone: '11666666666', origem: 'LinkedIn', status: 'Aguardando Contato', valor: 120000, created_at: new Date().toISOString() }
];

const MOCK_EQUIPE = [
  { id: 'u1', nome: 'João Diretor', email: 'joao@empresa.com', role: 'admin' },
  { id: 'u2', nome: 'Maria Vendas', email: 'maria@empresa.com', role: 'vendedor' }
];

export default function DemoDashboard() {
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); 

  // White-label Demo
  const [corPrimaria, setCorPrimaria] = useState('#5483B3');
  const [nomeEmpresa, setNomeEmpresa] = useState('Minha Empresa Demo');
  
  const [etapasFunil, setEtapasFunil] = useState(MOCK_ETAPAS);
  const [minhasLeads, setMinhasLeads] = useState(MOCK_LEADS);
  const [equipe, setEquipe] = useState(MOCK_EQUIPE);
  
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'oportunidades' | 'configuracoes'>('visao_geral');
  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'kanban'>('kanban');
  
  const [termoBusca, setTermoBusca] = useState('');

  const [isNovaLeadModalOpen, setIsNovaLeadModalOpen] = useState(false);
  const [novaLead, setNovaLead] = useState({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', valor: '' });
  
  const fecharMenuMobile = () => setIsMobileMenuOpen(false);

  const mudarAba = (aba: any) => {
    setActiveTab(aba);
    fecharMenuMobile();
  };

  const handleCriarLead = (e: React.FormEvent) => {
    e.preventDefault();
    const novaLeadObj = {
      id: Math.random().toString(36).substr(2, 9),
      nome: novaLead.nome,
      email: novaLead.email,
      telefone: novaLead.telefone,
      origem: novaLead.origem,
      status: etapasFunil[0].nome,
      valor: parseFloat(novaLead.valor) || 0,
      created_at: new Date().toISOString()
    };
    
    setMinhasLeads([novaLeadObj, ...minhasLeads]);
    setIsNovaLeadModalOpen(false);
    setNovaLead({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', valor: '' });
  };

  const handleDropCard = (e: React.DragEvent, novoStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    setMinhasLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: novoStatus } : l));
  };

  const salvarConfiguracoes = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Configurações atualizadas neste ambiente de teste!");
  };

  const leadsFiltradas = minhasLeads.filter(lead => {
    return lead.nome.toLowerCase().includes(termoBusca.toLowerCase()) || (lead.email && lead.email.toLowerCase().includes(termoBusca.toLowerCase()));
  });

  const origensMap = minhasLeads.reduce((acc: any, lead) => {
    const orig = lead.origem || 'Outros';
    acc[orig] = (acc[orig] || 0) + 1;
    return acc;
  }, {});
  
  const dadosOrigem = Object.keys(origensMap).map(key => ({ origem: key, quantidade: origensMap[key] })).sort((a, b) => b.quantidade - a.quantidade);

  const dadosFunil = etapasFunil.map(etapa => ({
    name: etapa.nome,
    quantidade: minhasLeads.filter(l => l.status === etapa.nome).length,
    cor: etapa.cor
  })).filter(d => d.quantidade > 0);

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans text-xs md:text-sm transition-colors duration-300 ${darkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f4f7f9] text-zinc-900'}`}>
      
      {/* BARRA DE AVISO DA DEMO */}
      <div className="w-full bg-amber-500 text-amber-950 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-bold tracking-wide uppercase z-50">
        <AlertTriangle size={14} /> Modo de Demonstração - Os dados não são gravados no banco. Atualize a página para restaurar.
        <button onClick={() => router.push('/')} className="ml-4 underline hover:text-white">Voltar ao site</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* OVERLAY MOBILE */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity" onClick={fecharMenuMobile} />
        )}

        {/* SIDEBAR COM BASE NA PALETA ENVIADA */}
        <aside 
          className={`fixed md:relative z-50 h-full w-64 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          style={{ backgroundColor: '#021024', borderRight: '1px solid #052659', color: '#C1E8FF' }}
        >
          <button onClick={fecharMenuMobile} className="md:hidden absolute top-4 right-4 text-[#7DA0CA] hover:text-white p-2">
            <X size={20} />
          </button>

          <div className="p-6 flex flex-col items-center border-b border-[#052659]">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden mb-3 p-1 shadow-md shadow-black/40" style={{ backgroundColor: '#052659' }}>
              <span className="text-lg font-bold text-white">
                {nomeEmpresa ? nomeEmpresa.charAt(0).toUpperCase() : 'D'}
              </span>
            </div>
            <span className="font-bold text-xs truncate w-full text-center text-white">{nomeEmpresa}</span>
            <span className="text-[10px] mt-1 px-2.5 py-0.5 rounded-full font-mono tracking-wider" style={{ backgroundColor: '#052659', color: '#C1E8FF' }}>
              Administrador (Demo)
            </span>
          </div>

          <nav className="flex-1 px-3 space-y-2 py-6">
            {[
              { id: 'visao_geral', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'oportunidades', label: 'Oportunidades', icon: Inbox },
              { id: 'configuracoes', label: 'Configurações', icon: Settings }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button 
                  key={item.id}
                  onClick={() => mudarAba(item.id)} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all`}
                  style={{
                    backgroundColor: isActive ? (corPrimaria ? `${corPrimaria}40` : '#052659') : 'transparent',
                    color: isActive ? '#ffffff' : '#7DA0CA',
                    fontWeight: isActive ? '700' : '500'
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? '#ffffff' : '#7DA0CA' }} /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[#052659] space-y-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all font-medium hover:bg-[#052659]"
                style={{ backgroundColor: '#052659', color: '#C1E8FF', border: '1px solid #5483B3' }}
              >
                {darkMode ? <Sun size={14} className="text-[#C1E8FF]" /> : <Moon size={14} className="text-[#C1E8FF]" />}
                <span>{darkMode ? 'Claro' : 'Escuro'}</span>
              </button>

              <button onClick={() => router.push('/login')} title="Sair da Demo" className="p-2.5 rounded-xl transition-all hover:bg-red-500/20 text-red-400" style={{ backgroundColor: '#052659', border: '1px solid #5483B3' }}>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative md:rounded-tl-3xl md:border-l" style={{ borderColor: darkMode ? '#27272a' : '#e4e4e7', backgroundColor: darkMode ? '#09090b' : '#f4f7f9' }}>
          
          <header className={`md:hidden border-b p-4 flex items-center justify-between shadow-xs z-30 ${darkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center gap-3 font-semibold">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 rounded-lg"><Menu size={20} /></button>
              <span className="text-xs font-bold truncate max-w-[150px]" style={{ color: corPrimaria }}>{nomeEmpresa}</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border border-inherit">
              {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
            <div className="max-w-6xl mx-auto space-y-6 pb-10">
              
              {/* TELA 1: VISÃO GERAL */}
              {activeTab === 'visao_geral' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                  <div className="pb-2 border-b border-inherit flex items-center justify-between">
                    <div>
                      <h1 className="text-lg md:text-xl font-bold tracking-tight">Painel Operacional (Demo)</h1>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Acompanhe suas métricas comerciais simuladas.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Total de Leads</span>
                      <div className="mt-2 text-2xl font-extrabold">{minhasLeads.length}</div>
                    </div>
                    {etapasFunil.slice(0, 3).map(etapa => (
                      <div key={etapa.id} className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'}`}>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider truncate block pr-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`} title={etapa.nome}>{etapa.nome}</span>
                        <div className="mt-2 text-2xl font-extrabold">{minhasLeads.filter(l => l.status === etapa.nome).length}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                      <h3 className="font-bold text-xs md:text-sm mb-4">Distribuição do Funil</h3>
                      <div className="h-64 flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={dadosFunil} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="quantidade">
                              {dadosFunil.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.cor} />))}
                            </Pie>
                            <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px', backgroundColor: darkMode ? '#18181b' : '#fff', color: darkMode ? '#fff' : '#000'}} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                      <h3 className="font-bold text-xs md:text-sm mb-4">Leads por Origem</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dadosOrigem} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#27272a' : '#e2e8f0'} />
                            <XAxis dataKey="origem" interval={0} tick={{fontSize: 10, fill: darkMode ? '#a1a1aa' : '#64748b'}} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{fontSize: 10, fill: darkMode ? '#a1a1aa' : '#64748b'}} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{fill: darkMode ? '#27272a' : '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px', backgroundColor: darkMode ? '#18181b' : '#fff', color: darkMode ? '#fff' : '#000'}} />
                            <Bar dataKey="quantidade" fill={corPrimaria} radius={[4, 4, 0, 0]} maxBarSize={35} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TELA 2: OPORTUNIDADES */}
              {activeTab === 'oportunidades' && (
                 <div className="animate-in fade-in duration-300 space-y-4">
                 <div className={`p-4 md:p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                   <div>
                     <h1 className="text-base md:text-lg font-bold">Oportunidades (Ambiente Teste)</h1>
                     <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Arraste os cards para simular o uso do CRM.</p>
                   </div>
                   <div className="flex gap-2 w-full md:w-auto">
                     <Button onClick={() => setIsNovaLeadModalOpen(true)} style={{ backgroundColor: corPrimaria }} className="flex-1 md:flex-none text-white rounded-xl text-xs hover:opacity-90">
                       <Plus size={14} className="mr-1.5"/> Novo Contato Falso
                     </Button>
                   </div>
                 </div>

                 <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                   <div className="relative w-full md:w-72">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                     <Input placeholder="Pesquisar..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className={`pl-9 text-xs h-9 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'}`} />
                   </div>
                   <div className={`flex items-center w-full md:w-auto p-1 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                     <button onClick={() => setModoVisualizacao('tabela')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${modoVisualizacao === 'tabela' ? (darkMode ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-400'}`}><List size={14} className="inline mr-1" /> Lista</button>
                     <button onClick={() => setModoVisualizacao('kanban')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${modoVisualizacao === 'kanban' ? (darkMode ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-400'}`}><Columns size={14} className="inline mr-1" /> Kanban</button>
                   </div>
                 </div>

                 {modoVisualizacao === 'tabela' && (
                   <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                     <div className="overflow-x-auto">
                       <Table className="min-w-[600px]">
                         <TableHeader>
                           <TableRow className={`border-b ${darkMode ? 'border-zinc-800 hover:bg-transparent' : 'border-zinc-100 hover:bg-transparent'}`}>
                             <TableHead className="py-3 px-6 font-semibold text-[11px] uppercase tracking-wider">Cliente</TableHead>
                             <TableHead className="py-3 font-semibold text-[11px] uppercase tracking-wider">Etapa</TableHead>
                             <TableHead className="py-3 font-semibold text-[11px] uppercase tracking-wider">Valor</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {leadsFiltradas.map((lead) => {
                             const etapaLead = etapasFunil.find(e => e.nome === lead.status);
                             const corTag = etapaLead ? etapaLead.cor : corPrimaria;
                             return (
                             <TableRow key={lead.id} className={`border-b transition-colors ${darkMode ? 'border-zinc-800/50 hover:bg-zinc-800/30' : 'border-zinc-50 hover:bg-zinc-50/80'}`}>
                               <TableCell className="px-6 py-3.5">
                                 <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ backgroundColor: `${corPrimaria}20`, color: corPrimaria }}>
                                     {lead.nome.substring(0, 2).toUpperCase()}
                                   </div>
                                   <div>
                                     <div className="font-bold truncate max-w-[180px]" style={{ color: corPrimaria }}>{lead.nome}</div>
                                     <div className="text-[10px] text-zinc-400">{lead.telefone || lead.email}</div>
                                   </div>
                                 </div>
                               </TableCell>
                               <TableCell>
                                 <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${corTag}20`, color: corTag }}>
                                   {lead.status}
                                 </span>
                               </TableCell>
                               <TableCell className="font-medium text-xs">{formatarMoeda(lead.valor || 0)}</TableCell>
                             </TableRow>
                           )})}
                         </TableBody>
                       </Table>
                     </div>
                   </div>
                 )}

                 {modoVisualizacao === 'kanban' && (
                   <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                     {etapasFunil.map((etapa) => (
                       <div key={etapa.id} className={`rounded-2xl p-3 md:p-4 border min-h-[450px] w-[280px] md:w-[310px] flex-shrink-0 snap-start ${darkMode ? 'bg-[#121216]/60 border-zinc-800/80' : 'bg-zinc-100/50 border-zinc-200'}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropCard(e, etapa.nome)}>
                         <div className="flex items-center justify-between mb-3 border-b pb-2 border-inherit">
                           <h3 className="font-bold flex items-center gap-2 text-xs md:text-sm" style={{ color: etapa.cor }}>
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }}></div>
                             {etapa.nome}
                           </h3>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                             {leadsFiltradas.filter(l => l.status === etapa.nome).length}
                           </span>
                         </div>
                         <div className="space-y-2.5">
                           {leadsFiltradas.filter(l => l.status === etapa.nome).map(lead => (
                             <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)} className={`p-3.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${darkMode ? 'bg-[#18181b] border-zinc-700/60' : 'bg-white border-zinc-200 shadow-sm'}`}>
                               <div className="flex justify-between items-start mb-1">
                                 <div className="font-bold text-xs truncate pr-2">{lead.nome}</div>
                               </div>
                               <div className="text-[10px] text-zinc-400 mb-2 truncate">{lead.telefone || lead.email}</div>
                               {lead.valor > 0 && <div className="text-[10px] font-bold w-max px-2 py-0.5 rounded mb-2" style={{ backgroundColor: `${corPrimaria}15`, color: corPrimaria }}>{formatarMoeda(lead.valor)}</div>}
                               <div className="flex justify-between items-center pt-2 border-t border-inherit text-[9px] text-zinc-500 font-bold uppercase">{lead.origem || 'Direto'}</div>
                             </div>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
              )}

              {/* TELA 3: CONFIGURAÇÕES */}
              {activeTab === 'configuracoes' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                  <div className={`p-4 md:p-6 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                    <h1 className="text-base md:text-lg font-bold">Personalização (Sandbox)</h1>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Mude o nome ou a cor primária e veja a barra lateral alterar automaticamente.</p>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                      <h3 className="font-bold text-xs md:text-sm mb-4 flex items-center gap-2"><Palette size={16} style={{ color: corPrimaria }}/> Identidade Visual</h3>
                      <form onSubmit={salvarConfiguracoes} className="space-y-4">
                        <div>
                          <Label className="text-[10px] font-bold text-zinc-400 uppercase">Nome da Empresa Teste</Label>
                          <Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-zinc-400 uppercase">Cor Primária (Teste aqui!)</Label>
                          <div className="flex gap-2 mt-1">
                            <Input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-10 h-9 p-1 cursor-pointer rounded-xl bg-transparent border-0" />
                            <Input type="text" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className={`text-xs h-9 rounded-xl font-mono ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                          </div>
                        </div>
                        <Button type="submit" style={{ backgroundColor: corPrimaria }} className="text-white w-full text-xs rounded-xl h-9 mt-2">Testar Alterações</Button>
                      </form>
                    </div>

                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xs md:text-sm">Equipe Falsa</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableBody>
                            {equipe.map((membro) => (
                              <TableRow key={membro.id} className={`border-b ${darkMode ? 'border-zinc-800/60' : 'border-zinc-100'}`}>
                                <TableCell className="py-3">
                                  <div className="font-bold text-xs">{membro.nome || membro.email}</div>
                                  <div className="text-[10px] text-zinc-400">{membro.email}</div>
                                </TableCell>
                                <TableCell className="py-3 text-center">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-zinc-500/10 text-zinc-400">{membro.role}</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* MODAL NOVO CONTATO */}
      <Dialog open={isNovaLeadModalOpen} onOpenChange={setIsNovaLeadModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader><DialogTitle className="text-base font-bold">Novo Contato Falso</DialogTitle></DialogHeader>
          <form onSubmit={handleCriarLead} className="space-y-3 mt-2">
            <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Nome Completo *</Label><Input required value={novaLead.nome} onChange={(e) => setNovaLead({...novaLead, nome: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Origem</Label><Input value={novaLead.origem} onChange={(e) => setNovaLead({...novaLead, origem: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
              <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Valor (R$)</Label><Input type="number" step="0.01" min="0" value={novaLead.valor} onChange={(e) => setNovaLead({...novaLead, valor: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
            </div>
            <DialogFooter className="pt-3 border-t border-inherit"><Button type="submit" style={{ backgroundColor: corPrimaria }} className="text-white text-xs rounded-xl h-9 w-full hover:opacity-90">Salvar Contato Teste</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}