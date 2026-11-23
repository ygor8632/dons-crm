'use client';

import { useMemo, useState } from 'react';
import { Lightbulb, Search } from 'lucide-react';
import type { Artigo, Capitulo } from './conteudo';

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const textoDe = (a: Artigo) => normalizar([a.titulo, a.resumo, ...(a.passos ?? []), ...(a.itens ?? []).flatMap((i) => [i.t, i.d]), a.dica ?? ''].join(' '));

/** Capítulos com busca: filtra os artigos pelo texto digitado. */
export function AjudaBusca({ capitulos }: { capitulos: Capitulo[] }) {
  const [termo, setTermo] = useState('');
  const t = normalizar(termo.trim());
  const filtrados = useMemo(() => capitulos
    .map((c) => ({ ...c, artigos: t ? c.artigos.filter((a) => textoDe(a).includes(t)) : c.artigos }))
    .filter((c) => c.artigos.length > 0), [capitulos, t]);
  const total = filtrados.reduce((s, c) => s + c.artigos.length, 0);

  return (
    <>
      <div className="relative mt-8 max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar: importar, WhatsApp, meta, senha…"
          aria-label="Buscar na ajuda"
          className="h-12 w-full rounded-full border border-glass-border bg-pill-active/70 pr-4 pl-11 text-[15px] placeholder:text-muted-foreground dark:bg-white/8"
        />
      </div>
      <p className="sr-only" aria-live="polite">{t ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : ''}</p>

      {!t && (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Capítulos">
          {capitulos.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="glass-card lift block h-full p-4">
                <span className="block text-[15px] font-semibold">{c.titulo}</span>
                <span className="mt-1 block text-[13px] text-ink-2">{c.descricao}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {t && total === 0 && <p className="mt-10 text-[15px] text-ink-2">Nada encontrado para “{termo}”. Tente outra palavra ou fale com o suporte.</p>}

      {filtrados.map((c) => (
        <section key={c.id} id={c.id} aria-labelledby={`cap-${c.id}`} className="mt-16 scroll-mt-28">
          <h2 id={`cap-${c.id}`} className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{c.titulo}</h2>
          <p className="mt-1 text-[15px] text-ink-2">{c.descricao}</p>
          <div className="mt-6 space-y-5">
            {c.artigos.map((a) => (
              <article key={a.id} id={a.id} aria-labelledby={`art-${a.id}`} className="glass-card scroll-mt-28 p-5 sm:p-7">
                <div className={a.imagem ? 'grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] xl:items-start' : undefined}>
                  <div className="min-w-0">
                    <h3 id={`art-${a.id}`} className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                      {a.titulo}
                      {a.admin && <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[11px] font-semibold">Administrador</span>}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{a.resumo}</p>
                    {a.passos && (
                      <ol className="mt-4 space-y-2.5">
                        {a.passos.map((p, i) => (
                          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                            <span className="tabular mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">{i + 1}</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {a.itens && (
                      <dl className="mt-4 space-y-3">
                        {a.itens.map((i) => (
                          <div key={i.t}>
                            <dt className="text-[15px] font-semibold">{i.t}</dt>
                            <dd className="text-[15px] leading-relaxed text-ink-2">{i.d}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {a.dica && (
                      <p className="mt-4 flex gap-2 rounded-2xl bg-pill-active/55 p-3 text-[13px] dark:bg-white/6">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> <span>{a.dica}</span>
                      </p>
                    )}
                  </div>
                  {a.imagem && (
                    <figure className={a.imagem.retrato ? 'mx-auto w-full max-w-[300px]' : 'min-w-0'}>
                      <a href={a.imagem.src} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl border border-glass-border shadow-sm" aria-label={`${a.imagem.alt} (abrir imagem ampliada)`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.imagem.src} alt={a.imagem.alt} width={a.imagem.retrato ? 390 : 1280} height={a.imagem.retrato ? 600 : 800} loading="lazy" decoding="async" className="h-auto w-full" />
                      </a>
                      <figcaption className="mt-2 text-xs text-ink-2">{a.imagem.alt}</figcaption>
                    </figure>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
