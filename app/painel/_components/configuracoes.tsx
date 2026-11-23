'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, FileUp, ImageUp, MessageSquareText, Moon, Plus, Sun, X } from 'lucide-react';
import { CardTitle, GlassCard, PageHeader, Toggle } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoldToDeleteButton } from '@/components/microkit/hold-to-delete-button';
import { useTema } from '@/components/theme/theme';
import { CampoNome } from '@/components/conta/campo-nome';
import { COR_PADRAO, corSolida, hexValido } from '@/lib/marca';
import { PassosIphone, useInstalacao } from '@/components/app/instalar';
import { MOTIVOS_PADRAO } from '@/lib/templates-segmento';
import type { TipoImagem } from '@/lib/marca-storage';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';
import type { RegistroAcesso } from '../_lib/tipos';
import { acharDuplicados, CAMPOS_IMPORTACAO, lerPlanilha, montarLinhas, preencherModelo, ROTULO_ACESSO, formatarDataHora, type CampoImportacao } from '../_lib/util';

/* ---------------- Configurações: Marca · Funil · Perfil ---------------- */

export function Configuracoes({ crm, visao }: { crm: Painel; visao: string }) {
  if (visao === 'marca' && crm.papel === 'admin') return <Marca crm={crm} />;
  if (visao === 'funil' && crm.papel === 'admin') return <Funil crm={crm} />;
  if (visao === 'mensagens' && crm.papel === 'admin') return <Mensagens crm={crm} />;
  if (visao === 'privacidade' && crm.papel === 'admin') return <Privacidade crm={crm} />;
  return <Perfil crm={crm} />;
}

