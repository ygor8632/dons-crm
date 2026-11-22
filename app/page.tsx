import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, FileSpreadsheet, MessageCircle, UserCheck } from 'lucide-react';
import { SiteNav, SiteRodape, botaoPrimario, botaoVidro } from '@/components/site/site';
import { ProdutoPreview } from '@/components/site/produto-preview';
import { SeletorMarca } from '@/components/site/seletor-marca';
import { LeadChegando } from '@/components/site/lead-chegando';
import { CONTATO_URL } from '@/lib/contato';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dons CRM: CRM de vendas com a marca da sua empresa',
  description:
    'Implantamos o funil, cadastramos a equipe e entregamos o painel com seu logo e suas cores. Leads do site entram sozinhos pelo webhook.',
  openGraph: {
    title: 'Dons CRM: CRM de vendas com a marca da sua empresa',
    description: 'Funil pronto, equipe cadastrada e o painel com seu logo e suas cores.',
    locale: 'pt_BR',
    type: 'website',
  },
};

/* Cada seção ocupa uma tela; o conteúdo fica nas mesmas bordas (1200 px). */
const secao = 'mx-auto flex min-h-[100svh] w-full max-w-[1200px] scroll-mt-0 flex-col justify-center px-4 py-24 sm:px-6';
const h2 = 'text-[32px] leading-[1.08] font-bold tracking-[-0.03em] text-balance md:text-[48px]';
const lead = 'mt-4 max-w-xl text-[17px] leading-relaxed text-ink-2';

const PERGUNTAS = [
  {
    p: 'Preciso configurar alguma coisa antes de usar?',
    r: 'Não. Na implantação criamos a sua empresa, o funil com três etapas (Aguardando contato, Em atendimento e Venda concluída) e enviamos o convite para o administrador. Depois você renomeia ou cria etapas quando quiser.',
  },
  {
    p: 'Um vendedor vê os leads dos outros?',
    r: 'Não. O vendedor vê os leads atribuídos a ele e os que ainda estão sem dono. O administrador vê todos e distribui.',
  },
  {
    p: 'Dá para trazer os contatos que já tenho?',
    r: 'Sim. Importe um CSV com as colunas nome, email, telefone, origem e valor. Os contatos entram na primeira etapa do funil.',
  },
  {
    p: 'Como os leads do site chegam ao CRM?',
    r: 'Seu formulário envia um POST para o endereço de webhook da sua empresa, com nome, telefone, e-mail, origem e valor. O lead aparece no Kanban na hora.',
  },
  {
    p: 'Funciona no celular?',
    r: 'Sim. O painel se reorganiza na tela do telefone: as seções vão para uma barra inferior e a busca fica no topo.',
  },
  {
    p: 'Quanto custa?',
    r: 'Há quatro planos: Trial, Básico, Pro e Enterprise. O preço depende do tamanho da equipe e é passado na conversa de implantação.',
  },
];

