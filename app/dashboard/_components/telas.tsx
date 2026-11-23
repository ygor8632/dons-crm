'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, Building2, CalendarClock, CircleCheck, Database, Lock, Moon, Search, Sun, Unlock, Users } from 'lucide-react';
import { CardTitle, EmptyState, GlassCard, PageHeader, StatCard, Toggle, iniciais } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTema } from '@/components/theme/theme';
import { CampoNome } from '@/components/conta/campo-nome';
import { cn } from '@/lib/utils';
import { COR_PADRAO, corSolida } from '@/lib/marca';
import { PreviaTemplate } from './implantacao';
import { TEMPLATES } from '@/lib/templates-segmento';
import { PLANOS, avaliarSaude, diasParaVencer, rotuloPlano, type Dashboard, type EmpresaAdmin, type NivelSaude } from '../_lib/use-dashboard';

type Base = { dash: Dashboard; suspender: (e: EmpresaAdmin) => void; novaEmpresa: () => void };

const CORES_PLANO = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

function Dica({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { name?: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="font-medium capitalize">{label ?? payload[0].payload.name}</p>
      <p className="tabular text-muted-foreground">{payload[0].value} {payload[0].value === 1 ? 'empresa' : 'empresas'}</p>
    </div>
  );
}

/* ---------------- Visão geral ---------------- */

export function VisaoGeralAdmin({ dash, suspender, novaEmpresa, irPara }: Base & { irPara: (s: string, v?: string) => void }) {
  const { empresas, perfis, totalLeads } = dash;
  const ativas = empresas.filter((e) => e.ativo);
  const vencendo = empresas.filter((e) => { const d = diasParaVencer(e.valido_ate); return e.ativo && d !== null && d <= 30; });

  const novasPorMes = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 6 }, (_, k) => {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() + k - 5, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + k - 4, 1);
      return {
        mes: ini.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        n: empresas.filter((e) => { const d = new Date(e.created_at); return d >= ini && d < fim; }).length,
        atual: k === 5,
      };
    });
  }, [empresas]);

  const porPlano = PLANOS.map((p) => ({ name: p.label, value: empresas.filter((e) => e.plano === p.id).length }));

  return (
    <div className="space-y-6">
      <PageHeader titulo="Torre de controle" subtitulo="Clientes, acessos e validade dos planos do Dons CRM." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 [&>*]:min-w-0">
          <StatCard className="col-span-2 sm:col-span-1" destaque rotulo="Empresas ativas" icone={Building2} valor={ativas.length} legenda={`de ${empresas.length} cadastradas`} />
          <StatCard rotulo="Usuários" icone={Users} valor={perfis.length} legenda="em todas as empresas" />
          <StatCard rotulo="Leads na plataforma" icone={Database} valor={totalLeads.toLocaleString('pt-BR')} legenda="total acumulado" />
          <StatCard className="col-span-2 sm:col-span-1" rotulo="Vencem em 30 dias" icone={CalendarClock} valor={vencendo.length} legenda={vencendo.length ? 'precisam de renovação' : 'nenhuma pendência'} />
        </div>

        <GlassCard className="flex flex-col lg:col-span-5">
          <CardTitle titulo="Novos clientes" descricao="Empresas cadastradas por mês" />
          <div className="mt-4 h-56 min-h-56" role="img" aria-label={`Novos clientes por mês: ${novasPorMes.map((m) => `${m.mes} ${m.n}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer={false} data={novasPorMes} margin={{ top: 8, right: 4, left: -28, bottom: 0 }} barCategoryGap="28%">
                <defs>
                  <pattern id="hachura-admin" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="var(--brand)" opacity="0.55" />
                    <rect width="3" height="6" fill="var(--brand)" />
                  </pattern>
                </defs>
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip cursor={{ fill: 'var(--muted)', radius: 8 }} content={<Dica />} />
                <Bar dataKey="n" radius={[8, 8, 8, 8]} maxBarSize={34}>
                  {novasPorMes.map((m) => <Cell key={m.mes} fill={m.atual ? 'url(#hachura-admin)' : 'var(--foreground)'} fillOpacity={m.atual ? 1 : 0.86} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-4">
          <CardTitle titulo="Planos" descricao="Distribuição dos clientes" />
          <div className="mt-2 flex items-center gap-5">
            <div className="relative size-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer={false}>
                  <Pie rootTabIndex={-1} data={porPlano.filter((p) => p.value > 0)} dataKey="value" innerRadius="70%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={false}>
                    {porPlano.map((p, i) => p.value > 0 && <Cell key={p.name} fill={CORES_PLANO[i]} />)}
                  </Pie>
                  <Tooltip content={<Dica />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><p className="tabular text-xl font-bold">{empresas.length}</p><p className="text-[11px] text-muted-foreground">clientes</p></div>
              </div>
            </div>
            <ul className="w-full space-y-2.5 text-xs">
              {porPlano.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: CORES_PLANO[i] }} aria-hidden />{p.name}</span>
                  <span className="tabular text-muted-foreground">{p.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>

        <GlassCard className="p-2 sm:p-3 lg:col-span-8">
          <div className="flex items-center justify-between px-3 pt-2 pb-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Clientes recentes</h2>
            <Button size="xs" variant="outline" onClick={() => irPara('clientes')}>Ver todos</Button>
          </div>
          <TabelaClientes dash={dash} empresas={empresas.slice(0, 4)} suspender={suspender} novaEmpresa={novaEmpresa} compacta />
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------------- Clientes ---------------- */

export function Clientes({ dash, suspender, novaEmpresa, visao }: Base & { visao: string }) {
  const [busca, setBusca] = useState('');
  const lista = dash.empresas
    .filter((e) => (visao === 'ativos' ? e.ativo : visao === 'suspensos' ? !e.ativo : true))
    .filter((e) => e.nome?.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Clientes"
        subtitulo={`${dash.empresas.filter((e) => e.ativo).length} ativos · ${dash.empresas.filter((e) => !e.ativo).length} suspensos`}
        acoes={<Button onClick={novaEmpresa}>Nova empresa</Button>}
      />
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por nome" aria-label="Filtrar clientes" className="h-10 w-full rounded-full border border-glass-border bg-pill-active/55 pr-4 pl-10 text-[13px] placeholder:text-muted-foreground dark:bg-white/6" />
      </div>
      <GlassCard className="p-2 sm:p-3">
        <TabelaClientes dash={dash} empresas={lista} suspender={suspender} novaEmpresa={novaEmpresa} />
      </GlassCard>
    </div>
  );
}

function Validade({ valido_ate }: { valido_ate?: string | null }) {
  const d = diasParaVencer(valido_ate);
  if (d === null) return <span className="text-muted-foreground">Vitalício</span>;
  const data = new Date(valido_ate!).toLocaleDateString('pt-BR');
  if (d < 0) return <span className="inline-flex items-center gap-1.5 rounded-full bg-negative px-2 py-0.5 text-xs font-semibold text-negative-foreground">Venceu {data}</span>;
  if (d <= 7) return <span className="inline-flex items-center gap-1.5 rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-warning-foreground">{d === 0 ? 'Vence hoje' : `${d} ${d === 1 ? 'dia' : 'dias'}`} · {data}</span>;
  return <span className="tabular">{data}</span>;
}

function TabelaClientes({ dash, empresas, suspender, novaEmpresa, compacta }: Base & { empresas: EmpresaAdmin[]; compacta?: boolean }) {
  if (empresas.length === 0) {
    return <EmptyState icone={Building2} titulo="Nenhum cliente aqui" texto="Cadastre uma empresa para criar o ambiente e convidar o administrador." acao={<Button size="sm" onClick={novaEmpresa}>Nova empresa</Button>} />;
  }
  const th = 'bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5';
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className={cn(th, 'rounded-l-xl')}>Empresa</th>
            <th className={th}>Plano</th>
            <th className={th}>Validade</th>
            <th className={th}>Status</th>
            <th className={cn(th, 'rounded-r-xl text-right')}><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((e) => {
            const n = dash.membros(e.id);
            return (
              <tr key={e.id} className="border-b border-border/60 last:border-0">
                <td className="max-w-[320px] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: corSolida(e.cor_primaria || COR_PADRAO).fundo, color: corSolida(e.cor_primaria || COR_PADRAO).texto }} aria-hidden>{iniciais(e.nome)}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold" title={e.nome}>{e.nome}</p>
                      <p className="text-xs text-muted-foreground">{n} {n === 1 ? 'membro' : 'membros'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{rotuloPlano(e.plano)}</span></td>
                <td className="px-3 py-3"><Validade valido_ate={e.valido_ate} /></td>
                <td className="px-3 py-3">
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', e.ativo ? 'text-positive-foreground' : 'text-negative-foreground')}>
                    <span className={cn('size-2 rounded-full', e.ativo ? 'bg-chart-5' : 'bg-destructive')} aria-hidden />
                    {e.ativo ? 'Ativa' : 'Suspensa'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {!compacta && (
                    <Button size="xs" variant={e.ativo ? 'destructive' : 'outline'} onClick={() => suspender(e)}>
                      {e.ativo ? <><Lock /> Suspender</> : <><Unlock /> Reativar</>}
                    </Button>
                  )}
                  {compacta && <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('pt-BR')}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Planos e validade ---------------- */

export function Planos({ dash, suspender, novaEmpresa, visao }: Base & { visao: string }) {
  const ordenadas = [...dash.empresas].sort((a, b) => (diasParaVencer(a.valido_ate) ?? 1e9) - (diasParaVencer(b.valido_ate) ?? 1e9));
  const lista = visao === 'vencendo' ? ordenadas.filter((e) => { const d = diasParaVencer(e.valido_ate); return d !== null && d <= 30; }) : ordenadas;
  return (
    <div className="space-y-5">
      <PageHeader titulo="Planos e validade" subtitulo="Ordenado pelo vencimento mais próximo. Renove antes de o acesso expirar." />
      <GlassCard className="p-2 sm:p-3">
        {lista.length === 0 ? (
          <EmptyState icone={CalendarClock} titulo="Nada vencendo nos próximos 30 dias" texto="Quando um plano estiver perto do fim, ele aparece aqui e no sino." />
        ) : (
          <TabelaClientes dash={dash} empresas={lista} suspender={suspender} novaEmpresa={novaEmpresa} />
        )}
      </GlassCard>
    </div>
  );
}

/* ---------------- Configurações ---------------- */

export function ConfigAdmin({ dash }: { dash: Dashboard }) {
  const { escuro, alternar, seguirSistema } = useTema();
  return (
    <div className="space-y-5">
      <PageHeader titulo="Configurações" subtitulo="Seu nome, seus dados de acesso e as preferências deste aparelho." />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <GlassCard>
          <CardTitle titulo="Conta" />
          <div className="mt-4"><CampoNome inicial={dash.nome} aoSalvar={dash.salvarNome} /></div>
          <div className="mt-5 space-y-2"><Label htmlFor="adm-email">E-mail</Label><Input id="adm-email" disabled value={dash.email ?? ''} /></div>
        </GlassCard>
        <GlassCard>
          <CardTitle titulo="Aparência" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-[13px] font-medium">{escuro ? <Moon className="size-4" /> : <Sun className="size-4" />} Vidro fumê (modo escuro)</span>
              <Toggle ativo={escuro} aoMudar={alternar} rotulo="Vidro fumê" />
            </div>
            <Button size="sm" variant="outline" onClick={seguirSistema}>Seguir o sistema</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------------- Diálogos ---------------- */

const VAZIO = { nome: '', emailAdmin: '', plano: 'trial', validoAte: '', segmento: 'geral' };

export function NovaEmpresaDialog({ dash, aberto, aoMudar }: { dash: Dashboard; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const [d, setD] = useState(VAZIO);
  const [criando, setCriando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriando(true);
    if (await dash.criarEmpresa(d)) { setD(VAZIO); aoMudar(false); }
    setCriando(false);
  };
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>Cria o ambiente do cliente com o template do segmento e envia o convite ao administrador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="ne-nome">Nome da empresa *</Label><Input id="ne-nome" required value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="ne-email">E-mail do administrador *</Label><Input id="ne-email" type="email" required value={d.emailAdmin} onChange={(e) => setD({ ...d, emailAdmin: e.target.value })} placeholder="admin@empresa.com.br" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ne-plano">Plano</Label>
              <select id="ne-plano" value={d.plano} onChange={(e) => setD({ ...d, plano: e.target.value })} className="h-10 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] dark:bg-white/6">
                {PLANOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="ne-validade">Válido até</Label><Input id="ne-validade" type="date" value={d.validoAte} onChange={(e) => setD({ ...d, validoAte: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ne-segmento">Segmento</Label>
            <select id="ne-segmento" value={d.segmento} onChange={(e) => setD({ ...d, segmento: e.target.value })} className="h-10 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] dark:bg-white/6">
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <PreviaTemplate id={d.segmento} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>Cancelar</Button>
            <Button type="submit" disabled={criando}>{criando ? 'Criando…' : 'Criar e convidar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SuspenderDialog({ dash, empresa, aoFechar }: { dash: Dashboard; empresa: EmpresaAdmin | null; aoFechar: () => void }) {
  return (
    <Dialog open={!!empresa} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{empresa?.ativo ? `Suspender ${empresa?.nome}?` : `Reativar ${empresa?.nome}?`}</DialogTitle>
          <DialogDescription>
            {empresa?.ativo ? 'Toda a equipe perde o acesso na hora. Os dados ficam guardados e voltam ao reativar.' : 'A equipe volta a entrar normalmente.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
          <Button variant={empresa?.ativo ? 'destructive' : 'default'} onClick={async () => { if (empresa) await dash.alternarStatus(empresa); aoFechar(); }}>
            {empresa?.ativo ? 'Suspender acesso' : 'Reativar acesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Saúde de adoção ---------------- */

const NIVEIS: Record<NivelSaude, { rotulo: string; classe: string; ordem: number }> = {
  risco: { rotulo: 'Em risco', classe: 'bg-destructive/12 text-destructive', ordem: 0 },
  atencao: { rotulo: 'Atenção', classe: 'bg-amber-500/15 text-amber-800 dark:text-amber-200', ordem: 1 },
  saudavel: { rotulo: 'Saudável', classe: 'bg-positive text-positive-foreground', ordem: 2 },
  sem_uso: { rotulo: 'Sem uso', classe: 'bg-foreground/8 text-muted-foreground', ordem: 3 },
};

function haQuanto(iso: string | null) {
  if (!iso) return 'nunca';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
}

export function Saude({ dash }: { dash: Dashboard }) {
  const linhas = useMemo(() => dash.empresas
    .filter((e) => e.ativo)
    .map((e) => { const s = dash.saude.find((x) => x.empresa_id === e.id); return { e, s, ...avaliarSaude(s) }; })
    .sort((a, b) => NIVEIS[a.nivel].ordem - NIVEIS[b.nivel].ordem || a.e.nome.localeCompare(b.e.nome)), [dash.empresas, dash.saude]);
  const contar = (n: NivelSaude) => linhas.filter((l) => l.nivel === n).length;

  return (
    <div className="space-y-6">
      <PageHeader titulo="Saúde dos clientes" subtitulo="Quem está usando o CRM nesta semana e onde o funil está ficando para trás. Clientes suspensos ficam de fora." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        <StatCard rotulo="Em risco" icone={AlertTriangle} valor={contar('risco')} legenda="pedem contato esta semana" />
        <StatCard rotulo="Atenção" icone={Activity} valor={contar('atencao')} legenda="algum sinal de queda" />
        <StatCard rotulo="Saudáveis" icone={CircleCheck} valor={contar('saudavel')} legenda="time usando, funil em dia" />
        <StatCard rotulo="Sem uso" icone={Users} valor={contar('sem_uso')} legenda="ainda não começaram" />
      </div>
      <GlassCard className="p-2 sm:p-3">
        {linhas.length === 0 ? (
          <EmptyState icone={Building2} titulo="Nenhum cliente ativo" texto="Quando houver empresas ativas, a adoção de cada uma aparece aqui." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="rounded-l-xl bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Cliente</th>
                  <th className="bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Situação</th>
                  <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Ativos na semana</th>
                  <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Leads 7 dias</th>
                  <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Sem próximo passo</th>
                  <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Atrasados</th>
                  <th className="bg-pill-active/55 px-3 py-2.5 text-right font-medium dark:bg-white/5">Parados</th>
                  <th className="rounded-r-xl bg-pill-active/55 px-3 py-2.5 font-medium dark:bg-white/5">Último uso</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {linhas.map(({ e, s, nivel, motivos }) => {
                  const queda = s && s.leads_7d_anterior > 0 ? Math.round(((s.leads_7d - s.leads_7d_anterior) / s.leads_7d_anterior) * 100) : null;
                  return (
                    <tr key={e.id} className="border-b border-border/60 align-top last:border-0">
                      <td className="max-w-[220px] px-3 py-3"><span className="block truncate font-medium">{e.nome}</span><span className="text-xs text-muted-foreground">{rotuloPlano(e.plano)}</span></td>
                      <td className="max-w-[280px] px-3 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', NIVEIS[nivel].classe)}>{NIVEIS[nivel].rotulo}</span>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{motivos.map((m) => <li key={m}>{m}</li>)}</ul>
                      </td>
                      <td className="px-3 py-3 text-right">{s ? `${s.ativos_7d} de ${s.usuarios}` : '—'}</td>
                      <td className="px-3 py-3 text-right">
                        {s?.leads_7d ?? '—'}
                        {queda != null && <span className={cn('block text-xs', queda < 0 ? 'text-destructive' : 'text-muted-foreground')}>{queda > 0 ? '+' : ''}{queda}% vs. semana anterior</span>}
                      </td>
                      <td className="px-3 py-3 text-right">{s ? `${s.sem_proximo_passo} de ${s.abertos}` : '—'}</td>
                      <td className={cn('px-3 py-3 text-right', (s?.atrasados ?? 0) >= 3 && 'text-destructive')}>{s?.atrasados ?? '—'}</td>
                      <td className="px-3 py-3 text-right">{s?.parados ?? '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{haQuanto(s?.ultima_atividade ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
      <p className="text-xs text-muted-foreground">Uso conta registros feitos pelo time: mudanças de etapa, anotações, follow-ups e mensagens de WhatsApp. Leads que chegam sozinhos pelo webhook não contam como uso.</p>
    </div>
  );
}
