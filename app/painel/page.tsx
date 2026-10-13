'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Users, Inbox, Settings, LogOut, Phone, Plus, Trash2, Search, List, Columns, UserPlus, Plug, Copy, Check, Palette, Upload, Menu, X, Sun, Moon, Shield, UserCog, Filter, ArrowRightLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

// Função auxiliar para injetar opacidades na variável CSS (White-label)
const hexToRgb = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16);
  }
  return `${r}, ${g}, ${b}`;
};

export default function TenantDashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'vendedor'>('vendedor');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); 

  // White-label e Estilo Dinâmico
  const [corPrimaria, setCorPrimaria] = useState('#5483B3');
  const [logoUrl, setLogoUrl] = useState('');
  const [corFundoLogo, setCorFundoLogo] = useState('transparent');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Funil Dinâmico e Leads (Agora usa etapa_id em vez de status)
  const [etapasFunil, setEtapasFunil] = useState<any[]>([]);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaCor, setNovaEtapaCor] = useState('#5483B3');

  const [loading, setLoading] = useState(true);
  const [minhasLeads, setMinhasLeads] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'oportunidades' | 'configuracoes' | 'integracoes'>('visao_geral');
  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'kanban'>('kanban');
  
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroEtapaId, setFiltroEtapaId] = useState('todas');

  // Modais
  const [isNovaLeadModalOpen, setIsNovaLeadModalOpen] = useState(false);
  const [novaLead, setNovaLead] = useState({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', vendedor_id: '', valor: '' });
  
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
  const [leadSelecionada, setLeadSelecionada] = useState<any>(null);
  const [abaFicha, setAbaFicha] = useState<'anotacoes' | 'tarefas'>('anotacoes');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Anotações e Tarefas
  const [anotacoesLead, setAnotacoesLead] = useState<any[]>([]);
  const [novaAnotacaoTexto, setNovaAnotacaoTexto] = useState('');
  const [tarefasLead, setTarefasLead] = useState<any[]>([]);
  const [novaTarefaDesc, setNovaTarefaDesc] = useState('');
  const [novaTarefaData, setNovaTarefaData] = useState('');

  // Outros
  const [isConvidarModalOpen, setIsConvidarModalOpen] = useState(false);
  const [conviteEmail, setConviteEmail] = useState('');
  const [isEnviandoConvite, setIsEnviandoConvite] = useState(false);
  const [webhookCopiado, setWebhookCopiado] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [isEditMembroModalOpen, setIsEditMembroModalOpen] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState<any>(null);
  const [novoCargoMembro, setNovoCargoMembro] = useState<'admin' | 'vendedor'>('vendedor');

  const router = useRouter();
  const supabase = createClient();

  const carregarDados = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    
    setUserEmail(session.user.email ?? null);
    setUserId(session.user.id);

    const { data: perfilData } = await supabase.from('perfis').select('empresa_id, role').eq('id', session.user.id).single();
    if (!perfilData?.empresa_id) { setLoading(false); return; }

    const currentEmpresaId = perfilData.empresa_id;
    setEmpresaId(currentEmpresaId);
    setUserRole(perfilData.role || 'vendedor');

    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', currentEmpresaId).single();
    if (empresaData) { 
      if (!empresaData.ativo) {
        alert("Acesso Suspenso. Entre em contato com o suporte financeiro.");
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
      setNomeEmpresa(empresaData.nome); 
      setWebhookToken(empresaData.webhook_token);
      if (empresaData.cor_primaria) setCorPrimaria(empresaData.cor_primaria);
      if (empresaData.logo_url) setLogoUrl(empresaData.logo_url);
      if (empresaData.cor_fundo_logo) setCorFundoLogo(empresaData.cor_fundo_logo);
    }

    let { data: etapasData } = await supabase.from('etapas_funil').select('*').eq('empresa_id', currentEmpresaId).order('ordem', { ascending: true });
    setEtapasFunil(etapasData || []);

    // Atualizado: Buscar leads (Agora usamos etapa_id)
    const { data: leadsData } = await supabase.from('leads').select('*, vendedor:perfis(nome)').eq('empresa_id', currentEmpresaId).order('created_at', { ascending: false });
    if (leadsData) setMinhasLeads(leadsData);

    const { data: equipeData } = await supabase.from('perfis').select('*').eq('empresa_id', currentEmpresaId);
    if (equipeData) setEquipe(equipeData);

    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [router, supabase]);

  const fecharMenuMobile = () => setIsMobileMenuOpen(false);
  const mudarAba = (aba: any) => { setActiveTab(aba); fecharMenuMobile(); };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  // --- LÓGICA DE LEADS (Atualizada para usar etapa_id) ---
  const handleCriarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || etapasFunil.length === 0) return;
    const responsavelId = userRole === 'vendedor' ? userId : (novaLead.vendedor_id || null);
    const primeiraEtapaId = etapasFunil[0].id; 

    await supabase.from('leads').insert([{ 
      nome: novaLead.nome, email: novaLead.email, telefone: novaLead.telefone, origem: novaLead.origem, 
      etapa_id: primeiraEtapaId, empresa_id: empresaId, vendedor_id: responsavelId, valor: parseFloat(novaLead.valor) || 0
    }]);
    
    setIsNovaLeadModalOpen(false);
    setNovaLead({ nome: '', email: '', telefone: '', origem: 'Adicionado Manualmente', vendedor_id: '', valor: '' });
    carregarDados();
  };

  const handleDropCard = async (e: React.DragEvent, novaEtapaId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    
    const leadArrastada = minhasLeads.find(l => l.id === leadId);
    if (!leadArrastada || leadArrastada.etapa_id === novaEtapaId) return;

    setMinhasLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa_id: novaEtapaId } : l));
    await supabase.from('leads').update({ etapa_id: novaEtapaId }).eq('id', leadId);
  };

  const atualizarStatusLeadLista = async (novaEtapaId: string) => {
    if (!leadSelecionada) return;
    setMinhasLeads(prev => prev.map(l => l.id === leadSelecionada.id ? { ...l, etapa_id: novaEtapaId } : l));
    await supabase.from('leads').update({ etapa_id: novaEtapaId }).eq('id', leadSelecionada.id);
    setIsStatusModalOpen(false);
  };

  // --- CONFIGURAÇÕES ---
  const salvarConfiguracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    setIsSavingConfig(true);
    await supabase.from('empresas').update({ nome: nomeEmpresa, cor_primaria: corPrimaria, logo_url: logoUrl, cor_fundo_logo: corFundoLogo }).eq('id', empresaId);
    setIsSavingConfig(false);
    alert("Identidade Visual atualizada com sucesso!");
  };

  const adicionarEtapaFunil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !novaEtapaNome) return;
    const novaOrdem = etapasFunil.length > 0 ? Math.max(...etapasFunil.map(e => e.ordem)) + 1 : 1;
    await supabase.from('etapas_funil').insert([{ empresa_id: empresaId, nome: novaEtapaNome, cor: novaEtapaCor, ordem: novaOrdem }]);
    setNovaEtapaNome('');
    carregarDados();
  };

  const removerEtapaFunil = async (etapaId: string, etapaNome: string) => {
    const leadsNestaEtapa = minhasLeads.filter(l => l.etapa_id === etapaId);
    if (leadsNestaEtapa.length > 0) {
      alert(`Não é possível excluir esta etapa. Existem ${leadsNestaEtapa.length} contatos vinculados a ela.`);
      return;
    }
    if (confirm(`Deseja realmente excluir a etapa "${etapaNome}"?`)) {
      await supabase.from('etapas_funil').delete().eq('id', etapaId);
      carregarDados();
    }
  };

  const enviarConviteEquipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !conviteEmail) return;
    setIsEnviandoConvite(true);
    try {
      const response = await fetch('/api/equipe/convite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: conviteEmail, empresa_id: empresaId, role: 'vendedor' })
      });
      if (response.ok) {
        alert("Convite enviado com sucesso!"); setIsConvidarModalOpen(false); setConviteEmail(''); carregarDados();
      } else {
        const data = await response.json(); alert(`Erro: ${data.error}`);
      }
    } catch (err) { alert("Erro de servidor."); }
    setIsEnviandoConvite(false);
  };

  const atualizarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membroSelecionado) return;
    await supabase.from('perfis').update({ role: novoCargoMembro }).eq('id', membroSelecionado.id);
    setIsEditMembroModalOpen(false); setMembroSelecionado(null); carregarDados();
  };

  const removerMembro = async (membroId: string, membroEmail: string) => {
    if (membroId === userId) { alert("Você não pode remover o seu próprio acesso."); return; }
    if (confirm(`Deseja revogar o acesso de "${membroEmail}"?`)) {
      await supabase.from('perfis').delete().eq('id', membroId); carregarDados();
    }
  };

  const abrirModalDetalhes = async (lead: any) => {
    setLeadSelecionada(lead); setIsDetalhesModalOpen(true); setNovaAnotacaoTexto(''); setAbaFicha('anotacoes');
    const { data: notas } = await supabase.from('lead_anotacoes').select('*, perfis(nome)').eq('lead_id', lead.id).order('created_at', { ascending: false });
    if (notas) setAnotacoesLead(notas);
    const { data: tasks } = await supabase.from('tarefas').select('*').eq('lead_id', lead.id).order('data_vencimento', { ascending: true });
    if (tasks) setTarefasLead(tasks);
  };

  const handleAdicionarAnotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAnotacaoTexto.trim() || !leadSelecionada || !empresaId || !userId) return;
    await supabase.from('lead_anotacoes').insert([{ lead_id: leadSelecionada.id, empresa_id: empresaId, usuario_id: userId, texto: novaAnotacaoTexto }]);
    setNovaAnotacaoTexto(''); abrirModalDetalhes(leadSelecionada);
  };

  const apagarAnotacao = async (id: string) => {
    if (!confirm("Apagar anotação?")) return;
    await supabase.from('lead_anotacoes').delete().eq('id', id); abrirModalDetalhes(leadSelecionada);
  };

  const handleCriarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefaDesc.trim() || !novaTarefaData || !leadSelecionada || !empresaId || !userId) return;
    await supabase.from('tarefas').insert([{ lead_id: leadSelecionada.id, empresa_id: empresaId, vendedor_id: userId, descricao: novaTarefaDesc, data_vencimento: new Date(novaTarefaData).toISOString() }]);
    setNovaTarefaDesc(''); setNovaTarefaData(''); abrirModalDetalhes(leadSelecionada);
  };

  const toggleTarefa = async (tarefaId: string, concluidaStatus: boolean) => {
    await supabase.from('tarefas').update({ concluida: !concluidaStatus }).eq('id', tarefaId); abrirModalDetalhes(leadSelecionada);
  };

  const apagarTarefa = async (id: string) => {
    if (!confirm("Apagar follow-up?")) return;
    await supabase.from('tarefas').delete().eq('id', id); abrirModalDetalhes(leadSelecionada);
  };

  const baixarExemploCSV = () => {
    const blob = new Blob(["nome,email,telefone,origem,valor\nJoão Silva,joao@email.com,11999999999,Importação,150.00"], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", "modelo_crm.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImportarCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !empresaId || etapasFunil.length === 0) return;
    setIsImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("Arquivo vazio.");
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const leadsToInsert = [];
      const primeiraEtapaId = etapasFunil[0].id;
      
      for(let i=1; i<lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((h, index) => { obj[h] = values[index] || ''; });
        if (!obj.nome) continue; 
        leadsToInsert.push({ empresa_id: empresaId, nome: obj.nome, email: obj.email || null, telefone: obj.telefone || null, origem: obj.origem || 'Importação CSV', valor: parseFloat(obj.valor) || 0, etapa_id: primeiraEtapaId, vendedor_id: userRole === 'vendedor' ? userId : null });
      }
      if (leadsToInsert.length > 0) {
        await supabase.from('leads').insert(leadsToInsert); alert(`Sucesso! ${leadsToInsert.length} clientes importados.`);
        carregarDados(); setIsImportModalOpen(false); setImportFile(null);
      }
    } catch (error: any) { alert("Erro ao importar: " + error.message); }
    setIsImporting(false);
  };

  const copiarUrlWebhook = () => {
    if (!webhookToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/leads?token=${webhookToken}`);
    setWebhookCopiado(true); setTimeout(() => setWebhookCopiado(false), 2000);
  };

  const abrirWhatsApp = (telefone: string) => {
    if (!telefone) return;
    const num = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/${num.length <= 11 ? `55${num}` : num}`, '_blank');
  };

  // --- FILTROS APLICADOS (Agora com etapa_id) ---
  const leadsFiltradas = minhasLeads.filter(lead => {
    const matchBusca = lead.nome.toLowerCase().includes(termoBusca.toLowerCase()) || (lead.email && lead.email.toLowerCase().includes(termoBusca.toLowerCase()));
    const matchStatus = filtroEtapaId === 'todas' || lead.etapa_id === filtroEtapaId;
    return matchBusca && matchStatus;
  });

  const origensMap = minhasLeads.reduce((acc: any, lead) => { acc[lead.origem || 'Outros'] = (acc[lead.origem || 'Outros'] || 0) + 1; return acc; }, {});
  const dadosOrigem = Object.keys(origensMap).map(key => ({ origem: key, quantidade: origensMap[key] })).sort((a, b) => b.quantidade - a.quantidade);
  
  const dadosFunil = etapasFunil.map(e => ({ 
    name: e.nome, 
    quantidade: minhasLeads.filter(l => l.etapa_id === e.id).length, 
    cor: e.cor 
  })).filter(d => d.quantidade > 0);

  if (loading) return (
    <div className={`flex h-screen items-center justify-center font-sans ${darkMode ? 'bg-[#09090b] text-white' : 'bg-[#fafafa] text-zinc-900'}`}>
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-3 h-3 rounded-full bg-[#5483B3] animate-ping"></div><span className="font-medium text-xs tracking-wide uppercase">Carregando CRM...</span>
      </div>
    </div>
  );

  return (
    // ENVÓLUCRO PRINCIPAL - AQUI INJETAMOS A VARIÁVEL CSS DO WHITE-LABEL
    <div 
      className={`flex h-screen overflow-hidden font-sans text-xs md:text-sm transition-colors duration-300 ${darkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f4f7f9] text-zinc-900'}`}
      style={{
        '--brand-primary': corPrimaria,
        '--brand-primary-rgb': hexToRgb(corPrimaria)
      } as React.CSSProperties}
    >
      
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden" onClick={fecharMenuMobile} />}

      {/* SIDEBAR PREMIUM (AeuxGlobal Style - Escura #021024) */}
      <aside 
        className={`fixed md:relative z-50 h-full w-64 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ backgroundColor: '#021024', borderRight: '1px solid #052659', color: '#C1E8FF' }}
      >
        <button onClick={fecharMenuMobile} className="md:hidden absolute top-4 right-4 text-[#7DA0CA] hover:text-white p-2"><X size={20} /></button>

        <div className="p-6 flex flex-col items-center border-b border-[#052659]">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden mb-3 p-1 shadow-md shadow-black/40" style={{ backgroundColor: corFundoLogo !== 'transparent' ? corFundoLogo : '#052659' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-lg font-bold text-white">{nomeEmpresa ? nomeEmpresa.charAt(0).toUpperCase() : 'C'}</span>}
          </div>
          <span className="font-bold text-xs truncate w-full text-center text-white">{nomeEmpresa || 'Meu CRM'}</span>
          <span className="text-[10px] mt-1 px-2.5 py-0.5 rounded-full font-mono tracking-wider" style={{ backgroundColor: '#052659', color: '#C1E8FF' }}>{userRole === 'admin' ? 'Administrador' : 'Vendedor'}</span>
        </div>

        <nav className="flex-1 px-3 space-y-2 py-6">
          {[
            { id: 'visao_geral', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'oportunidades', label: 'Oportunidades', icon: Inbox },
            { id: 'configuracoes', label: userRole === 'admin' ? 'Configurações' : 'Meu Perfil', icon: Settings },
            ...(userRole === 'admin' ? [{ id: 'integracoes', label: 'Integrações e API', icon: Plug }] : [])
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id} onClick={() => mudarAba(item.id)} 
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all`}
                style={{ 
                  backgroundColor: isActive ? 'rgba(var(--brand-primary-rgb), 0.2)' : 'transparent', 
                  color: isActive ? '#ffffff' : '#7DA0CA', 
                  fontWeight: isActive ? '700' : '500' 
                }}
              >
                <item.icon size={16} style={{ color: isActive ? '#ffffff' : '#7DA0CA' }} /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#052659] space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all font-medium hover:bg-[#052659]" style={{ backgroundColor: '#052659', color: '#C1E8FF', border: '1px solid rgba(var(--brand-primary-rgb), 0.5)' }}>
              {darkMode ? <Sun size={14} className="text-[#C1E8FF]" /> : <Moon size={14} className="text-[#C1E8FF]" />}
            </button>
            <button onClick={handleLogout} title="Sair" className="p-2.5 rounded-xl transition-all hover:bg-red-500/20 text-red-400" style={{ backgroundColor: '#052659', border: '1px solid rgba(var(--brand-primary-rgb), 0.5)' }}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative rounded-l-none md:rounded-l-3xl border-l-0 md:border-l" style={{ borderColor: darkMode ? '#27272a' : '#e4e4e7', backgroundColor: darkMode ? '#09090b' : '#f4f7f9' }}>
        
        <header className={`md:hidden border-b p-4 flex items-center justify-between shadow-xs z-30 ${darkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center gap-3 font-semibold">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 rounded-lg"><Menu size={20} /></button>
            <span className="text-xs font-bold truncate max-w-[150px]" style={{ color: 'var(--brand-primary)' }}>{nomeEmpresa || 'CRM'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-6 pb-10">
            
            {/* TELA 1: VISÃO GERAL */}
            {activeTab === 'visao_geral' && (
              <div className="animate-in fade-in duration-300 space-y-6">
                <div className="pb-2 border-b border-inherit flex items-center justify-between">
                  <div>
                    <h1 className="text-lg md:text-xl font-bold tracking-tight">Painel Operacional</h1>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Acompanhe suas métricas comerciais e conversões.</p>
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
                      <div className="mt-2 text-2xl font-extrabold">{minhasLeads.filter(l => l.etapa_id === etapa.id).length}</div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                    <h3 className="font-bold text-xs md:text-sm mb-4">Distribuição do Funil</h3>
                    <div className="h-64 flex justify-center items-center">
                      {dadosFunil.length === 0 ? <p className="text-zinc-500 text-xs">Sem dados.</p> : (
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dadosFunil} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="quantidade">{dadosFunil.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.cor} />))}</Pie><RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px', backgroundColor: darkMode ? '#18181b' : '#fff', color: darkMode ? '#fff' : '#000'}} /></PieChart></ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                    <h3 className="font-bold text-xs md:text-sm mb-4">Leads por Origem</h3>
                    <div className="h-64">
                      {dadosOrigem.length === 0 ? <div className="flex h-full items-center justify-center"><p className="text-zinc-500 text-xs">Sem dados.</p></div> : (
                        <ResponsiveContainer width="100%" height="100%"><BarChart data={dadosOrigem} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#27272a' : '#e2e8f0'} /><XAxis dataKey="origem" interval={0} tick={{fontSize: 10, fill: darkMode ? '#a1a1aa' : '#64748b'}} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{fontSize: 10, fill: darkMode ? '#a1a1aa' : '#64748b'}} axisLine={false} tickLine={false} /><RechartsTooltip cursor={{fill: darkMode ? '#27272a' : '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px', backgroundColor: darkMode ? '#18181b' : '#fff', color: darkMode ? '#fff' : '#000'}} /><Bar dataKey="quantidade" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} maxBarSize={35} /></BarChart></ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TELA 2: OPORTUNIDADES COM CSS VAR */}
            {activeTab === 'oportunidades' && (
               <div className="animate-in fade-in duration-300 space-y-4">
               <div className={`p-4 md:p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                 <div>
                   <h1 className="text-base md:text-lg font-bold">Oportunidades</h1>
                   <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Gerencie seu pipeline de vendas.</p>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                   <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className={`flex-1 md:flex-none rounded-xl text-xs ${darkMode ? 'border-zinc-700 text-zinc-300' : 'bg-white'}`}><Upload size={14} className="mr-1.5"/> Importar</Button>
                   <Button onClick={() => setIsNovaLeadModalOpen(true)} style={{ backgroundColor: 'var(--brand-primary)' }} className="flex-1 md:flex-none text-white rounded-xl text-xs hover:opacity-90"><Plus size={14} className="mr-1.5"/> Novo Contato</Button>
                 </div>
               </div>

               <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                 <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                   <div className="relative w-full sm:w-64">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                     <Input placeholder="Buscar por nome ou e-mail..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className={`pl-9 text-xs h-9 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'}`} />
                   </div>
                   <div className="relative w-full sm:w-48">
                     <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                     <select value={filtroEtapaId} onChange={(e) => setFiltroEtapaId(e.target.value)} className={`pl-9 w-full text-xs h-9 rounded-xl border outline-none appearance-none ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'}`}>
                        <option value="todas">Todas as Etapas</option>
                        {etapasFunil.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                     </select>
                   </div>
                 </div>
                 <div className={`flex items-center w-full md:w-auto p-1 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                   <button onClick={() => setModoVisualizacao('tabela')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${modoVisualizacao === 'tabela' ? (darkMode ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-400'}`}><List size={14} className="inline mr-1" /> Lista</button>
                   <button onClick={() => setModoVisualizacao('kanban')} className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${modoVisualizacao === 'kanban' ? (darkMode ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-zinc-900 shadow-sm') : 'text-zinc-400'}`}><Columns size={14} className="inline mr-1" /> Kanban</button>
                 </div>
               </div>

               {modoVisualizacao === 'tabela' && (
                 <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                   <div className="overflow-x-auto">
                     <Table className="min-w-[700px]">
                       <TableHeader>
                         <TableRow className={`border-b ${darkMode ? 'border-zinc-800 hover:bg-transparent' : 'border-zinc-100 hover:bg-transparent'}`}>
                           <TableHead className="py-3 px-6 font-semibold text-[11px] uppercase tracking-wider">Cliente</TableHead>
                           <TableHead className="py-3 font-semibold text-[11px] uppercase tracking-wider">Etapa Atual</TableHead>
                           <TableHead className="py-3 font-semibold text-[11px] uppercase tracking-wider">Valor</TableHead>
                           <TableHead className="py-3 font-semibold text-[11px] uppercase tracking-wider text-right px-6">Ações</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {leadsFiltradas.length === 0 ? (
                           <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-400">Nenhum cliente encontrado.</TableCell></TableRow>
                         ) : leadsFiltradas.map((lead) => {
                           const etapaLead = etapasFunil.find(e => e.id === lead.etapa_id);
                           const corTag = etapaLead ? etapaLead.cor : corPrimaria;
                           return (
                           <TableRow key={lead.id} className={`border-b transition-colors ${darkMode ? 'border-zinc-800/50 hover:bg-zinc-800/30' : 'border-zinc-50 hover:bg-zinc-50/80'}`}>
                             <TableCell className="px-6 py-3.5">
                               <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ backgroundColor: 'rgba(var(--brand-primary-rgb), 0.15)', color: 'var(--brand-primary)' }}>{lead.nome.substring(0, 2).toUpperCase()}</div>
                                 <div>
                                   <div className="font-bold cursor-pointer hover:underline truncate max-w-[180px]" style={{ color: 'var(--brand-primary)' }} onClick={() => abrirModalDetalhes(lead)}>{lead.nome}</div>
                                   <div className="text-[10px] text-zinc-400">{lead.telefone || lead.email}</div>
                                 </div>
                               </div>
                             </TableCell>
                             <TableCell>
                               <button 
                                 onClick={() => { setLeadSelecionada(lead); setIsStatusModalOpen(true); }}
                                 className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold hover:opacity-80 transition-opacity cursor-pointer" 
                                 style={{ backgroundColor: `${corTag}20`, color: corTag, border: `1px solid ${corTag}40` }}
                               >
                                 {etapaLead?.nome || 'Sem Etapa'} <ArrowRightLeft size={10} />
                               </button>
                             </TableCell>
                             <TableCell className="font-medium text-xs">{formatarMoeda(lead.valor || 0)}</TableCell>
                             <TableCell className="text-right px-6">
                               <div className="flex items-center justify-end gap-2">
                                 {lead.telefone && <button onClick={() => abrirWhatsApp(lead.telefone)} className="text-emerald-500 p-1"><Phone size={13}/></button>}
                                 <button onClick={() => abrirModalDetalhes(lead)} className="font-bold text-xs hover:underline">Ficha</button>
                               </div>
                             </TableCell>
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
                     <div key={etapa.id} className={`rounded-2xl p-3 md:p-4 border min-h-[450px] w-[280px] md:w-[310px] flex-shrink-0 snap-start flex flex-col ${darkMode ? 'bg-[#121216]/60 border-zinc-800/80' : 'bg-zinc-100/50 border-zinc-200'}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropCard(e, etapa.id)}>
                       <div className="flex items-center justify-between mb-3 border-b pb-2 border-inherit shrink-0">
                         <h3 className="font-bold flex items-center gap-2 text-xs md:text-sm" style={{ color: etapa.cor }}>
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }}></div>{etapa.nome}
                         </h3>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}`}>
                           {leadsFiltradas.filter(l => l.etapa_id === etapa.id).length}
                         </span>
                       </div>
                       <div className="space-y-2.5 flex-1 overflow-y-auto">
                         {leadsFiltradas.filter(l => l.etapa_id === etapa.id).map(lead => (
                           <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)} className={`p-3.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${darkMode ? 'bg-[#18181b] border-zinc-700/60' : 'bg-white border-zinc-200 shadow-sm'}`} onClick={() => abrirModalDetalhes(lead)}>
                             <div className="flex justify-between items-start mb-1">
                               <div className="font-bold text-xs truncate pr-2">{lead.nome}</div>
                               {lead.telefone && <button onClick={(e) => { e.stopPropagation(); abrirWhatsApp(lead.telefone); }} className="text-emerald-500 p-1 rounded-full"><Phone size={11}/></button>}
                             </div>
                             <div className="text-[10px] text-zinc-400 mb-2 truncate">{lead.telefone || lead.email}</div>
                             {lead.valor > 0 && <div className="text-[10px] font-bold w-max px-2 py-0.5 rounded mb-2" style={{ backgroundColor: 'rgba(var(--brand-primary-rgb), 0.1)', color: 'var(--brand-primary)' }}>{formatarMoeda(lead.valor)}</div>}
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
                  <h1 className="text-base md:text-lg font-bold">{userRole === 'admin' ? 'Configurações da Organização' : 'Meu Perfil'}</h1>
                </div>

                {userRole === 'admin' ? (
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                        <h3 className="font-bold text-xs md:text-sm mb-4 flex items-center gap-2"><Palette size={16} style={{ color: 'var(--brand-primary)' }}/> Identidade Visual</h3>
                        <form onSubmit={salvarConfiguracoes} className="space-y-4">
                          <div>
                            <Label className="text-[10px] font-bold text-zinc-400 uppercase">Nome da Empresa</Label>
                            <Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[10px] font-bold text-zinc-400 uppercase">Logo (URL)</Label>
                              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-zinc-400 uppercase">Cor Primária</Label>
                              <div className="flex gap-2 mt-1">
                                <Input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-10 h-9 p-1 cursor-pointer rounded-xl bg-transparent border-0" />
                                <Input type="text" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className={`text-xs h-9 rounded-xl font-mono ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                              </div>
                            </div>
                          </div>
                          <Button type="submit" disabled={isSavingConfig} style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white w-full text-xs rounded-xl h-9 hover:opacity-90 mt-2">Salvar Alterações</Button>
                        </form>
                      </div>

                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                        <h3 className="font-bold text-xs md:text-sm mb-4 flex items-center gap-2"><Columns size={16} style={{ color: 'var(--brand-primary)' }}/> Etapas do Funil</h3>
                        <div className="space-y-3 mb-4">
                          {etapasFunil.map((etapa) => (
                            <div key={etapa.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: etapa.cor }}></div>
                                <span className="font-bold text-xs">{etapa.nome}</span>
                              </div>
                              <button onClick={() => removerEtapaFunil(etapa.id, etapa.nome)} className="text-red-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={adicionarEtapaFunil} className="flex gap-2 pt-3 border-t border-inherit">
                          <Input type="color" required value={novaEtapaCor} onChange={(e) => setNovaEtapaCor(e.target.value)} className="w-10 h-9 p-1 cursor-pointer rounded-xl bg-transparent border-0" />
                          <Input required placeholder="Nova etapa..." value={novaEtapaNome} onChange={(e) => setNovaEtapaNome(e.target.value)} className={`flex-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                          <Button type="submit" style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs h-9 rounded-xl"><Plus size={14}/></Button>
                        </form>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-xs md:text-sm">Equipe ({equipe.length})</h3>
                          <Button onClick={() => setIsConvidarModalOpen(true)} size="sm" style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs h-8 rounded-xl hover:opacity-90"><UserPlus size={13} className="mr-1"/> Convidar</Button>
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
                                  <TableCell className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => { setMembroSelecionado(membro); setNovoCargoMembro(membro.role || 'vendedor'); setIsEditMembroModalOpen(true); }} className="p-1 hover:text-[var(--brand-primary)] text-zinc-400" title="Editar Cargo"><UserCog size={14}/></button>
                                      <button onClick={() => removerMembro(membro.id, membro.email)} className="p-1 text-red-400 hover:text-red-500" title="Remover Membro"><Trash2 size={14}/></button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                    <Label className="text-[10px] text-zinc-400 uppercase font-bold">E-mail Cadastrado</Label>
                    <Input disabled value={userEmail || ''} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : ''}`} />
                  </div>
                )}
              </div>
            )}

            {/* TELA 4: INTEGRAÇÕES */}
            {activeTab === 'integracoes' && userRole === 'admin' && (
               <div className="animate-in fade-in duration-300 space-y-6">
               <div className={`p-4 md:p-6 rounded-2xl border ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                 <h1 className="text-base md:text-lg font-bold">Integrações e Webhook</h1>
               </div>
               <div className={`p-5 rounded-2xl border max-w-xl ${darkMode ? 'bg-[#121216] border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                 <h3 className="font-bold text-xs md:text-sm mb-2">Endpoint para Captação</h3>
                 <p className={`text-xs mb-4 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Envie requisições POST para inserir leads automaticamente.</p>
                 <div className="flex gap-2">
                   <Input readOnly value={webhookToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/leads?token=${webhookToken}` : 'Gerando...'} className={`text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : ''}`} />
                   <Button onClick={copiarUrlWebhook} disabled={!webhookToken} style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white h-9 rounded-xl px-4">{webhookCopiado ? <Check size={15}/> : <Copy size={15}/>}</Button>
                 </div>
               </div>
             </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL ALTERAR STATUS (Lista - Com ID) */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border sm:max-w-xs ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader><DialogTitle className="text-sm font-bold">Mover "{leadSelecionada?.nome}"</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            {etapasFunil.map(etapa => (
              <button 
                key={etapa.id} onClick={() => atualizarStatusLeadLista(etapa.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:-translate-y-0.5`}
                style={{ backgroundColor: leadSelecionada?.etapa_id === etapa.id ? `${etapa.cor}20` : (darkMode ? '#18181b' : '#fafafa'), borderColor: leadSelecionada?.etapa_id === etapa.id ? etapa.cor : (darkMode ? '#27272a' : '#e4e4e7') }}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: etapa.cor }}></span> {etapa.nome}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO CONTATO */}
      <Dialog open={isNovaLeadModalOpen} onOpenChange={setIsNovaLeadModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader><DialogTitle className="text-base font-bold">Novo Contato</DialogTitle></DialogHeader>
          <form onSubmit={handleCriarLead} className="space-y-3 mt-2">
            <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Nome Completo *</Label><Input required value={novaLead.nome} onChange={(e) => setNovaLead({...novaLead, nome: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Telefone</Label><Input value={novaLead.telefone} onChange={(e) => setNovaLead({...novaLead, telefone: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
              <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">E-mail</Label><Input type="email" value={novaLead.email} onChange={(e) => setNovaLead({...novaLead, email: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Origem</Label><Input value={novaLead.origem} onChange={(e) => setNovaLead({...novaLead, origem: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
              <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Valor (R$)</Label><Input type="number" step="0.01" min="0" value={novaLead.valor} onChange={(e) => setNovaLead({...novaLead, valor: e.target.value})} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
            </div>
            <DialogFooter className="pt-3 border-t border-inherit"><Button type="submit" style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs rounded-xl h-9 w-full hover:opacity-90">Salvar Contato</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHES DA LEAD */}
      <Dialog open={isDetalhesModalOpen} onOpenChange={setIsDetalhesModalOpen}>
        <DialogContent className={`rounded-2xl p-0 overflow-hidden flex flex-col max-h-[80vh] border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <div className={`p-4 md:p-6 border-b ${darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-base md:text-lg font-bold">{leadSelecionada?.nome}</DialogTitle>
                <div className="text-zinc-400 text-xs flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Phone size={12}/> {leadSelecionada?.telefone || 'Sem telefone'}</span>
                  {leadSelecionada?.valor > 0 && <span className="font-bold text-emerald-500">{formatarMoeda(leadSelecionada.valor)}</span>}
                </div>
              </div>
              {leadSelecionada?.telefone && (
                <Button size="sm" onClick={() => abrirWhatsApp(leadSelecionada.telefone)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8 rounded-xl">WhatsApp</Button>
              )}
            </div>
            <div className="flex gap-4 mt-4 border-b border-inherit">
              <button onClick={() => setAbaFicha('anotacoes')} className={`pb-2 text-xs font-bold border-b-2 transition-all`} style={{ borderColor: abaFicha === 'anotacoes' ? 'var(--brand-primary)' : 'transparent', color: abaFicha === 'anotacoes' ? 'var(--brand-primary)' : '#a1a1aa' }}>Anotações</button>
              <button onClick={() => setAbaFicha('tarefas')} className={`pb-2 text-xs font-bold border-b-2 transition-all`} style={{ borderColor: abaFicha === 'tarefas' ? 'var(--brand-primary)' : 'transparent', color: abaFicha === 'tarefas' ? 'var(--brand-primary)' : '#a1a1aa' }}>Follow-ups</button>
            </div>
          </div>
          <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
            {abaFicha === 'anotacoes' && (
              <div className="space-y-4">
                <form onSubmit={handleAdicionarAnotacao} className="flex gap-2">
                  <Input required value={novaAnotacaoTexto} onChange={e => setNovaAnotacaoTexto(e.target.value)} placeholder="Escreva uma anotação..." className={`text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                  <Button type="submit" style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs rounded-xl h-9 px-4 hover:opacity-90">Adicionar</Button>
                </form>
                <div className="space-y-2.5">
                  {anotacoesLead.map(nota => (
                    <div key={nota.id} className={`p-3 rounded-xl border relative group ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      <p className="text-xs leading-relaxed pr-8">{nota.texto}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-inherit text-[10px] text-zinc-500">
                        <span>{new Date(nota.created_at).toLocaleString('pt-BR')} - {nota.perfis?.nome || 'Usuário'}</span>
                        <button onClick={() => apagarAnotacao(nota.id)} className="text-red-400 font-bold hover:underline">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {abaFicha === 'tarefas' && (
              <div className="space-y-4">
                <form onSubmit={handleCriarTarefa} className="flex flex-col sm:flex-row gap-2">
                  <Input required value={novaTarefaDesc} onChange={e => setNovaTarefaDesc(e.target.value)} placeholder="Descrição do follow-up..." className={`text-xs h-9 rounded-xl flex-1 ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                  <Input type="datetime-local" required value={novaTarefaData} onChange={e => setNovaTarefaData(e.target.value)} className={`text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
                  <Button type="submit" style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs rounded-xl h-9 px-4 hover:opacity-90">Agendar</Button>
                </form>
                <div className="space-y-2.5">
                  {tarefasLead.map(t => (
                    <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={t.concluida} onChange={() => toggleTarefa(t.id, t.concluida)} className="rounded cursor-pointer" />
                        <div>
                          <p className={`text-xs font-semibold ${t.concluida ? 'line-through text-zinc-500' : ''}`}>{t.descricao}</p>
                          <p className="text-[10px] text-zinc-400">{new Date(t.data_vencimento).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <button onClick={() => apagarTarefa(t.id)} className="text-red-400 text-xs hover:underline"><Trash2 size={13}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OUTROS MODAIS COM CSS VAR APLICADA */}
      <Dialog open={isEditMembroModalOpen} onOpenChange={setIsEditMembroModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader><DialogTitle className="text-base font-bold">Editar Membro da Equipe</DialogTitle></DialogHeader>
          <form onSubmit={atualizarMembro} className="space-y-4 mt-2">
            <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Usuário</Label><Input disabled value={membroSelecionado?.email || ''} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : ''}`} /></div>
            <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">Cargo</Label>
              <select value={novoCargoMembro} onChange={(e: any) => setNovoCargoMembro(e.target.value)} className={`mt-1 w-full text-xs h-9 rounded-xl px-3 border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-200'}`}>
                <option value="vendedor">Vendedor</option><option value="admin">Administrador</option>
              </select>
            </div>
            <DialogFooter className="pt-3 border-t border-inherit flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditMembroModalOpen(false)} className="text-xs">Cancelar</Button>
              <Button type="submit" style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs rounded-xl h-9 hover:opacity-90">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader><DialogTitle className="text-base font-bold flex items-center gap-2"><Upload size={16}/> Importar Contatos via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Button onClick={baixarExemploCSV} variant="link" className="text-xs p-0 h-auto" style={{ color: 'var(--brand-primary)' }}>Baixar modelo de CSV</Button>
            <form onSubmit={handleImportarCSV} className="space-y-4">
              <Input type="file" accept=".csv" required onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className={`text-xs h-10 rounded-xl cursor-pointer ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} />
              <Button type="submit" disabled={isImporting || !importFile} style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs rounded-xl h-9 w-full hover:opacity-90">{isImporting ? 'Importando...' : 'Iniciar Importação'}</Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConvidarModalOpen} onOpenChange={setIsConvidarModalOpen}>
        <DialogContent className={`rounded-2xl p-6 border ${darkMode ? 'bg-[#121216] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <DialogHeader><DialogTitle className="text-base font-bold">Convidar Membro para a Equipe</DialogTitle></DialogHeader>
          <form onSubmit={enviarConviteEquipe} className="space-y-3 mt-2">
            <div><Label className="text-[10px] font-bold text-zinc-400 uppercase">E-mail do Vendedor</Label><Input type="email" required value={conviteEmail} onChange={(e) => setConviteEmail(e.target.value)} className={`mt-1 text-xs h-9 rounded-xl ${darkMode ? 'bg-zinc-900 border-zinc-700 text-white' : ''}`} /></div>
            <DialogFooter className="pt-3 border-t border-inherit"><Button type="submit" disabled={isEnviandoConvite} style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white text-xs rounded-xl h-9 w-full hover:opacity-90">{isEnviandoConvite ? 'Enviando...' : 'Enviar Convite'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}