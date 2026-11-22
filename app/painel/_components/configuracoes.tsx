'use client';

import { useId, useRef, useState } from 'react';
import { Check, Copy, Download, FileUp, ImageUp, Moon, Plus, Sun } from 'lucide-react';
import { CardTitle, GlassCard, PageHeader, Toggle } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoldToDeleteButton } from '@/components/microkit/hold-to-delete-button';
import { useTema } from '@/components/theme/theme';
import { COR_PADRAO, hexValido } from '@/lib/marca';
import type { TipoImagem } from '@/lib/marca-storage';
import { cn } from '@/lib/utils';
import type { Painel } from '../_lib/use-painel';

/* ---------------- Configurações: Marca · Funil · Perfil ---------------- */

export function Configuracoes({ crm, visao }: { crm: Painel; visao: string }) {
  if (visao === 'marca' && crm.papel === 'admin') return <Marca crm={crm} />;
  if (visao === 'funil' && crm.papel === 'admin') return <Funil crm={crm} />;
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
      </div>
    </div>
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
        />
        <Button type="button" disabled={enviando} onClick={() => inputRef.current?.click()}>
          <ImageUp /> {atual ? 'Trocar imagem' : 'Enviar imagem'}
        </Button>
        {atual && (
          <HoldToDeleteButton
            rotulo="Remover"
            rotuloFeito="Removida"
            descricao={tipo === 'logo' ? 'Remover logo' : 'Remover imagem de fundo'}
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
      <GlassCard className="max-w-2xl">
        <ol className="space-y-2">
          {crm.etapas.map((etapa, i) => {
            const n = crm.leads.filter((l) => l.etapa_id === etapa.id).length;
            return (
              <li key={etapa.id} className="flex items-center gap-3 rounded-2xl bg-pill-active/45 px-3 py-2.5 dark:bg-white/5">
                <span className="tabular w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{etapa.nome}</span>
                <span className="tabular text-xs text-muted-foreground">{n} {n === 1 ? 'lead' : 'leads'}</span>
                <HoldToDeleteButton rotulo="Excluir" rotuloFeito="Excluída" descricao={`Excluir etapa ${etapa.nome}`} aoConfirmar={() => crm.removerEtapa(etapa)} />
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
    </div>
  );
}

function Perfil({ crm }: { crm: Painel }) {
  const { escuro, alternar, seguirSistema } = useTema();
  return (
    <div className="space-y-5">
      <PageHeader titulo="Meu perfil" subtitulo="Seus dados de acesso e preferências deste aparelho." />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <GlassCard>
          <CardTitle titulo="Conta" />
          <div className="mt-4 space-y-2">
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
  "email": "maria@exemplo.com", "origem": "Site", "valor": 1500 }`}</pre>
      </GlassCard>
    </div>
  );
}

function Importar({ crm }: { crm: Painel }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);

  const baixarModelo = () => {
    const blob = new Blob(['nome,email,telefone,origem,valor\nJoão Silva,joao@email.com,11999999999,Importação,150.00'], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelo_crm.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) return;
    setImportando(true);
    if (await crm.importarCSV(arquivo)) setArquivo(null);
    setImportando(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Importar planilha" subtitulo="Traga seus contatos de um CSV. Eles entram na primeira etapa do funil." />
      <GlassCard className="max-w-2xl">
        <form onSubmit={enviar} className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-brand/60 hover:bg-pill-active/30">
            <FileUp className="size-6 text-muted-foreground" aria-hidden />
            <span className="text-[13px] font-medium">{arquivo ? arquivo.name : 'Escolha um arquivo .csv'}</span>
            <span className="text-xs text-muted-foreground">Colunas: nome, email, telefone, origem, valor</span>
            <input type="file" accept=".csv" className="sr-only" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!arquivo || importando}>{importando ? 'Importando…' : 'Importar leads'}</Button>
            <Button type="button" variant="outline" onClick={baixarModelo}><Download /> Baixar modelo</Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
