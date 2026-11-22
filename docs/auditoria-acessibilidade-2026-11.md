## Accessibility Audit: Dons CRM (painel, dashboard, home, acesso e demo)
**Standard:** WCAG 2.1 AA (e 2.2 AA onde indicado) | **Date:** 22/11/2026 | **Skill:** `design:accessibility-review`

Escopo: `/`, `/login`, `/esqueci-senha`, `/redefinir-senha`, `/demo` (todas as seções e visões),
`/painel` e `/dashboard` (com Supabase simulado no navegador), diálogos, menus, busca e notificações;
temas claro e vidro fumê; 1440 px, 390 px e 320 px.

Método: varredura axe-core 4.14 (tags wcag2a/aa, wcag21a/aa, wcag22aa, best-practice) em 64 combinações
de tela × tema × largura; navegação só por teclado automatizada (ordem do Tab, anel visível, foco em
diálogos e menus, Escape); alvos de toque a 390 px; reflow a 320 px; texto a 200 %; contraste medido
em pixels sobre o vidro (o axe marca como "inconclusivo" texto sobre `backdrop-filter`).

### Summary
**Issues found:** 11 | **Critical:** 1 | **Major:** 6 | **Minor:** 4 — **todas corrigidas** nesta rodada.
Resultado final: axe com **0 violações** nas 64 combinações; reflow sem rolagem horizontal em 320 px;
nenhum alvo de toque abaixo de 24 px; anel de foco visível em todos os controles.

### Findings

#### Perceivable
| # | Issue | WCAG Criterion | Severity | Recommendation (status) |
|---|-------|---------------|----------|----------------|
| 1 | Texto sobre a cor da marca (iniciais do avatar, badge do sino, avatares das empresas, botão "brand"): coral `#da4c3c` dava 4,1:1 com branco e 4,3:1 com preto; empresa âmbar dava 1,9:1 | 1.4.3 Contrast | 🟡 Major | `corSolida()`: para TEXTO, a cor da empresa é ajustada o mínimo até ≥ 4,6:1 (coral → `#cd4738`); barras e destaques sem texto mantêm a cor exata. Tokens `--brand-solid`. ✅ |
| 2 | Botão destrutivo ("Suspender") a 4,49:1 | 1.4.3 Contrast | 🟢 Minor | `--destructive` `#b42318` → `#9e1f15` (5,4:1). ✅ |
| 3 | Títulos pulando de h1 para h3 nos cards, colunas do Kanban e grupos de tarefas | 1.3.1 Info and Relationships | 🟢 Minor | Viraram h2, sem mudança visual. ✅ |
| 4 | Telas de acesso com conteúdo fora de regiões (prévia do painel, link solto) | 1.3.1 / best-practice | 🟢 Minor | Prévia em `<aside aria-label="Prévia do painel">`; link redundante removido. ✅ |

#### Operable
| # | Issue | WCAG Criterion | Severity | Recommendation (status) |
|---|-------|---------------|----------|----------------|
| 5 | Botões e campos do kit desligavam o contorno e usavam um anel fraco (50 % da cor da marca) | 2.4.7 Focus Visible | 🟡 Major | Removidos `outline-none` e o anel fraco: vale o anel global de 2 px na cor do texto, 3 px de folga (14:1 no claro, 13:1 no escuro). ✅ |
| 6 | Gráficos (Recharts) entravam no Tab (`svg`, `g`) sem informação útil, dentro de uma figura já descrita | 2.4.3 Focus Order | 🟡 Major | `accessibilityLayer={false}` e `rootTabIndex={-1}`; os números ficam na descrição da figura e nas legendas. ✅ |
| 7 | Alvos abaixo de 24 px no celular: links do rodapé (20 px), "Esqueci a senha" e "Ver a demonstração" (16 px), nomes de lead nas tabelas (20 px) | 2.5.8 Target Size (2.2 AA) | 🟡 Major | Área de toque ampliada (padding), sem mudar o visual. ✅ |
| 8 | Visão Lista a 320 px rolava na horizontal: o rótulo "Ações" (só para leitor de tela) do cabeçalho escapava do contêiner da tabela | 1.4.10 Reflow | 🟡 Major | Contêineres de rolagem das tabelas e do Kanban agora são posicionados (`relative`). ✅ |

#### Understandable
| # | Issue | WCAG Criterion | Severity | Recommendation (status) |
|---|-------|---------------|----------|----------------|
| 9 | — | 3.3.1 / 3.3.2 | — | Sem falhas: todos os campos têm rótulo visível; erros do login, senha nova e nome são texto anunciado (`role="alert"`), dizendo o que corrigir. |

