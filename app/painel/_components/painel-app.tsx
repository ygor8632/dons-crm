'use client';

import { useMemo, useState } from 'react';
import { ChartNoAxesColumn, Inbox, LayoutDashboard, Plug, Settings, Users } from 'lucide-react';
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
const AJUDA_POR_SECAO: Record<string, string> = { visao: 'visao-geral', leads: 'leads', relatorios: 'relatorios', equipe: 'equipe', integracoes: 'integracoes', config: 'configuracoes' };
import { ConviteApp, MarcaDoApp } from '@/components/app/instalar';
import { Relatorios } from './relatorios';

/** O painel do cliente inteiro, para qualquer fonte de dados (Supabase ou a demonstração). */
export function PainelApp({ crm, aviso }: { crm: Painel; aviso?: React.ReactNode }) {
  const admin = crm.papel === 'admin';

  const secoes = useMemo<Secao[]>(() => [
    { id: 'visao', label: 'Visão geral', icone: LayoutDashboard, visoes: [{ id: 'resumo', label: 'Resumo' }, { id: 'atividade', label: 'Atividade' }] },
    { id: 'leads', label: 'Leads', icone: Inbox, visoes: [{ id: 'hoje', label: 'Hoje' }, { id: 'kanban', label: 'Kanban' }, { id: 'lista', label: 'Lista' }, { id: 'tarefas', label: 'Tarefas' }] },
    { id: 'relatorios', label: 'Relatórios', icone: ChartNoAxesColumn, visoes: [{ id: 'desempenho', label: 'Desempenho' }, { id: 'metas', label: 'Metas' }, { id: 'mensal', label: 'Relatório mensal' }] },
    { id: 'equipe', label: 'Equipe', icone: Users, visoes: [{ id: 'membros', label: 'Membros' }] },
    ...(admin ? [{ id: 'integracoes', label: 'Integrações', icone: Plug, visoes: [{ id: 'webhook', label: 'Webhook' }, { id: 'importar', label: 'Importar planilha' }] }] : []),
    {
      id: 'config', label: 'Configurações', icone: Settings,
      visoes: admin ? [{ id: 'marca', label: 'Marca' }, { id: 'funil', label: 'Funil' }, { id: 'mensagens', label: 'Mensagens' }, { id: 'privacidade', label: 'Privacidade' }, { id: 'perfil', label: 'Perfil' }] : [{ id: 'perfil', label: 'Perfil' }],
    },
  ], [admin]);

  const nav = useNavegacao(secoes, 'visao');
  const [novoLead, setNovoLead] = useState(false);
  const [convite, setConvite] = useState(false);
  const [leadAberto, setLeadAberto] = useState<Lead | null>(null);

  const itensBusca = useMemo(() => crm.leads.map((l) => ({
    id: l.id,
    titulo: l.nome,
    subtitulo: [l.telefone, l.email].filter(Boolean).join(' · ') || undefined,
    meta: crm.etapas.find((e) => e.id === l.etapa_id)?.nome ?? ((l.valor ?? 0) > 0 ? formatarMoeda(l.valor || 0) : undefined),
  })), [crm.leads, crm.etapas]);

  // Notificações: follow-ups atrasados ou para hoje
  const notificacoes = useMemo<ItemNotificacao[]>(() => {
    const agora = new Date();
    return crm.tarefas
      .map((t) => ({ t, g: grupoTarefa(t, agora) }))
      .filter(({ g }) => g === 'atrasada' || g === 'hoje')
      .map(({ t, g }) => ({
        id: t.id,
        titulo: t.descricao,
        subtitulo: `${g === 'atrasada' ? 'Atrasado' : 'Hoje'} · ${formatarDataHora(t.data_vencimento)} · ${crm.leads.find((l) => l.id === t.lead_id)?.nome ?? ''}`,
        tom: g === 'atrasada' ? 'atrasada' : 'hoje',
      }));
  }, [crm.tarefas, crm.leads]);

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
        vazio: 'Nenhum follow-up atrasado ou para hoje.',
        aoSelecionar: (id) => { const t = crm.tarefas.find((x) => x.id === id); if (t) abrirLeadPorId(t.lead_id); },
      }}
      aoSair={crm.sair}
      aoAbrirPerfil={() => nav.navegar('config', 'perfil')}
      ajudaHref={`/ajuda#${AJUDA_POR_SECAO[nav.secao] ?? 'comecar'}`}
      aviso={aviso ?? (crm.appInstalavel && crm.empresa ? <ConviteApp nome={crm.empresa.nome || 'CRM'} icone={crm.iconeApp} /> : undefined)}
    >
      {nav.secao === 'visao' && <VisaoGeral crm={crm} visao={nav.visao} abrirLead={abrirLead} irPara={nav.navegar} novoLead={() => setNovoLead(true)} />}
      {nav.secao === 'leads' && <Leads crm={crm} visao={nav.visao} abrirLead={abrirLead} novoLead={() => setNovoLead(true)} irPara={nav.navegar} />}
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
      <FichaLeadDialog crm={crm} lead={leadAberto} aoFechar={() => setLeadAberto(null)} />
    </AppShell>
  );
}
