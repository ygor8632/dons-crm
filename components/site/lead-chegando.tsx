/** Um lead chegando pelo webhook: o card entra na coluna em loop (para no reduced-motion). */
export function LeadChegando() {
  return (
    <div className="glass-card flex h-full flex-col gap-3 p-5 sm:p-6" role="img" aria-label="Um lead enviado pelo formulário do site aparece sozinho na primeira coluna do funil, Aguardando contato.">
      <p className="flex items-center gap-2 text-[13px] font-semibold"><span className="size-2.5 rounded-full bg-chart-3" />Aguardando contato</p>
      <div className="relative flex flex-1 flex-col gap-2">
        <div className="lead-novo glass-card rounded-2xl bg-pill-active/80 p-3.5 dark:bg-white/10">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold">Maria Silva</p>
            <span className="rounded-full bg-positive px-2 py-0.5 text-[11px] font-semibold text-positive-foreground">Novo</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Site · R$ 1.500</p>
        </div>
        {[['Clínica Vida Plena', 'Google Ads · R$ 4.500'], ['Pet Shop Patas', 'Indicação · R$ 900']].map(([n, d]) => (
          <div key={n} className="glass-card rounded-2xl p-3.5">
            <p className="text-[13px] font-semibold">{n}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
