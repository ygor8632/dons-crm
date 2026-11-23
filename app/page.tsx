import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, CalendarClock, Check, Download, FileSpreadsheet, MessageCircle, ShieldCheck, Smartphone, Target, Unlock, UserCheck } from 'lucide-react';
import { SiteNav, SiteRodape, botaoPrimario, botaoVidro } from '@/components/site/site';
import { ProdutoPreview } from '@/components/site/produto-preview';
import { SeletorMarca } from '@/components/site/seletor-marca';
import { LeadChegando } from '@/components/site/lead-chegando';
import { CONTATO_URL } from '@/lib/contato';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dons CRM: seu time vendendo pelo WhatsApp sem perder nenhum lead',
  description:
    'CRM com a marca da sua empresa, configurado e treinado pela nossa equipe em até 7 dias. Sem fidelidade. Experimente agora, sem cadastro.',
  openGraph: {
    title: 'Seu time vendendo pelo WhatsApp sem perder nenhum lead',
    description: 'CRM com a marca da sua empresa, configurado e treinado pela nossa equipe. Experimente agora, sem cadastro.',
    locale: 'pt_BR',
    type: 'website',
  },
};

/* Cada seção ocupa uma tela; o conteúdo fica nas mesmas bordas (1200 px). */
const secao = 'mx-auto flex min-h-[100svh] w-full max-w-[1200px] scroll-mt-0 flex-col justify-center px-4 py-24 sm:px-6';
const h2 = 'text-[32px] leading-[1.08] font-bold tracking-[-0.03em] text-balance md:text-[48px]';
const lead = 'mt-4 max-w-xl text-[17px] leading-relaxed text-ink-2';

const GARANTIAS = [
  { icone: CalendarCheck, t: 'Implantação em até 7 dias', d: 'Montamos o funil, importamos sua planilha, cadastramos a equipe e treinamos o time.' },
  { icone: Unlock, t: 'Sem fidelidade', d: 'Cancele quando quiser, sem multa e sem precisar justificar.' },
  { icone: Download, t: 'Seus dados são seus', d: 'Contatos e histórico podem ser exportados a qualquer momento, inclusive na saída.' },
  { icone: ShieldCheck, t: 'Contrato conforme a LGPD', d: 'Cláusulas de tratamento de dados no contrato e, no CRM, base legal, registro de acessos e exclusão a pedido.' },
];

