'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChartNoAxesColumn, Inbox, LayoutDashboard, MessageCircle, Plug, Settings, Users } from 'lucide-react';
import { AppShell, ShellCarregando, useNavegacao, type ItemNotificacao, type Secao } from '@/components/shell/app-shell';
import { formatarMoeda } from '@/lib/marca';
import type { Painel } from '../_lib/use-painel';
import type { Lead } from '../_lib/tipos';
import { formatarDataHora, grupoTarefa } from '../_lib/util';
import { VisaoGeral } from './visao-geral';
import { Leads } from './leads';
import { Equipe } from './equipe';
import { Configuracoes, Integracoes } from './configuracoes';
import { ConvidarDialog, FichaLeadDialog, NovoLeadDialog } from './dialogos';
import { MotivoPerdaHost } from './acoes-lead';
import { PedirNome } from '@/components/conta/pedir-nome';

/** Seção do painel → capítulo da central de ajuda aberto pelo botão "?". */
const AJUDA_POR_SECAO: Record<string, string> = { visao: 'visao-geral', leads: 'leads', conversas: 'conversas', relatorios: 'relatorios', equipe: 'equipe', integracoes: 'integracoes', config: 'configuracoes' };
import { ConviteApp, MarcaDoApp } from '@/components/app/instalar';
import { Relatorios } from './relatorios';
import { Conversas, NovaConversaDialog } from './conversas';

