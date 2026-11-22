# Design brief — redesign "Glassy" do Dons CRM

Referência: vídeo "Glassy Dashboard V2" enviado pelo cliente (quadros em `docs/referencias/`).
Escopo, nesta ordem: **1) dashboard (superadmin) e painel (cliente)** → **2) home, login,
esqueci/redefinir senha e demo**, no mesmo sistema visual.

## Linguagem visual extraída (cores amostradas dos quadros)

| Elemento | Referência |
|---|---|
| Fundo | Imagem desfocada e quente atrás de tudo; a interface "flutua" por cima |
| Vidro | Painéis e cards em branco fosco (~35–55% de opacidade), `backdrop-blur` forte, borda clara fina (branco/40), raio ~20–24px, sombra suave |
| Base | Bege/taupe `#dad3c9`, `#d1cdc9`; texto quase preto `#1b1716`; botões pílula pretos |
| Destaques | Coral `#da4c3c` (progresso, barras, toggles, linha de receita); esmeralda em gradiente `#63ccad → #13775b` (card de destaque); donut: azul `#5d73e0`, amarelo `#edb00b`, verde `#28a748`, coral, preto |
| Chips de variação | Verde claro `#c0dcca` com texto verde (+); rosa `#e6c7c7` com texto vermelho (−) |
| Tipografia | Sans tipo Inter; título de página grande e bold ("Good morning, Code XR"), subtítulo pequeno e esmaecido; números grandes e bold; rótulos pequenos |
| Navegação | 3 pílulas flutuantes: **topo** (avatar + saudação, campo do assistente ao centro, sino); **trilho vertical à esquerda** só com ícones, item ativo em círculo branco, tooltip ao passar; **abas inferiores** centralizadas (ativa em pílula branca) + botão redondo "+" |
| Componentes | Card KPI (rótulo + ícone no canto + valor + chip + "este mês"); barras com hachura listrada; gráfico de linhas suave com área; donut com total no centro e legenda em barras; tabela dentro de vidro com cabeçalho em faixa; card com anel de progresso; toggles iOS; seletor segmentado (Esta semana/Este mês/Este ano); botões pílula preto/branco |
| Movimento | `whileHover={{ y: -5 }}` nos cards (motion); troca de tela com desfoque/fade; tooltips no trilho |

## Decisões do cliente (22/11/2026)

1. **Fundo por empresa**: cada empresa envia sua imagem de fundo em Configurações; padrão =
   gradiente quente animado (bege/terracota com manchas suaves) que respeita `cor_primaria`.
   → Precisa: coluna `empresas.fundo_url` + bucket no Supabase Storage (`marca/<empresa_id>/...`)
   com RLS (só admin da empresa/superadmin grava; membros leem). Aproveitar para o logo virar
   upload também (hoje é um campo de URL).
2. **As 3 navegações**, como na referência:
   - Topo: saudação ("Bom dia, {nome}"), busca global de leads ao centro, notificações (tarefas vencendo).
   - Trilho: Visão geral · Leads · Equipe · Integrações · Configurações (superadmin: Visão geral · Clientes · Planos/Validade · Configurações).
   - Abas inferiores: visões da seção atual (ex.: Leads → Kanban / Lista / Tarefas); "+" cria lead (no superadmin, cria empresa).
3. **Modo escuro "vidro fumê"**: mesmo layout, vidro escuro e fundo quente escurecido; segue o
   sistema e tem botão para alternar (via classe `.dark` do shadcn, sem ternários espalhados).

## Regras de implementação

- Tokens únicos em `app/globals.css` (claro + `.dark`); utilitários `.glass`, `.glass-strong`,
  `.glass-pill`. A cor da empresa entra como `--brand` e substitui o coral.
- Contraste: texto sobre vidro precisa passar AA mesmo sobre fundos de cliente claros/escuros —
  aumentar opacidade do vidro quando a imagem de fundo for usada; testar com `design:accessibility-review`.
- `prefers-reduced-motion`: desligar hover lift e transições de tela.
- Quebrar `app/painel/page.tsx` (848 linhas) em componentes por seção; trocar `alert/confirm` por
  Sonner e diálogos; usar `hold-to-delete-button` (microkit) para exclusões.
- Gráficos com Recharts seguindo a skill `dataviz` + paleta da referência.
- Performance: `backdrop-filter` é caro — limitar camadas de blur aninhadas; no mobile reduzir blur.

## Skills a usar

`taste-skill`, `impeccable`, `emil-design-eng`, `apple-design`, `find-animation-opportunities`,
`choreograph`, `animation-performance`, `break-ui` (nomes longos, listas vazias), `ask-sonner`,
`design:accessibility-review`, `dataviz`, `run` (prints antes/depois).

## Entrega

Prints de antes/depois por tela. Merge na `main` previamente autorizado (ver `regras_de_desenvolvimento.md`, seção 5).