const PERGUNTAS = [
  {
    p: 'Quanto custa?',
    r: 'O valor depende do tamanho da equipe e do plano (Básico, Pro ou Enterprise). Um consultor passa o preço na primeira conversa pelo WhatsApp, sem compromisso. Antes disso, você pode experimentar o CRM completo na demonstração.',
  },
  {
    p: 'O que está incluso na implantação?',
    r: 'Criamos a sua empresa no CRM com logo e cores, montamos o funil com as etapas da sua venda, importamos a planilha de contatos que você já tem, cadastramos a equipe e fazemos o treinamento. O formulário do site pode ser ligado na mesma semana.',
  },
  {
    p: 'Em quanto tempo fica pronto?',
    r: 'Em até 7 dias depois da conversa de implantação, com a equipe já usando.',
  },
  {
    p: 'Como cancelo?',
    r: 'É só avisar. Não tem fidelidade nem multa. Antes de sair, você exporta seus contatos e o histórico, e os dados continuam sendo seus.',
  },
  {
    p: 'Um vendedor vê os leads dos outros?',
    r: 'Não. O vendedor vê os leads atribuídos a ele e os que ainda estão sem dono. O administrador vê todos e distribui.',
  },
  {
    p: 'Dá para trazer os contatos que já tenho?',
    r: 'Sim. Você envia a planilha (CSV do Excel ou do Google Planilhas), diz o que é cada coluna e confere a prévia: contatos repetidos, pelo mesmo WhatsApp, e-mail ou CPF/CNPJ, ficam de fora. Se algo sair errado, dá para desfazer a importação.',
  },
  {
    p: 'Como os leads do site chegam ao CRM?',
    r: 'O formulário do site, da landing page ou do anúncio envia os dados para o endereço da sua empresa e o lead aparece na primeira etapa na hora. Se a pessoa já estava no funil, o novo contato vai para o histórico dela em vez de virar um lead repetido.',
  },
  {
    p: 'Funciona no celular?',
    r: 'Sim. A equipe instala o CRM na tela inicial do celular, com o nome e o ícone da sua empresa, e ele abre em tela cheia como um aplicativo.',
  },
  {
    p: 'E a LGPD?',
    r: 'O contrato tem as cláusulas de tratamento de dados. No CRM, cada contato tem a base legal registrada, quem pede para não ser procurado fica bloqueado para mensagens, o administrador exporta ou apaga os dados de uma pessoa a pedido e todo acesso fica num registro que ninguém consegue alterar.',
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
              Seu time vendendo pelo WhatsApp sem perder nenhum lead
            </h1>
            <p className="entra mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2" style={{ ['--i' as string]: 1 }}>
              No CRM com a marca da sua empresa, configurado e treinado pela nossa equipe. Cada vendedor abre o dia sabendo quem chamar, e nenhuma conversa fica sem próximo passo.
            </p>
            <div className="entra mt-8 flex flex-col gap-2 sm:flex-row" style={{ ['--i' as string]: 2 }}>
              <Link href="/demo" className={cn(botaoPrimario, 'h-12 px-6 text-sm')}>Experimente agora, sem cadastro</Link>
              <a href={CONTATO_URL} target="_blank" rel="noopener" className={cn(botaoVidro, 'h-12 px-6 text-sm')}><MessageCircle className="size-4" aria-hidden /> Falar com um consultor</a>
            </div>
            <ul className="entra mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2" style={{ ['--i' as string]: 3 }} aria-label="Garantias">
              {['Implantação em até 7 dias', 'Sem fidelidade', 'Seus dados exportáveis'].map((g) => (
                <li key={g} className="flex items-center gap-1.5"><Check className="size-3.5 text-positive-foreground" aria-hidden />{g}</li>
              ))}
            </ul>
          </div>
          <div className="entra" style={{ ['--i' as string]: 2 }}>
            <ProdutoPreview />
          </div>
        </section>

        {/* 2. O painel */}
        <section id="painel" className={secao}>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            <div>
              <h2 className={h2}>Cada vendedor abre o dia sabendo quem chamar</h2>
              <p className={lead}>A tela Hoje junta os retornos atrasados, os do dia, os leads sem próximo passo e os parados há dias. Um clique reagenda ou abre o WhatsApp.</p>
              <ul className="mt-8 space-y-3 text-[15px] text-ink-2">
                <li className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />Depois de cada conversa, o próximo retorno fica agendado com um toque</li>
                <li className="flex items-start gap-3"><MessageCircle className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />Mensagens prontas de WhatsApp por etapa, e cada envio entra no histórico do lead</li>
                <li className="flex items-start gap-3"><Target className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />Metas por vendedor, motivos de perda e o relatório do mês com o logo da empresa</li>
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
              <p className={lead}>O formulário do site, da landing page ou do anúncio envia os dados e o lead aparece na primeira etapa. Se a pessoa já estava no funil, o contato vai para o histórico dela, sem duplicar.</p>
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
          <h2 className={cn(h2, 'max-w-3xl')}>O CRM que o time usa, porque é o da sua empresa</h2>
          <p className={lead}>Seu logo, sua cor e sua imagem de fundo no painel, e o app na tela inicial do celular com o ícone da empresa.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-12">
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-1">
              {[
                { icone: UserCheck, t: 'Cada vendedor vê os próprios leads', d: 'O administrador vê todos e distribui; o vendedor vê os dele e os sem dono.' },
                { icone: FileSpreadsheet, t: 'Importa a planilha que você já usa', d: 'Você confere a prévia antes, e os contatos repetidos ficam de fora.' },
                { icone: Smartphone, t: 'App no celular com o seu ícone', d: 'A equipe instala na tela inicial e abre direto no CRM, em tela cheia.' },
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

        {/* 5. Sem surpresa */}
        <section id="garantias" className={secao}>
          <h2 className={cn(h2, 'max-w-3xl')}>Sem surpresa na contratação nem na saída</h2>
          <p className={lead}>O que fica combinado antes de você assinar.</p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GARANTIAS.map(({ icone: Icone, t, d }) => (
              <li key={t} className="glass-card flex flex-col gap-3 p-5">
                <span className="grid size-10 place-items-center rounded-full bg-pill-active/80 dark:bg-white/10" aria-hidden><Icone className="size-5" /></span>
                <h3 className="text-[15px] font-semibold">{t}</h3>
                <p className="text-sm text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Perguntas */}
        <section id="perguntas" className={secao}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            <div>
              <h2 className={h2}>Perguntas antes de contratar</h2>
              <p className={lead}>Preço, prazo, cancelamento e o que muda no dia a dia da equipe.</p>
              <a href={CONTATO_URL} target="_blank" rel="noopener" className={cn(botaoVidro, 'mt-8 h-11 px-5 text-sm')}><MessageCircle className="size-4" aria-hidden /> Perguntar a um consultor</a>
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

        {/* 7. Fechamento */}
        <section className="mx-auto flex min-h-[70svh] w-full max-w-[1200px] flex-col items-start justify-center px-4 py-24 sm:px-6">
          <div className="glass w-full rounded-[32px] p-8 sm:p-14">
            <h2 className={cn(h2, 'max-w-2xl')}>Experimente agora, sem cadastro</h2>
            <p className={lead}>O CRM completo abre com leads, funil e equipe de exemplo. Quando quiser ver com os dados da sua empresa, um consultor responde no WhatsApp.</p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Link href="/demo" className={cn(botaoPrimario, 'h-12 px-6 text-sm')}>Experimente agora</Link>
              <a href={CONTATO_URL} target="_blank" rel="noopener" className={cn(botaoVidro, 'h-12 px-6 text-sm')}><MessageCircle className="size-4" aria-hidden /> Falar com um consultor</a>
            </div>
          </div>
        </section>
      </main>

      <SiteRodape />
    </div>
  );
}