/** O painel do cliente inteiro, para qualquer fonte de dados (Supabase ou a demonstração). */
export function PainelApp({ crm, aviso }: { crm: Painel; aviso?: React.ReactNode }) {
  const admin = crm.papel === 'admin';

  const secoes = useMemo<Secao[]>(() => [
    { id: 'visao', label: 'Visão geral', icone: LayoutDashboard, visoes: [{ id: 'resumo', label: 'Resumo' }, { id: 'atividade', label: 'Atividade' }] },
    { id: 'leads', label: 'Leads', icone: Inbox, visoes: [{ id: 'hoje', label: 'Hoje' }, { id: 'kanban', label: 'Kanban' }, { id: 'lista', label: 'Lista' }, { id: 'tarefas', label: 'Tarefas' }] },
    ...(admin || crm.whatsapp.conta ? [{ id: 'conversas', label: 'Conversas', icone: MessageCircle, selo: crm.whatsapp.naoLidas, visoes: [{ id: 'abertas', label: 'Caixa de entrada' }, { id: 'arquivadas', label: 'Arquivadas' }] }] : []),
    { id: 'relatorios', label: 'Relatórios', icone: ChartNoAxesColumn, visoes: [{ id: 'desempenho', label: 'Desempenho' }, { id: 'metas', label: 'Metas' }, { id: 'mensal', label: 'Relatório mensal' }] },
    { id: 'equipe', label: 'Equipe', icone: Users, visoes: [{ id: 'membros', label: 'Membros' }] },
    ...(admin ? [{ id: 'integracoes', label: 'Integrações', icone: Plug, visoes: [{ id: 'whatsapp', label: 'WhatsApp' }, { id: 'webhook', label: 'Webhook' }, { id: 'importar', label: 'Importar planilha' }] }] : []),
    {
      id: 'config', label: 'Configurações', icone: Settings,
      visoes: admin ? [{ id: 'marca', label: 'Marca' }, { id: 'funil', label: 'Funil' }, { id: 'mensagens', label: 'Mensagens' }, { id: 'privacidade', label: 'Privacidade' }, { id: 'perfil', label: 'Perfil' }] : [{ id: 'perfil', label: 'Perfil' }],
    },
  ], [admin, crm.whatsapp.conta, crm.whatsapp.naoLidas]);

  const nav = useNavegacao(secoes, 'visao');
  const [novoLead, setNovoLead] = useState(false);
  const [convite, setConvite] = useState(false);
  const [leadAberto, setLeadAberto] = useState<Lead | null>(null);
  const [conversaPedida, setConversaPedida] = useState<string | null>(null);
  const [conversaComLead, setConversaComLead] = useState<Lead | null>(null);

  const itensBusca = useMemo(() => crm.leads.map((l) => ({
    id: l.id,
    titulo: l.nome,
    subtitulo: [l.telefone, l.email].filter(Boolean).join(' · ') || undefined,
    meta: crm.etapas.find((e) => e.id === l.etapa_id)?.nome ?? ((l.valor ?? 0) > 0 ? formatarMoeda(l.valor || 0) : undefined),
  })), [crm.leads, crm.etapas]);

  // Notificações: follow-ups atrasados ou para hoje
  const notificacoes = useMemo<ItemNotificacao[]>(() => {
    const agora = new Date();
    const conversas: ItemNotificacao[] = crm.whatsapp.conversas
      .filter((c) => c.nao_lidas > 0 && c.status === 'aberta')
      .slice(0, 10)
      .map((c) => ({
        id: `wa:${c.id}`,
        titulo: `${c.nao_lidas > 1 ? `${c.nao_lidas} mensagens` : 'Mensagem'} de ${crm.leads.find((l) => l.id === c.lead_id)?.nome || c.nome_contato || `+${c.wa_id}`}`,
        subtitulo: c.ultima_previa ?? undefined,
        tom: 'info',
      }));
    return [...conversas, ...crm.tarefas
      .map((t) => ({ t, g: grupoTarefa(t, agora) }))
      .filter(({ g }) => g === 'atrasada' || g === 'hoje')
      .map(({ t, g }) => ({
        id: t.id,
        titulo: t.descricao,
        subtitulo: `${g === 'atrasada' ? 'Atrasado' : 'Hoje'} · ${formatarDataHora(t.data_vencimento)} · ${crm.leads.find((l) => l.id === t.lead_id)?.nome ?? ''}`,
        tom: g === 'atrasada' ? 'atrasada' : 'hoje',
      } as ItemNotificacao))];
  }, [crm.tarefas, crm.leads, crm.whatsapp.conversas]);

  const limparPedida = useCallback(() => setConversaPedida(null), []);
  const irParaConversa = (id: string) => { setConversaPedida(id); nav.navegar('conversas', 'abertas'); };
  const abrirConversaDoLead = (l: Lead) => {
    const existente = crm.whatsapp.conversas.find((c) => c.lead_id === l.id);
    if (existente) irParaConversa(existente.id); else setConversaComLead(l);
  };

  if (crm.carregando) return <ShellCarregando texto="Carregando seu CRM…" />;

  const abrirLead = (l: Lead) => setLeadAberto(l);
  const abrirLeadPorId = (id: string) => { const l = crm.leads.find((x) => x.id === id); if (l) setLeadAberto(l); };

  return (
    <AppShell
      marca={{ nome: crm.empresa?.nome || 'Meu CRM', logoUrl: crm.imagens.logo, corFundoLogo: crm.empresa?.cor_fundo_logo, cor: crm.empresa?.cor_primaria }}
      fundoUrl={crm.imagens.fundo}
      usuario={{ nome: crm.nomeUsuario, papel: admin ? 'Administrador' : 'Vendedor' }}
      secoes={secoes}
      secao={nav.secao}
      visao={nav.visao}
      aoNavegar={nav.navegar}
      criar={{ rotulo: 'Novo lead', aoClicar: () => setNovoLead(true) }}
      busca={{ itens: itensBusca, placeholder: 'Buscar leads por nome, telefone ou e-mail', aoSelecionar: abrirLeadPorId }}
      notificacoes={{
        itens: notificacoes,
        vazio: 'Nenhuma mensagem nova nem follow-up para hoje.',
        aoSelecionar: (id) => {
          if (id.startsWith('wa:')) { irParaConversa(id.slice(3)); return; }
          const t = crm.tarefas.find((x) => x.id === id); if (t) abrirLeadPorId(t.lead_id);
        },
      }}
      aoSair={crm.sair}
      aoAbrirPerfil={() => nav.navegar('config', 'perfil')}
      ajudaHref={`/ajuda#${AJUDA_POR_SECAO[nav.secao] ?? 'comecar'}`}
      aviso={aviso ?? (crm.appInstalavel && crm.empresa ? <ConviteApp nome={crm.empresa.nome || 'CRM'} icone={crm.iconeApp} /> : undefined)}
    >
      {nav.secao === 'visao' && <VisaoGeral crm={crm} visao={nav.visao} abrirLead={abrirLead} irPara={nav.navegar} novoLead={() => setNovoLead(true)} />}
      {nav.secao === 'leads' && <Leads crm={crm} visao={nav.visao} abrirLead={abrirLead} novoLead={() => setNovoLead(true)} irPara={nav.navegar} />}
      {nav.secao === 'conversas' && <Conversas crm={crm} visao={nav.visao} abrirLead={abrirLead} irPara={nav.navegar} conversaPedida={conversaPedida} aoAbrirPedida={limparPedida} />}
      {nav.secao === 'relatorios' && <Relatorios crm={crm} visao={nav.visao} />}
      {nav.secao === 'equipe' && <Equipe crm={crm} convidar={() => setConvite(true)} />}
      {nav.secao === 'integracoes' && admin && <Integracoes crm={crm} visao={nav.visao} />}
      {nav.secao === 'config' && <Configuracoes crm={crm} visao={nav.visao} />}

      <NovoLeadDialog crm={crm} aberto={novoLead} aoMudar={setNovoLead} abrirLead={abrirLead} />
      <MotivoPerdaHost crm={crm} />
      {crm.appInstalavel && <PedirNome semNome={!crm.equipe.find((m) => m.id === crm.userId)?.nome?.trim()} aoSalvar={crm.salvarNome} />}
      {crm.appInstalavel && crm.empresa && crm.iconeApp && (
        <MarcaDoApp empresaId={crm.empresa.id} nome={crm.empresa.nome || 'CRM'} cor={crm.empresa.cor_primaria} versao={crm.iconeApp.split('v=')[1] ?? '0'} />
      )}
      <ConvidarDialog crm={crm} aberto={convite} aoMudar={setConvite} />
      <FichaLeadDialog crm={crm} lead={leadAberto} aoFechar={() => setLeadAberto(null)} abrirConversa={abrirConversaDoLead} />
      <NovaConversaDialog crm={crm} aberto={!!conversaComLead} aoMudar={(v) => { if (!v) setConversaComLead(null); }} leadInicial={conversaComLead} aoCriar={(id) => { setConversaComLead(null); irParaConversa(id); }} />
    </AppShell>
  );
}