export default function Home() {
  return (
    <div className="relative">
      <div className="app-bg" aria-hidden />
      <a href="#conteudo" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-20 focus:left-4">
        Pular para o conteúdo
      </a>
      <SiteNav />

      <main id="conteudo">
        {/* 1. Hero */}
        <section className="mx-auto grid min-h-[100svh] w-full max-w-[1200px] items-center gap-10 px-4 pt-28 pb-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:pt-24">
          <div>
            <h1 className="entra text-[40px] leading-[1.02] font-bold tracking-[-0.035em] text-balance sm:text-[56px] lg:text-[64px]" style={{ ['--i' as string]: 0 }}>
              CRM de vendas com a marca da sua empresa
            </h1>
            <p className="entra mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2" style={{ ['--i' as string]: 1 }}>
              Implantamos o funil, cadastramos a equipe e entregamos o painel com seu logo e suas cores. Leads do site entram sozinhos pelo webhook.
            </p>
            <div className="entra mt-8 flex flex-col gap-2 sm:flex-row" style={{ ['--i' as string]: 2 }}>
              <Link href="/demo" className={cn(botaoPrimario, 'h-12 px-6 text-sm')}>Ver a demonstração</Link>
              <Link href="/login" className={cn(botaoVidro, 'h-12 px-6 text-sm')}>Entrar no painel</Link>
            </div>
            <p className="entra mt-8 flex items-center gap-2 text-[13px] text-ink-2" style={{ ['--i' as string]: 3 }}>
              <span className="size-2 rounded-full bg-chart-5" aria-hidden />
              Você recebe o funil com 3 etapas já configurado no primeiro acesso.
            </p>
          </div>
          <div className="entra" style={{ ['--i' as string]: 2 }}>
            <ProdutoPreview />
          </div>
        </section>

        {/* 2. O painel */}
        <section id="painel" className={secao}>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            <div>
              <h2 className={h2}>Kanban, lista e follow-ups no mesmo painel</h2>
              <p className={lead}>Arraste o lead para a próxima etapa, abra a ficha para anotar a ligação e agende o retorno. O sino avisa o que venceu.</p>
              <ul className="mt-8 space-y-3 text-[15px] text-ink-2">
                <li className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />Follow-ups atrasados e do dia no sino do topo</li>
                <li className="flex items-start gap-3"><MessageCircle className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />Conversa no WhatsApp com um clique a partir do card</li>
              </ul>
            </div>
            <ProdutoPreview variante="kanban" />
          </div>
        </section>

        {/* 3. Captação */}
        <section id="webhook" className={secao}>
          <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col justify-center">
              <h2 className={h2}>Leads do site entram sozinhos no funil</h2>
              <p className={lead}>Cada empresa recebe um endereço de webhook. O formulário do site, da landing page ou do anúncio envia os dados e o lead aparece na primeira etapa.</p>
              <pre className="mt-8 overflow-x-auto rounded-2xl bg-foreground p-5 font-mono text-[13px] leading-relaxed text-background" aria-label="Exemplo de envio para o webhook">{`POST /api/webhooks/leads?token=…

{ "nome": "Maria Silva",
  "telefone": "11999990000",
  "origem": "Site",
  "valor": 1500 }`}</pre>
            </div>
            <LeadChegando />
          </div>
        </section>

        {/* 4. Marca e equipe */}
        <section id="marca" className={secao}>
          <h2 className={cn(h2, 'max-w-3xl')}>Seu logo, sua cor e a sua equipe no painel</h2>
          <p className={lead}>O administrador envia o logo, escolhe a cor e uma imagem de fundo. A equipe entra e já vê o CRM da empresa.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-1">
              {[
                { icone: UserCheck, t: 'Cada vendedor vê os próprios leads', d: 'O administrador vê todos e distribui; o vendedor vê os dele e os sem dono.' },
                { icone: FileSpreadsheet, t: 'Importa a planilha que você já usa', d: 'CSV com nome, e-mail, telefone, origem e valor, direto para o funil.' },
                { icone: MessageCircle, t: 'Abre o WhatsApp do lead', d: 'Do card ou da ficha, com o número já preenchido.' },
              ].map(({ icone: Icone, t, d }) => (
                <div key={t} className="glass-card flex items-start gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pill-active/80 dark:bg-white/10" aria-hidden><Icone className="size-5" /></span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{t}</h3>
                    <p className="mt-1 text-sm text-ink-2">{d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5"><SeletorMarca /></div>
          </div>
        </section>

        {/* 5. Perguntas */}
        <section id="perguntas" className={secao}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            <div>
              <h2 className={h2}>Perguntas sobre a implantação</h2>
              <p className={lead}>O que muda no dia a dia da equipe e o que fica com a gente.</p>
            </div>
            <div className="glass-card divide-y divide-border/70 p-2">
              {PERGUNTAS.map(({ p, r }) => (
                <details key={p} className="group px-4 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                    {p}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-lg leading-none transition-transform duration-200 ease-(--ease-out) group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="pb-4 text-[15px] leading-relaxed text-ink-2">{r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Fechamento */}
        <section className="mx-auto flex min-h-[70svh] w-full max-w-[1200px] flex-col items-start justify-center px-4 py-24 sm:px-6">
          <div className="glass w-full rounded-[32px] p-8 sm:p-14">
            <h2 className={cn(h2, 'max-w-2xl')}>Veja o painel com dados de exemplo</h2>
            <p className={lead}>A demonstração abre o CRM completo, sem cadastro, com leads, funil e equipe fictícios.</p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Link href="/demo" className={cn(botaoPrimario, 'h-12 px-6 text-sm')}>Ver a demonstração</Link>
              {CONTATO_URL && <a href={CONTATO_URL} className={cn(botaoVidro, 'h-12 px-6 text-sm')}>Falar com um consultor</a>}
            </div>
          </div>
        </section>
      </main>

      <SiteRodape />
    </div>
  );
}