function Marca({ crm }: { crm: Painel }) {
  const emp = crm.empresa;
  const [nome, setNome] = useState(emp?.nome ?? '');
  const [cor, setCor] = useState(emp?.cor_primaria || COR_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const corValida = hexValido(cor) ? cor : COR_PADRAO;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    await crm.salvarMarca({ nome, cor_primaria: corValida });
    setSalvando(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Identidade visual" subtitulo="Nome, cor, logo e imagem de fundo do painel da sua equipe." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        <GlassCard className="lg:col-span-7">
          <form onSubmit={salvar} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="marca-nome">Nome da empresa</Label>
              <Input id="marca-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca-cor">Cor principal</Label>
              <div className="flex gap-2">
                <input id="marca-cor" type="color" value={corValida} onChange={(e) => setCor(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-input bg-transparent p-1" aria-label="Escolher cor" />
                <Input value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Código da cor" aria-invalid={!hexValido(cor)} className="font-mono" />
              </div>
              <p className="text-xs text-muted-foreground">Pinta destaques, barras, alternâncias e o fundo padrão.</p>
            </div>
            <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar nome e cor'}</Button>
          </form>
        </GlassCard>
        <GlassCard className="lg:col-span-5">
          <CardTitle titulo="Prévia" descricao="Como a cor aparece nos destaques" />
          <div className="mt-5 space-y-4" style={{ ['--brand' as string]: corValida }}>
            <div className="flex items-end gap-2" aria-hidden>
              {[40, 64, 52, 78, 60, 92].map((h, i) => (
                <div key={i} className={i === 5 ? 'hatch flex-1 rounded-lg text-brand' : 'flex-1 rounded-lg bg-foreground/80'} style={{ height: h }} />
              ))}
            </div>
            <div className="h-2 rounded-full bg-chart-muted"><div className="h-full w-2/3 rounded-full bg-brand" /></div>
            <div className="flex items-center gap-3 text-xs"><Toggle ativo aoMudar={() => {}} rotulo="Exemplo de alternância" /> Alternâncias ativas</div>
          </div>
        </GlassCard>

        <EnvioImagem
          className="lg:col-span-5"
          crm={crm}
          tipo="logo"
          titulo="Logo"
          dica="PNG, JPEG ou WebP. Reduzimos para 512 px e mantemos a transparência."
          atual={crm.imagens.logo}
        />
        <EnvioImagem
          className="lg:col-span-7"
          crm={crm}
          tipo="fundo"
          titulo="Imagem de fundo"
          dica="Uma foto ampla e sem texto funciona melhor. Reduzimos para 2400 px; o vidro fica mais opaco sobre ela para manter a leitura."
          atual={crm.imagens.fundo}
        />
        <AppCelular crm={crm} className="lg:col-span-12" admin />
      </div>
    </div>
  );
}

/** Ícone e nome do app na tela inicial; para o admin, refazer o ícone a partir do logo. */
function AppCelular({ crm, className, admin }: { crm: Painel; className?: string; admin?: boolean }) {
  const { instalado, ios, podeInstalar, instalar } = useInstalacao();
  const [gerando, setGerando] = useState(false);
  const nome = crm.empresa?.nome || 'CRM';
  const solida = corSolida(crm.empresa?.cor_primaria || COR_PADRAO);
  const sigla = nome.trim().split(/\s+/).filter((p) => p && !/^(ltda|me|epp|eireli|s\/?a|sa|mei|cia|e|de|da|do|das|dos)\.?$/i.test(p));
  const usar = sigla.length ? sigla : nome.trim().split(/\s+/);
  const iniciais = ((usar[0]?.[0] ?? 'C') + (usar.length > 1 ? usar[usar.length - 1][0] : usar[0]?.[1] ?? '')).toUpperCase();

  return (
    <GlassCard className={cn('flex flex-col gap-5 sm:flex-row sm:items-center', className)}>
      <div className="flex shrink-0 flex-col items-center gap-1.5 rounded-[26px] bg-[linear-gradient(160deg,#30425f,#1b1716)] px-7 py-5" aria-label={`Prévia do ícone ${nome} na tela inicial`} role="img">
        {crm.iconeApp ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crm.iconeApp} alt="" width={64} height={64} className="size-16 rounded-[15px] shadow-lg" />
        ) : (
          <span className="grid size-16 place-items-center rounded-[15px] text-xl font-bold shadow-lg" style={{ background: solida.fundo, color: solida.texto }}>{iniciais}</span>
        )}
        <span className="max-w-24 truncate text-[11px] font-medium text-white">{nome}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <CardTitle titulo="App no celular" descricao={`A equipe instala o ${nome} na tela inicial, com este ícone. Abre direto no CRM, em tela cheia.`} />
        {admin && <p className="text-xs text-muted-foreground">O ícone sai do logo (com fundo branco) ou, sem logo, das iniciais na cor da marca. Ele se atualiza sozinho quando você troca o logo.</p>}
        {instalado ? (
          <p className="text-[13px] font-medium text-positive-foreground">Você está usando o app instalado.</p>
        ) : ios ? (
          <PassosIphone nome={nome} className="pt-1" />
        ) : (
          <p className="text-xs text-muted-foreground">No Android e no computador, use o botão abaixo ou o menu do navegador › Instalar app. No iPhone, abra no Safari › Compartilhar › Adicionar à Tela de Início.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {!instalado && podeInstalar && <Button size="sm" onClick={() => void instalar()}><Download /> Instalar app</Button>}
          {admin && (
            <Button size="sm" variant="outline" disabled={gerando} onClick={async () => { setGerando(true); await crm.gerarIconeApp(); setGerando(false); }}>
              {gerando ? 'Gerando…' : crm.imagens.logo ? 'Refazer ícone com o logo' : 'Atualizar ícone'}
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function EnvioImagem({ crm, tipo, titulo, dica, atual, className }: { crm: Painel; tipo: TipoImagem; titulo: string; dica: string; atual: string | null; className?: string }) {
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const enviar = async (arquivo?: File | null) => {
    if (!arquivo || enviando) return;
    setEnviando(true);
    await crm.enviarMarca(tipo, arquivo);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <GlassCard
      className={cn('flex flex-col', arrastando && 'shadow-[inset_0_0_0_2px_var(--brand)]', className)}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); void enviar(e.dataTransfer.files?.[0]); }}
    >
      <CardTitle titulo={titulo} descricao={dica} />
      <div
        className={cn(
          'relative mt-4 grid flex-1 place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-pill-active/35 dark:bg-white/4',
          tipo === 'logo' ? 'min-h-40' : 'aspect-[16/9] min-h-40',
        )}
      >
        {atual ? (
          tipo === 'logo' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={atual} alt={`Logo atual de ${crm.empresa?.nome ?? 'sua empresa'}`} className="max-h-28 max-w-[70%] object-contain" />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={atual} alt="Imagem de fundo atual" className="absolute inset-0 size-full object-cover" />
              {/* Amostra de vidro por cima, para julgar a leitura */}
              <div className="glass relative w-3/5 rounded-2xl p-3 text-left" aria-hidden>
                <p className="text-[13px] font-semibold">Seu funil hoje</p>
                <p className="text-[11px] text-muted-foreground">Assim o texto aparece sobre o fundo</p>
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-muted-foreground">
            <ImageUp className="size-6" aria-hidden />
            <span className="text-xs">{tipo === 'logo' ? 'Sem logo: usamos as iniciais da empresa.' : 'Sem imagem: usamos o gradiente quente com a sua cor.'}</span>
            <span className="text-xs">Arraste um arquivo para cá.</span>
          </div>
        )}
        {enviando && (
          <div className="absolute inset-0 grid place-items-center bg-[var(--scrim)] text-[13px] font-medium text-white" role="status">
            Enviando…
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => void enviar(e.target.files?.[0])}
          aria-label={tipo === 'logo' ? 'Arquivo do logo' : 'Arquivo da imagem de fundo'}
          tabIndex={-1}
        />
        <Button type="button" disabled={enviando} onClick={() => inputRef.current?.click()}>
          <ImageUp /> {atual ? 'Trocar imagem' : 'Enviar imagem'}
        </Button>
        {atual && (
          <HoldToDeleteButton
            rotulo="Remover"
            rotuloFeito="Removida"
            descricao={tipo === 'logo' ? 'logo' : 'imagem de fundo'}
            aoConfirmar={() => crm.removerMarca(tipo)}
          />
        )}
      </div>
    </GlassCard>
  );
}

function Funil({ crm }: { crm: Painel }) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#5d73e0');
  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    await crm.adicionarEtapa(nome.trim(), cor);
    setNome('');
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Etapas do funil" subtitulo="A ordem aqui é a ordem das colunas do Kanban. A última etapa conta como venda." />
      <GlassCard className="max-w-3xl">
        <p className="mb-3 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Chance</strong> é a probabilidade de fechar quem está na etapa; com ela o Kanban mostra o valor ponderado.{' '}
          <strong className="font-medium text-foreground">Parado após</strong> é quantos dias sem nenhuma atividade até o card ganhar o aviso “parado”.
        </p>
        <ol className="space-y-2">
          {crm.etapas.map((etapa, i) => {
            const n = crm.leads.filter((l) => l.etapa_id === etapa.id && (l.situacao ?? 'aberto') !== 'perdido').length;
            const ultima = i === crm.etapas.length - 1;
            return (
              <li key={etapa.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-pill-active/45 px-3 py-2.5 dark:bg-white/5">
                <span className="tabular w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} aria-hidden />
                <span className="min-w-[8rem] flex-1 truncate text-[13px] font-medium">{etapa.nome}</span>
                <span className="tabular text-xs text-muted-foreground">{n} {n === 1 ? 'lead' : 'leads'}</span>
                {ultima ? (
                  <span className="text-xs text-muted-foreground">Venda concluída · 100%</span>
                ) : (
                  <>
                    <CampoNumero rotulo="Chance" sufixo="%" min={0} max={100} valor={etapa.probabilidade ?? null} aoSalvar={(v) => crm.salvarEtapa(etapa.id, { probabilidade: v })} etapa={etapa.nome} />
                    <CampoNumero rotulo="Parado após" sufixo="dias" min={1} max={365} valor={etapa.dias_parado ?? null} aoSalvar={(v) => crm.salvarEtapa(etapa.id, { dias_parado: v })} etapa={etapa.nome} />
                  </>
                )}
                <HoldToDeleteButton rotulo="Excluir" rotuloFeito="Excluída" descricao={`etapa ${etapa.nome}`} aoConfirmar={() => crm.removerEtapa(etapa)} />
              </li>
            );
          })}
        </ol>
        <form onSubmit={adicionar} className="mt-4 flex gap-2 border-t border-border pt-4">
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Cor da nova etapa" className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-input bg-transparent p-1" />
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da nova etapa" aria-label="Nome da nova etapa" required />
          <Button type="submit"><Plus /> Adicionar</Button>
        </form>
      </GlassCard>
      <MotivosPerda crm={crm} />
    </div>
  );
}

/** Motivos oferecidos ao marcar um lead como perdido (alimentam o relatório de perdas). */
function MotivosPerda({ crm }: { crm: Painel }) {
  const atuais = crm.empresa?.motivos_perda?.length ? crm.empresa.motivos_perda : MOTIVOS_PADRAO;
  const [lista, setLista] = useState<string[]>(atuais);
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudou = lista.join('|') !== atuais.join('|');

  const adicionar = (e: React.FormEvent) => {
    e.preventDefault();
    const m = novo.trim().replace(/\s+/g, ' ');
    if (!m || lista.some((x) => x.toLowerCase() === m.toLowerCase()) || lista.length >= 11) return;
    setLista([...lista, m.slice(0, 50)]);
    setNovo('');
  };
  const salvar = async () => { setSalvando(true); await crm.salvarMotivos(lista.length ? lista : null); setSalvando(false); };

  return (
    <GlassCard className="max-w-3xl space-y-3">
      <CardTitle titulo="Motivos de perda" descricao="Aparecem como opções ao marcar um lead como perdido. “Outro” sempre fica disponível." />
      <ul className="flex flex-wrap gap-1.5">
        {lista.map((m) => (
          <li key={m} className="inline-flex h-8 items-center gap-1 rounded-full border border-glass-border bg-pill-active/50 pr-1 pl-3 text-[13px] dark:bg-white/6">
            {m}
            <button type="button" onClick={() => setLista(lista.filter((x) => x !== m))} aria-label={`Remover motivo ${m}`} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-pill-active hover:text-foreground dark:hover:bg-white/10">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2">
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo motivo, ex.: Prazo de entrega" aria-label="Novo motivo de perda" maxLength={50} />
        <Button type="submit" variant="outline" disabled={!novo.trim() || lista.length >= 11}><Plus /> Incluir</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!mudou || salvando || lista.length === 0} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar motivos'}</Button>
        {crm.empresa?.motivos_perda && <Button variant="ghost" onClick={() => { setLista(MOTIVOS_PADRAO); void crm.salvarMotivos(null); }}>Voltar ao padrão</Button>}
      </div>
    </GlassCard>
  );
}

/** Número salvo ao sair do campo (ou Enter). Vazio = sem valor. */
function CampoNumero({ rotulo, sufixo, min, max, valor, aoSalvar, etapa }: { rotulo: string; sufixo: string; min: number; max: number; valor: number | null; aoSalvar: (v: number | null) => Promise<boolean>; etapa: string }) {
  const id = useId();
  const [texto, setTexto] = useState(valor == null ? '' : String(valor));
  const [ultimo, setUltimo] = useState(valor);
  if (valor !== ultimo) { setUltimo(valor); setTexto(valor == null ? '' : String(valor)); }
  const salvar = async () => {
    const n = texto.trim() === '' ? null : Math.round(Number(texto));
    if (n !== null && (!Number.isFinite(n) || n < min || n > max)) { setTexto(valor == null ? '' : String(valor)); return; }
    if (n !== valor) await aoSalvar(n);
  };
  return (
    <span className="flex items-center gap-1.5">
      <label htmlFor={id} className="text-xs text-muted-foreground">{rotulo}<span className="sr-only"> em {etapa}</span></label>
      <input
        id={id} type="number" inputMode="numeric" min={min} max={max} value={texto}
        onChange={(e) => setTexto(e.target.value)} onBlur={salvar} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="tabular h-8 w-14 rounded-lg border border-input bg-background/60 px-2 text-right text-[13px] dark:bg-white/6"
      />
      <span className="text-xs text-muted-foreground">{sufixo}</span>
    </span>
  );
}

const VARIAVEIS = ['{primeiro_nome}', '{nome}', '{empresa}', '{vendedor}'];

function Mensagens({ crm }: { crm: Painel }) {
  const [editando, setEditando] = useState<{ id?: string; etapa_id: string | null; titulo: string; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const nomeEtapa = (id?: string | null) => (id ? crm.etapas.find((e) => e.id === id)?.nome ?? 'Etapa removida' : 'Qualquer etapa');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando || !editando.titulo.trim() || !editando.texto.trim()) return;
    setSalvando(true);
    if (await crm.salvarModelo(editando)) setEditando(null);
    setSalvando(false);
  };

  const inserir = (v: string) => {
    const el = textoRef.current;
    if (!editando) return;
    const ini = el?.selectionStart ?? editando.texto.length;
    const fim = el?.selectionEnd ?? ini;
    const texto = editando.texto.slice(0, ini) + v + editando.texto.slice(fim);
    setEditando({ ...editando, texto });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + v.length, ini + v.length); });
  };

  const exemplo = editando ? preencherModelo(editando.texto, { nome: 'Maria Silva', empresa: crm.empresa?.nome, vendedor: crm.nomeUsuario }) : '';

  return (
    <div className="space-y-5">
      <PageHeader titulo="Mensagens prontas" subtitulo="Textos de WhatsApp que a equipe envia com um clique da ficha do lead. Cada envio fica no histórico." />
      <div className="grid max-w-4xl gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle titulo="Suas mensagens" />
            <Button size="sm" onClick={() => setEditando({ etapa_id: null, titulo: '', texto: '' })}><Plus /> Nova</Button>
          </div>
          {crm.modelos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-[13px] text-muted-foreground">
              <MessageSquareText className="mx-auto mb-2 size-5" aria-hidden />
              Nenhuma mensagem ainda. Comece pelo primeiro contato: é a que a equipe mais repete.
            </div>
          ) : (
            <ul className="space-y-2">
              {crm.modelos.map((m) => (
                <li key={m.id} className="flex items-start gap-2 rounded-2xl bg-pill-active/45 p-3 dark:bg-white/5">
                  <button type="button" onClick={() => setEditando({ id: m.id, etapa_id: m.etapa_id ?? null, titulo: m.titulo, texto: m.texto })} className="min-w-0 flex-1 text-left">
                    <span className="block text-[13px] font-medium">{m.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{nomeEtapa(m.etapa_id)}</span>
                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{m.texto}</span>
                  </button>
                  <HoldToDeleteButton rotulo="Apagar" rotuloFeito="Apagada" descricao={`mensagem ${m.titulo}`} aoConfirmar={() => crm.apagarModelo(m.id)} />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {editando ? (
          <GlassCard>
            <form onSubmit={salvar} className="space-y-3">
              <CardTitle titulo={editando.id ? 'Editar mensagem' : 'Nova mensagem'} />
              <div className="space-y-1.5">
                <Label htmlFor="mod-titulo">Nome</Label>
                <Input id="mod-titulo" value={editando.titulo} maxLength={80} required placeholder="Ex.: Primeiro contato" onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-etapa">Aparece primeiro na etapa</Label>
                <select id="mod-etapa" value={editando.etapa_id ?? ''} onChange={(e) => setEditando({ ...editando, etapa_id: e.target.value || null })} className={SELECT}>
                  <option value="">Qualquer etapa</option>
                  {crm.etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-texto">Texto</Label>
                <textarea id="mod-texto" ref={textoRef} value={editando.texto} maxLength={1000} required rows={5} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-[13px] dark:bg-white/6" />
                <div className="flex flex-wrap gap-1.5" aria-label="Inserir variável">
                  {VARIAVEIS.map((v) => (
                    <button key={v} type="button" onClick={() => inserir(v)} className="rounded-full border border-glass-border px-2.5 py-1 font-mono text-[11px] hover:bg-pill-active">{v}</button>
                  ))}
                </div>
              </div>
              {exemplo && (
                <div className="rounded-2xl bg-[#dcf8c6]/70 p-3 text-[13px] text-[#111] dark:bg-emerald-900/40 dark:text-emerald-50">
                  <span className="mb-1 block text-[11px] font-medium opacity-70">Como chega para “Maria Silva”</span>
                  {exemplo}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
              </div>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="space-y-2 text-[13px] text-muted-foreground">
            <CardTitle titulo="Como funciona" />
            <p>Na ficha do lead, o botão WhatsApp lista primeiro as mensagens da etapa em que ele está.</p>
            <p>Use <span className="font-mono text-xs text-foreground">{'{primeiro_nome}'}</span> e as outras variáveis: o texto sai preenchido para cada pessoa.</p>
            <p>Todo envio fica registrado no histórico do lead e conta como atividade.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

/* ---------------- Privacidade (LGPD) ---------------- */

function Privacidade({ crm }: { crm: Painel }) {
  const [registros, setRegistros] = useState<RegistroAcesso[] | null>(null);
  const [acao, setAcao] = useState('todas');
  const [busca, setBusca] = useState('');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    void crm.carregarAcessos({ limite: 500 }).then((r) => { if (vivo) setRegistros(r); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const quem = (id?: string | null) => (id ? crm.equipe.find((m) => m.id === id)?.nome || crm.equipe.find((m) => m.id === id)?.email || 'Pessoa removida' : 'Sistema');
  const contato = (id?: string | null) => (id ? crm.leads.find((l) => l.id === id)?.nome ?? 'Contato excluído' : '—');
  const termo = busca.trim().toLowerCase();
  const filtrados = (registros ?? []).filter((r) => (acao === 'todas' || r.acao === acao) && (!termo || contato(r.entidade_id).toLowerCase().includes(termo) || quem(r.usuario_id).toLowerCase().includes(termo)));

  const abertos = crm.leads.filter((l) => !l.anonimizado_em);
  const semBase = abertos.filter((l) => !l.base_legal).length;
  const naoContatar = abertos.filter((l) => l.nao_contatar).length;
  const anonimizados = crm.leads.filter((l) => l.anonimizado_em).length;

  return (
    <div className="space-y-5">
      <PageHeader titulo="Privacidade e LGPD" subtitulo="Por que cada contato está no CRM, quem acessou e como atender um pedido do titular." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <GlassCard className="space-y-1">
          <CardTitle titulo="Sem base legal" />
          <p className="tabular text-3xl font-semibold">{semBase}</p>
          <p className="text-xs text-muted-foreground">{semBase === 0 ? 'Todo contato tem o motivo registrado.' : 'Contatos sem o motivo registrado. Defina na ficha › Privacidade.'}</p>
        </GlassCard>
        <GlassCard className="space-y-1">
          <CardTitle titulo="Não contatar" />
          <p className="tabular text-3xl font-semibold">{naoContatar}</p>
          <p className="text-xs text-muted-foreground">Pediram para não receber mensagens. O WhatsApp fica bloqueado para eles.</p>
        </GlassCard>
        <GlassCard className="space-y-1">
          <CardTitle titulo="Dados apagados" />
          <p className="tabular text-3xl font-semibold">{anonimizados}</p>
          <p className="text-xs text-muted-foreground">Contatos anonimizados a pedido. Os números do funil continuam.</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <GlassCard className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle titulo="Registro de acessos" descricao="Ninguém, nem o administrador, consegue alterar ou apagar estas linhas." />
            <Button size="sm" variant="outline" onClick={() => setVersao((v) => v + 1)}>Atualizar</Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por contato ou pessoa" aria-label="Filtrar registro" className="sm:max-w-xs" />
            <select value={acao} onChange={(e) => setAcao(e.target.value)} aria-label="Filtrar por ação" className={cn(SELECT, 'h-10 sm:max-w-56')}>
              <option value="todas">Todas as ações</option>
              {Object.entries(ROTULO_ACESSO).map(([id, rotulo]) => <option key={id} value={id}>{rotulo}</option>)}
            </select>
          </div>
          <div className="max-h-[480px] overflow-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="sticky top-0 bg-background/90 text-xs text-muted-foreground backdrop-blur">
                <tr><th className="px-3 py-2 font-medium">Quando</th><th className="px-3 py-2 font-medium">Quem</th><th className="px-3 py-2 font-medium">O quê</th><th className="px-3 py-2 font-medium">Contato</th></tr>
              </thead>
              <tbody>
                {registros === null && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">Carregando…</td></tr>}
                {registros !== null && filtrados.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">{registros.length === 0 ? 'Nada registrado ainda. Abrir uma ficha já gera a primeira linha.' : 'Nenhuma linha com esse filtro.'}</td></tr>}
                {filtrados.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatarDataHora(r.created_at)}</td>
                    <td className="px-3 py-2">{quem(r.usuario_id)}</td>
                    <td className="px-3 py-2">{ROTULO_ACESSO[r.acao] ?? r.acao}{r.detalhes && <span className="block text-xs text-muted-foreground">{r.detalhes}</span>}</td>
                    <td className="max-w-[200px] truncate px-3 py-2">{contato(r.entidade_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Ficam registrados: abrir a ficha (uma vez a cada 10 minutos por pessoa), exportar, apagar dados, excluir, e mudanças de base legal ou de “não contatar”.</p>
        </GlassCard>

        <GlassCard className="space-y-3 self-start">
          <CardTitle titulo="Pedido do titular, passo a passo" />
          <ol className="space-y-2.5 text-[13px]">
            {[
              ['Confirme quem está pedindo', 'Responda pelo mesmo WhatsApp ou e-mail do cadastro.'],
              ['Ache o contato', 'Use a busca do topo e abra a ficha › Privacidade.'],
              ['Cópia dos dados', 'Exportar dados gera um arquivo com tudo o que o CRM guarda. Envie à pessoa.'],
              ['Exclusão', 'Apagar dados pessoais remove nome, contatos e anotações. O motivo fica no registro.'],
              ['Parar de contatar', 'Se a pessoa só não quer mais mensagens, ligue “Não contatar”.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-2.5">
                <span className="tabular grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">{i + 1}</span>
                <span><span className="font-medium">{t}.</span> <span className="text-muted-foreground">{d}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">A LGPD dá até 15 dias para a resposta completa ao titular (art. 19). Na dúvida jurídica, fale com o encarregado de dados da empresa.</p>
        </GlassCard>
      </div>
    </div>
  );
}

function Perfil({ crm }: { crm: Painel }) {
  const { escuro, alternar, seguirSistema } = useTema();
  return (
    <div className="space-y-5">
      <PageHeader titulo="Meu perfil" subtitulo="Seu nome, seus dados de acesso e as preferências deste aparelho." />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <GlassCard>
          <CardTitle titulo="Conta" />
          <div className="mt-4">
            <CampoNome inicial={crm.equipe.find((m) => m.id === crm.userId)?.nome ?? ''} aoSalvar={crm.salvarNome} />
          </div>
          <div className="mt-5 space-y-2">
            <Label htmlFor="perfil-email">E-mail</Label>
            <Input id="perfil-email" disabled value={crm.userEmail ?? ''} />
            <p className="text-xs text-muted-foreground">Cargo: {crm.papel === 'admin' ? 'Administrador' : 'Vendedor'}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <CardTitle titulo="Aparência" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-[13px] font-medium">
                {escuro ? <Moon className="size-4" /> : <Sun className="size-4" />} Vidro fumê (modo escuro)
              </span>
              <Toggle ativo={escuro} aoMudar={alternar} rotulo="Vidro fumê" />
            </div>
            <Button size="sm" variant="outline" onClick={seguirSistema}>Seguir o sistema</Button>
          </div>
        </GlassCard>
        <AppCelular crm={crm} className="md:col-span-2" />
      </div>
    </div>
  );
}

/* ---------------- Integrações: Webhook · Importar ---------------- */

export function Integracoes({ crm, visao }: { crm: Painel; visao: string }) {
  return visao === 'importar' ? <Importar crm={crm} /> : <Webhook crm={crm} />;
}

function Webhook({ crm }: { crm: Painel }) {
  const [copiado, setCopiado] = useState(false);
  const token = crm.empresa?.webhook_token;
  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/leads?token=${token}` : '';
  const copiar = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Webhook de captação" subtitulo="Envie um POST com nome, e-mail, telefone e origem para criar leads automaticamente." />
      <GlassCard className="max-w-3xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Endereço do webhook</Label>
          <div className="flex gap-2">
            <Input id="webhook-url" readOnly value={url || 'Carregando…'} className="font-mono text-xs" />
            <Button onClick={copiar} disabled={!url} aria-label="Copiar endereço">
              {copiado ? <Check /> : <Copy />} {copiado ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-2xl bg-foreground p-4 font-mono text-xs leading-relaxed text-background">{`POST /api/webhooks/leads?token=…
Content-Type: application/json

{ "nome": "Maria Silva", "telefone": "11999990000",
  "email": "maria@exemplo.com", "origem": "Site", "valor": 1500,
  "consentimento": true }`}</pre>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono text-foreground">consentimento: true</span> registra que a pessoa marcou a caixa de autorização no formulário (LGPD), com data e hora.
          Também aceita <span className="font-mono text-foreground">base_legal</span>: consentimento, contrato, legitimo_interesse ou obrigacao_legal.
        </p>
      </GlassCard>
    </div>
  );
}

const SELECT = 'h-9 w-full appearance-none rounded-xl border border-input bg-pill-active/55 px-3 text-[13px] dark:bg-white/6';

function Importar({ crm }: { crm: Painel }) {
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [planilha, setPlanilha] = useState<{ cabecalho: string[]; linhas: string[][] } | null>(null);
  const [mapa, setMapa] = useState<CampoImportacao[]>([]);
  const [pularDuplicados, setPularDuplicados] = useState(true);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const baixarModelo = () => {
    const blob = new Blob(['﻿nome;telefone;email;origem;valor;documento\nJoão Silva;11999999999;joao@email.com;Indicação;1.500,00;\n'], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelo-leads.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const escolher = async (f: File | undefined) => {
    setErro(null);
    if (!f) return;
    try {
      const r = lerPlanilha(await f.text());
      setArquivo(f.name);
      setPlanilha({ cabecalho: r.cabecalho, linhas: r.linhas });
      setMapa(r.mapa);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    }
  };

  const recomecar = () => { setArquivo(null); setPlanilha(null); setMapa([]); setErro(null); };

  const previa = useMemo(() => {
    if (!planilha) return null;
    const { validas, semNome } = montarLinhas(planilha.linhas, mapa);
    const vistas: typeof validas = [];
    const itens = validas.map((linha) => {
      const dup = acharDuplicados(crm.leads, linha)[0] ?? null;
      const repetidaNoArquivo = !dup && acharDuplicados(vistas.map((v, i) => ({ ...v, id: String(i), empresa_id: '', created_at: '' })), linha).length > 0;
      vistas.push(linha);
      return { linha, dup, repetidaNoArquivo };
    });
    return { itens, semNome, duplicados: itens.filter((i) => i.dup || i.repetidaNoArquivo).length };
  }, [planilha, mapa, crm.leads]);

  const temNome = mapa.includes('nome');
  const aImportar = previa ? previa.itens.filter((i) => !pularDuplicados || (!i.dup && !i.repetidaNoArquivo)).map((i) => i.linha) : [];

  const importar = async () => {
    setImportando(true);
    if (await crm.importarLeads(aImportar)) recomecar();
    setImportando(false);
  };

  const trocarCampo = (i: number, campo: CampoImportacao) => {
    setMapa((m) => m.map((c, j) => (j === i ? campo : campo !== 'ignorar' && c === campo ? 'ignorar' : c)));
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Importar planilha" subtitulo="Traga contatos de um CSV (Excel, Google Planilhas). Você confere as colunas e os repetidos antes de importar." />
      {!planilha ? (
        <GlassCard className="max-w-2xl space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors focus-within:border-brand hover:border-brand/60 hover:bg-pill-active/30">
            <FileUp className="size-6 text-muted-foreground" aria-hidden />
            <span className="text-[13px] font-medium">Escolha um arquivo .csv</span>
            <span className="text-xs text-muted-foreground">Separado por vírgula ou ponto e vírgula. A primeira linha deve ter os nomes das colunas.</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {erro && <p role="alert" className="text-[13px] text-destructive">{erro}</p>}
          <Button type="button" variant="outline" onClick={baixarModelo}><Download /> Baixar planilha modelo</Button>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <GlassCard className="space-y-3 self-start">
            <CardTitle titulo="1. Colunas" />
            <p className="text-xs text-muted-foreground">{arquivo} · {planilha.linhas.length} {planilha.linhas.length === 1 ? 'linha' : 'linhas'}. Diga o que é cada coluna.</p>
            <ul className="space-y-2.5">
              {planilha.cabecalho.map((h, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                  <label htmlFor={`col-${i}`} className="truncate text-[13px] font-medium" title={h}>{h || `Coluna ${i + 1}`}</label>
                  <select id={`col-${i}`} value={mapa[i]} onChange={(e) => trocarCampo(i, e.target.value as CampoImportacao)} className={SELECT}>
                    {CAMPOS_IMPORTACAO.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
                  </select>
                </li>
              ))}
            </ul>
            {!temNome && <p role="alert" className="text-[13px] text-destructive">Escolha qual coluna é o Nome.</p>}
          </GlassCard>

          <GlassCard className="min-w-0 space-y-3">
            <CardTitle titulo="2. Conferir" />
            {previa && temNome && (
              <>
                <p className="text-[13px]" aria-live="polite">
                  <strong className="tabular">{previa.itens.length}</strong> {previa.itens.length === 1 ? 'contato' : 'contatos'} lidos
                  {previa.duplicados > 0 && <> · <strong className="tabular text-amber-700 dark:text-amber-300">{previa.duplicados}</strong> já {previa.duplicados === 1 ? 'existe' : 'existem'}</>}
                  {previa.semNome > 0 && <> · {previa.semNome} sem nome (ficam de fora)</>}
                </p>
                {previa.duplicados > 0 && (
                  <label className="flex items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={pularDuplicados} onChange={(e) => setPularDuplicados(e.target.checked)} className="size-4 accent-[var(--brand-solid)]" />
                    Não importar os repetidos (mesmo WhatsApp, e-mail ou CPF/CNPJ)
                  </label>
                )}
                <div className="max-h-[420px] overflow-auto rounded-2xl border border-border">
                  <table className="w-full text-left text-[13px]">
                    <thead className="sticky top-0 bg-background/90 text-xs text-muted-foreground backdrop-blur">
                      <tr><th className="px-3 py-2 font-medium">Nome</th><th className="px-3 py-2 font-medium">WhatsApp</th><th className="px-3 py-2 font-medium">E-mail</th><th className="px-3 py-2 font-medium">Situação</th></tr>
                    </thead>
                    <tbody>
                      {previa.itens.slice(0, 200).map(({ linha, dup, repetidaNoArquivo }, i) => (
                        <tr key={i} className={cn('border-t border-border', (dup || repetidaNoArquivo) && pularDuplicados && 'text-muted-foreground')}>
                          <td className="max-w-[180px] truncate px-3 py-2">{linha.nome}</td>
                          <td className="whitespace-nowrap px-3 py-2">{linha.telefone || '—'}</td>
                          <td className="max-w-[200px] truncate px-3 py-2">{linha.email || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {dup ? <span className="text-amber-700 dark:text-amber-300">Já existe: {dup.nome}</span> : repetidaNoArquivo ? <span className="text-amber-700 dark:text-amber-300">Repetido no arquivo</span> : 'Novo'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previa.itens.length > 200 && <p className="text-xs text-muted-foreground">Mostrando 200 de {previa.itens.length}.</p>}
              </>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button type="button" onClick={importar} disabled={!temNome || importando || aImportar.length === 0}>
                {importando ? 'Importando…' : `Importar ${aImportar.length} ${aImportar.length === 1 ? 'lead' : 'leads'}`}
              </Button>
              <Button type="button" variant="outline" onClick={recomecar}>Escolher outro arquivo</Button>
            </div>
            <p className="text-xs text-muted-foreground">Os leads entram na primeira etapa do funil. Dá para desfazer logo depois de importar.</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
