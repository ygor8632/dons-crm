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

## Etapa 2: upload de logo e fundo (22/11/2026)
- Migration `20261122045640_marca_storage` aplicada em produção: coluna `empresas.fundo_url`, bucket
  **privado** `marca` (PNG/JPEG/WebP, 5 MB, sem SVG) e policies: membros leem a pasta da própria
  empresa; só admin da empresa e superadmin gravam/apagam. Ensaio `supabase/tests/ensaio_marca.sql`:
  18/18 ok, com rollback forçado. Advisor de segurança sem alertas novos.
- O banco guarda o caminho (`<empresa_id>/fundo-<data>.webp`); o app gera links assinados de 24 h.
  URLs http(s) antigas de logo continuam funcionando.
- No navegador a imagem é reduzida (logo 512 px, fundo 2400 px) e convertida para WebP antes do envio;
  ao trocar ou remover, o arquivo anterior é apagado.
- Contraste medido nos pixels (texto secundário vs. pior ponto do fundo) com foto escura e clara, nos
  dois temas: todas as combinações ≥ 4,5:1 depois de engrossar o vidro com imagem (`[data-fundo=imagem]`).
- Prints: `prints/marca-*.jpg`.

## Pendente (próximas etapas)
- Testar o envio real com a conta de admin (os testes daqui usaram Storage simulado no navegador).
- Paleta categórica do modo escuro: âmbar e coral ficam próximos para daltonismo (há legenda e rótulos,
  mas vale ajustar o tom).
- Auditoria formal de acessibilidade (`design:accessibility-review`) sobre fundos de cliente.
- Fase 2 do brief: home, login, esqueci/redefinir senha e demo (usar `taste-skill` aqui).