#### Robust
| # | Issue | WCAG Criterion | Severity | Recommendation (status) |
|---|-------|---------------|----------|----------------|
| 10 | Campos de arquivo (logo e fundo) sem nome acessível | 4.1.2 Name, Role, Value | 🔴 Critical | `aria-label` "Arquivo do logo" / "Arquivo da imagem de fundo" e fora do Tab (o botão visível os aciona). ✅ |
| 11 | Nome acessível diferente do texto visível: link da marca ("Dons CRM, página inicial") e botões "segure para excluir" ("Remover acesso de…" com texto "Remover") | 2.5.3 Label in Name | 🟢 Minor → 🟡 para quem usa voz | Link usa o texto visível; nos botões o complemento virou texto só para leitor de tela depois do rótulo ("Remover: acesso de X. Segure para confirmar"). ✅ |

### Color Contrast Check
| Element | Foreground | Background | Ratio | Required | Pass? |
|---------|-----------|------------|-------|----------|-------|
| Texto principal (claro) | #1b1716 | #ede6de (vidro) | 14,38:1 | 4.5:1 | ✅ |
| Texto secundário (claro) | #5c524c | #ede6de | 6,14:1 | 4.5:1 | ✅ |
| Texto direto sobre o fundo (site, mancha mais escura) | #2e2724 | #b48d70 | 4,88:1 | 4.5:1 | ✅ |
| Texto principal (vidro fumê) | #f4efe9 | #2b2320 | 13,47:1 | 4.5:1 | ✅ |
| Texto secundário (vidro fumê) | #b9aea6 | #2b2320 | 7,09:1 | 4.5:1 | ✅ |
| Iniciais e badges sobre a marca | #ffffff | #cd4738 | 4,61:1 | 4.5:1 | ✅ |
| Card de destaque | #ffffff | #1c8062 | 4,87:1 | 4.5:1 | ✅ |
| Chip de alta / de queda | #1b5e36 / #9b2318 | #c0dcca / #e6c7c7 | 5,31 / 5,05:1 | 4.5:1 | ✅ |
| Botão destrutivo | #9e1f15 | #e6d1cb | 5,39:1 | 4.5:1 | ✅ |
| Anel de foco (claro / escuro) | texto | vidro | 14,4 / 13,5:1 | 3:1 | ✅ |
| Alternância ativa vs. trilho | #da4c3c | #ede6de | 3,34:1 | 3:1 | ✅ |
| Painel sobre foto do cliente (4 combinações claro/escuro × foto clara/escura) | — | pixels medidos | ≥ 4,58:1 | 4.5:1 | ✅ |

### Keyboard Navigation
| Element | Tab Order | Enter/Space | Escape | Arrow Keys |
|---------|-----------|-------------|--------|------------|
| Topo (menu do usuário, busca, sino) | 1–3 | Abre menu/painel | Fecha | Busca: ↑/↓ nos resultados, Enter abre o lead |
| Trilho de seções | 4–9 | Troca de seção; tooltip aparece no foco | — | — |
| Conteúdo da seção | depois do trilho | — | — | — |
| Abas inferiores e "+" | ao final | Troca de visão / abre "Novo lead" | — | — |
| Diálogos | foco vai ao 1º campo e fica preso (volta ao início depois do último) | — | Fecha com um toque e devolve o foco ao botão que abriu | — |
| Kanban | cards em ordem de coluna | Abre a ficha | — | Mover de etapa sem arrastar: seletor "Etapa" na ficha e na Lista |
| Atalhos | `/` ou Ctrl/⌘+K focam a busca | — | — | — |

### Screen Reader
| Element | Announced As | Issue |
|---------|-------------|-------|
| Gráficos | Figura com descrição dos números ("Leads por mês: jun 3, jul 5…") | — |
| Prévias do produto (home/login) | Uma figura com descrição única, não cada número | — |
| Sino | "Notificações: 2", botão, expandido/recolhido | — |
| Trilho | Botões com nome da seção; item atual com `aria-current="page"` | — |
| Erros de formulário | Anunciados (`role="alert"`) | — |
| Segure para excluir | "Remover: acesso de X. Segure para confirmar" | — |

### Priority Fixes
Todas aplicadas. Recomendações que ficam abertas (não são falhas de AA):
1. **Alvos de 44 px (2.5.5, nível AAA)** — vários botões têm 28–40 px no celular (pílulas do aviso da demo, botões pequenos dos cards). Passam no AA (24 px); subir para 44 px melhora o uso com o polegar.
2. **Teste com leitor de tela real** (VoiceOver/NVDA) — esta auditoria verificou nomes, papéis e estados por automação; uma passada humana pega ordem de leitura e verbosidade.
3. **Arrastar no Kanban** — já há alternativa por seletor; um modo de teclado no próprio card (setas para trocar de coluna) deixaria mais direto.
