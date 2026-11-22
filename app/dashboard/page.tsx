'use client';

import { useMemo, useState } from 'react';
import { Building2, CalendarClock, LayoutDashboard, Settings } from 'lucide-react';
import { AppShell, ShellCarregando, useNavegacao, type ItemNotificacao, type Secao } from '@/components/shell/app-shell';
import { diasParaVencer, rotuloPlano, useDashboard, type EmpresaAdmin } from './_lib/use-dashboard';
import { Clientes, ConfigAdmin, NovaEmpresaDialog, Planos, SuspenderDialog, VisaoGeralAdmin } from './_components/telas';

const SECOES: Secao[] = [
  { id: 'visao', label: 'Visão geral', icone: LayoutDashboard, visoes: [{ id: 'resumo', label: 'Resumo' }] },
  { id: 'clientes', label: 'Clientes', icone: Building2, visoes: [{ id: 'todos', label: 'Todos' }, { id: 'ativos', label: 'Ativos' }, { id: 'suspensos', label: 'Suspensos' }] },
  { id: 'planos', label: 'Planos e validade', icone: CalendarClock, visoes: [{ id: 'vencendo', label: 'Vencendo' }, { id: 'todos', label: 'Todos' }] },
  { id: 'config', label: 'Configurações', icone: Settings, visoes: [{ id: 'conta', label: 'Conta' }] },
];

export default function SuperAdminDashboard() {
  const dash = useDashboard();
  const nav = useNavegacao(SECOES, 'visao');
  const [novaEmpresa, setNovaEmpresa] = useState(false);
  const [suspender, setSuspender] = useState<EmpresaAdmin | null>(null);

  const itensBusca = useMemo(() => dash.empresas.map((e) => ({
    id: e.id, titulo: e.nome, subtitulo: e.email ?? undefined, meta: `${rotuloPlano(e.plano)}${e.ativo ? '' : ' · suspensa'}`,
  })), [dash.empresas]);

  // Notificações: planos vencidos ou vencendo em até 7 dias
  const notificacoes = useMemo<ItemNotificacao[]>(() => dash.empresas
    .filter((e) => e.ativo)
    .map((e) => ({ e, d: diasParaVencer(e.valido_ate) }))
    .filter(({ d }) => d !== null && d <= 7)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
    .map(({ e, d }) => ({
      id: e.id,
      titulo: e.nome,
      subtitulo: d! < 0 ? `Plano venceu há ${-d!} ${d === -1 ? 'dia' : 'dias'}` : d === 0 ? 'Plano vence hoje' : `Plano vence em ${d} ${d === 1 ? 'dia' : 'dias'}`,
      tom: d! < 0 ? 'atrasada' : 'hoje',
    })), [dash.empresas]);

  if (dash.carregando) return <ShellCarregando texto="Carregando a torre de controle…" />;

  const usuarioEmail = dash.email?.split('@')[0] ?? 'admin';
  const nome = usuarioEmail.charAt(0).toUpperCase() + usuarioEmail.slice(1);
  const base = { dash, suspender: setSuspender, novaEmpresa: () => setNovaEmpresa(true) };

  return (
    <AppShell
      marca={{ nome: 'Dons CRM · Superadmin' }}
      usuario={{ nome, papel: 'Superadmin' }}
      secoes={SECOES}
      secao={nav.secao}
      visao={nav.visao}
      aoNavegar={nav.navegar}
      criar={{ rotulo: 'Nova empresa', aoClicar: () => setNovaEmpresa(true) }}
      busca={{ itens: itensBusca, placeholder: 'Buscar empresas', aoSelecionar: () => nav.navegar('clientes', 'todos') }}
      notificacoes={{ itens: notificacoes, vazio: 'Nenhum plano vencendo nos próximos 7 dias.', aoSelecionar: () => nav.navegar('planos', 'vencendo') }}
      aoSair={dash.sair}
    >
      {nav.secao === 'visao' && <VisaoGeralAdmin {...base} irPara={nav.navegar} />}
      {nav.secao === 'clientes' && <Clientes {...base} visao={nav.visao} />}
      {nav.secao === 'planos' && <Planos {...base} visao={nav.visao} />}
      {nav.secao === 'config' && <ConfigAdmin dash={dash} />}

      <NovaEmpresaDialog dash={dash} aberto={novaEmpresa} aoMudar={setNovaEmpresa} />
      <SuspenderDialog dash={dash} empresa={suspender} aoFechar={() => setSuspender(null)} />
    </AppShell>
  );
}
