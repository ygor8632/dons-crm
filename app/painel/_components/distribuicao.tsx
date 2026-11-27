'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, Shuffle, X } from 'lucide-react';
import { CardTitle, GlassCard, PageHeader, Toggle, iniciais } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { MembroRoleta, RegraRoleta } from '../_lib/tipos';
import { emAberto, tempoRelativo } from '../_lib/util';

type Regra = RegraRoleta & { chave: string };
let seq = 0;
const chave = () => `regra-${++seq}`;

/** Equipe › Distribuição: roleta de leads entre vendedores, com filas por origem. Só o admin chega aqui. */
export function Distribuicao({ crm }: { crm: Painel }) {
  const [carregado, setCarregado] = useState<{ membros: MembroRoleta[]; regras: RegraRoleta[] } | null>(null);
  const [ativa, setAtiva] = useState(!!crm.empresa?.distribuicao_ativa);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [distribuindo, setDistribuindo] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    void crm.carregarRoleta().then((r) => {
      if (!vivo) return;
      setCarregado(r);
      setAtiva(!!crm.empresa?.distribuicao_ativa);
      // Primeira vez: sugere os vendedores
      const ja = r.membros.filter((m) => m.participa).map((m) => m.perfil_id);
      setParticipantes(ja.length || r.membros.length ? ja : crm.equipe.filter((m) => m.role !== 'admin').map((m) => m.id));
      setRegras(r.regras.map((g) => ({ ...g, chave: chave() })));
    });
    return () => { vivo = false; };
  }, [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  const origens = useMemo(() => [...new Set(crm.leads.map((l) => l.origem?.trim()).filter((o): o is string => !!o))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [crm.leads]);
  const semDono = useMemo(() => crm.leads.filter((l) => !l.vendedor_id && emAberto(l, crm.etapas) && !l.anonimizado_em).length, [crm.leads, crm.etapas]);

  const nome = (id: string) => { const m = crm.equipe.find((x) => x.id === id); return m?.nome?.trim() || m?.email || 'Alguém'; };
  const dados = (id: string) => carregado?.membros.find((m) => m.perfil_id === id);

  // Próximo da vez na fila geral (mesma regra do banco)
  const proximo = useMemo(() => {
    const salvos = carregado?.membros.filter((m) => m.participa && participantes.includes(m.perfil_id)) ?? [];
    const novos = participantes.filter((id) => !salvos.some((m) => m.perfil_id === id));
    if (novos.length) return [...novos].sort()[0];
    return [...salvos].sort((a, b) => (a.ultimo_lead_em ?? '').localeCompare(b.ultimo_lead_em ?? '') || a.perfil_id.localeCompare(b.perfil_id))[0]?.perfil_id ?? null;
  }, [carregado, participantes]);

  const original = useMemo(() => carregado && JSON.stringify({
    a: !!crm.empresa?.distribuicao_ativa, p: carregado.membros.filter((m) => m.participa).map((m) => m.perfil_id).sort(), r: carregado.regras.map((g) => [g.origem, [...g.membros].sort()]),
  }), [carregado, crm.empresa?.distribuicao_ativa]);
  const atual = JSON.stringify({ a: ativa, p: [...participantes].sort(), r: regras.map((g) => [g.origem.trim(), [...g.membros].sort()]) });
  const mudou = !!carregado && original !== atual;

  const regrasRepetidas = new Set(regras.map((g) => g.origem.trim().toLowerCase()).filter((o, i, l) => o && l.indexOf(o) !== i));
  const problema = ativa && !participantes.length ? 'Escolha ao menos uma pessoa para receber leads.'
    : regras.some((g) => !g.origem.trim()) ? 'Escreva a origem de cada regra.'
      : regrasRepetidas.size ? 'Há duas regras para a mesma origem.'
        : regras.some((g) => !g.membros.length) ? 'Cada regra precisa de ao menos uma pessoa.'
          : null;

  const alternarParticipante = (id: string) => {
    setParticipantes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
    // Quem sai da roleta sai também das regras
    setRegras((l) => l.map((g) => ({ ...g, membros: g.membros.filter((x) => x !== id || !participantes.includes(id)) })));
  };

  const salvar = async () => {
    if (problema) return;
    setSalvando(true);
    const ok = await crm.salvarRoleta(ativa, participantes, regras.map(({ origem, membros }) => ({ origem, membros })));
    setSalvando(false);
    if (ok) setVersao((v) => v + 1);
  };

  const distribuir = async () => {
    setDistribuindo(true);
    await crm.distribuirSemResponsavel();
    setDistribuindo(false);
    setVersao((v) => v + 1);
  };

  if (!carregado) return <GlassCard className="grid min-h-60 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Carregando distribuição" /></GlassCard>;

  return (
    <div className="space-y-5 pb-20">
      <PageHeader titulo="Distribuição de leads" subtitulo="Leads que chegam sozinhos (site e WhatsApp) vão para o próximo vendedor da vez, sem ninguém precisar repassar." />

      <GlassCard className="max-w-3xl space-y-3">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Roleta automática</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vale para leads sem responsável que entram pelo webhook do site e pelo WhatsApp. A vez é de quem está há mais tempo sem receber.
              Cadastro manual e importação de planilha não passam pela roleta.
            </p>
          </div>
          <Toggle ativo={ativa} aoMudar={setAtiva} rotulo="Roleta automática" />
        </div>
      </GlassCard>

      <GlassCard className="max-w-3xl">
        <CardTitle titulo="Quem recebe leads" descricao="Marque quem entra na fila. Quem sai continua com os leads que já tem." />
        <ul className="mt-3 divide-y divide-border/60">
          {crm.equipe.map((m) => {
            const dentro = participantes.includes(m.id);
            const d = dados(m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pill-active/80 text-xs font-bold dark:bg-white/10" aria-hidden>{iniciais(m.nome || m.email)}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-semibold">
                    <span className="truncate">{nome(m.id)}</span>
                    {m.role === 'admin' && <span className="text-[11px] font-normal text-muted-foreground">Administrador</span>}
                    {dentro && ativa && proximo === m.id && <span className="rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-semibold text-foreground">Próximo da vez</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d?.recebidos ? `${d.recebidos} pela roleta` : 'Ainda não recebeu pela roleta'}
                    {d?.ultimo_lead_em ? ` · último ${tempoRelativo(d.ultimo_lead_em)}` : ''}
                  </p>
                </div>
                <Toggle ativo={dentro} aoMudar={() => alternarParticipante(m.id)} rotulo={`${nome(m.id)} recebe leads`} />
              </li>
            );
          })}
        </ul>
      </GlassCard>

      <GlassCard className="max-w-3xl">
        <CardTitle
          titulo="Filas por origem"
          descricao="Opcional. Leads dessa origem vão só para as pessoas marcadas. As outras origens usam a fila geral."
          acao={<Button variant="outline" size="sm" onClick={() => setRegras((l) => [...l, { chave: chave(), origem: '', membros: [] }])} disabled={!participantes.length || regras.length >= 30}><Plus /> Nova regra</Button>}
        />
        <datalist id="roleta-origens">{origens.map((o) => <option key={o} value={o} />)}</datalist>
        {regras.length === 0 ? (
          <p className="mt-3 rounded-xl bg-pill-active/50 px-3 py-3 text-xs text-muted-foreground dark:bg-white/6">Sem regras: todos os leads usam a fila geral. Exemplo de uso: leads do Google Ads só para quem atende orçamento.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {regras.map((g, i) => (
              <li key={g.chave} className="rounded-2xl border border-glass-border p-3">
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={g.chave}>Origem da regra {i + 1}</label>
                  <Input
                    id={g.chave}
                    list="roleta-origens"
                    value={g.origem}
                    maxLength={60}
                    placeholder="Origem (ex.: Google Ads)"
                    aria-invalid={!g.origem.trim() || regrasRepetidas.has(g.origem.trim().toLowerCase())}
                    onChange={(e) => setRegras((l) => l.map((x) => (x.chave === g.chave ? { ...x, origem: e.target.value } : x)))}
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => setRegras((l) => l.filter((x) => x.chave !== g.chave))} aria-label={`Remover regra ${g.origem || i + 1}`}><X /></Button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={`Quem recebe leads de ${g.origem || 'esta origem'}`}>
                  {participantes.map((id) => {
                    const marcado = g.membros.includes(id);
                    return (
                      <button key={id} type="button" aria-pressed={marcado}
                        onClick={() => setRegras((l) => l.map((x) => (x.chave === g.chave ? { ...x, membros: marcado ? x.membros.filter((y) => y !== id) : [...x.membros, id] } : x)))}
                        className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                          marcado ? 'bg-foreground text-background' : 'bg-pill-active/60 text-muted-foreground hover:text-foreground dark:bg-white/8')}>
                        {marcado && <Check className="size-3" aria-hidden />}{nome(id).split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard className="max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{semDono ? `${semDono} ${semDono === 1 ? 'lead em aberto está' : 'leads em aberto estão'} sem responsável` : 'Todos os leads em aberto têm responsável'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Passa os mais antigos primeiro pela roleta, seguindo as filas acima. Útil depois de importar uma planilha.</p>
          </div>
          <Button variant="outline" onClick={distribuir} disabled={!semDono || distribuindo || mudou || !carregado.membros.some((m) => m.participa)} title={mudou ? 'Salve as mudanças antes' : undefined}>
            {distribuindo ? <Loader2 className="animate-spin" /> : <Shuffle />} Distribuir agora
          </Button>
        </div>
        {mudou && semDono > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Salve as mudanças antes de distribuir.</p>}
      </GlassCard>

      {/* Barra de salvar: aparece só com mudanças */}
      {mudou && (
        <div role="region" aria-label="Mudanças não salvas" className="glass-strong sticky bottom-24 z-30 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl px-4 py-3 md:bottom-24">
          <p className="min-w-0 flex-1 text-[13px]">{problema ? <span className="text-destructive">{problema}</span> : 'Você tem mudanças não salvas.'}</p>
          <Button variant="ghost" onClick={() => setVersao((v) => v + 1)} disabled={salvando}>Descartar</Button>
          <Button onClick={salvar} disabled={!!problema || salvando}>{salvando ? <Loader2 className="animate-spin" /> : <Check />} Salvar</Button>
        </div>
      )}
    </div>
  );
}
