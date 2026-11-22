'use client';

import { useState } from 'react';
import { Check, Copy, Download, FileUp, Moon, Plus, Sun } from 'lucide-react';
import { CardTitle, GlassCard, PageHeader, Toggle } from '@/components/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoldToDeleteButton } from '@/components/microkit/hold-to-delete-button';
import { useTema } from '@/components/theme/theme';
import { COR_PADRAO, hexValido } from '@/lib/marca';
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
  const [logo, setLogo] = useState(emp?.logo_url ?? '');
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    await crm.salvarMarca({ nome, cor_primaria: hexValido(cor) ? cor : COR_PADRAO, logo_url: logo, cor_fundo_logo: emp?.cor_fundo_logo ?? 'transparent' });
    setSalvando(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Identidade visual" subtitulo="Nome, logo e a cor que pinta destaques, barras e botões do seu CRM." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        <GlassCard className="lg:col-span-7">
          <form onSubmit={salvar} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="marca-nome">Nome da empresa</Label>
              <Input id="marca-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca-logo">Logo (URL da imagem)</Label>
              <Input id="marca-logo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
              <p className="text-xs text-muted-foreground">Em breve: envio do arquivo e imagem de fundo do painel.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca-cor">Cor principal</Label>
              <div className="flex gap-2">
                <input id="marca-cor" type="color" value={hexValido(cor) ? cor : COR_PADRAO} onChange={(e) => setCor(e.target.value)} className="h-10 w-12 cursor-pointer rounded-xl border border-input bg-transparent p-1" aria-label="Escolher cor" />
                <Input value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Código da cor" aria-invalid={!hexValido(cor)} className="font-mono" />
              </div>
            </div>
            <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar identidade'}</Button>
          </form>
        </GlassCard>
        <GlassCard className="lg:col-span-5">
          <CardTitle titulo="Prévia" descricao="Como a cor aparece nos destaques" />
          <div className="mt-5 space-y-4" style={{ ['--brand' as string]: hexValido(cor) ? cor : COR_PADRAO }}>
            <div className="flex items-end gap-2" aria-hidden>
              {[40, 64, 52, 78, 60, 92].map((h, i) => (
                <div key={i} className={i === 5 ? 'hatch flex-1 rounded-lg text-brand' : 'flex-1 rounded-lg bg-foreground/80'} style={{ height: h }} />
              ))}
            </div>
            <div className="h-2 rounded-full bg-chart-muted"><div className="h-full w-2/3 rounded-full bg-brand" /></div>
            <div className="flex items-center gap-3 text-xs"><Toggle ativo aoMudar={() => {}} rotulo="Exemplo de toggle" /> Alternâncias ativas</div>
          </div>
        </GlassCard>
      </div>
    </div>
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
