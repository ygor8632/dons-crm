# Redesign glassy — etapa 1: sistema visual + shell (22/11/2026)

Prints em `prints/` (antes × depois lado a lado; `depois-*` são telas novas sem equivalente antigo).
Gerados com dados fictícios, interceptando o Supabase no navegador (nada tocou o banco de produção).

## Feito
- **Tokens únicos** em `app/globals.css` (claro + `.dark` "vidro fumê"), utilitários `glass`,
  `glass-pill`, `glass-strong`, `glass-card`, `lift`, `hatch`; fundo quente animado que mistura a
  `--brand` da empresa; suporte a `fundo_url` (vidro engrossa para manter contraste).
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` e blur menor no celular.
  Um único blur grande (o painel); cards internos não têm blur próprio.
- **Tema** sem flash (script no `<head>`), alternância no trilho, no menu do avatar e em Perfil;
  segue o sistema até a pessoa escolher.
- **Shell** (`components/shell/app-shell.tsx`) com as 3 navegações: topo (saudação, busca global com
  `/` ou Ctrl+K, notificações), trilho de ícones com tooltip, abas inferiores + "+". No celular o
  trilho vira doca inferior e as abas viram segmentado no topo. Seção/visão ficam na URL.
- **Painel** quebrado em `_lib/` (dados e ações) e `_components/` por seção. `alert/confirm` → Sonner;
  exclusões de etapa e membro com `hold-to-delete-button` (adaptado: callback, PT-BR, cores do sistema).
- **Dashboard** do superadmin no mesmo shell: Visão geral · Clientes · Planos e validade · Configurações.
- Paleta dos gráficos validada com a skill `dataviz` (modo claro passa; ver pendência do escuro).
- `cn` com `clsx` + `tailwind-merge`; só a fonte Inter; `lang="pt-BR"`.

## Pendente (próximas etapas)
- Upload de logo e imagem de fundo: coluna `empresas.fundo_url` + bucket `marca/<empresa_id>/` com RLS.
- Paleta categórica do modo escuro: âmbar e coral ficam próximos para daltonismo (há legenda e rótulos,
  mas vale ajustar o tom).
- Auditoria formal de acessibilidade (`design:accessibility-review`) sobre fundos de cliente.
- Fase 2 do brief: home, login, esqueci/redefinir senha e demo (usar `taste-skill` aqui).
