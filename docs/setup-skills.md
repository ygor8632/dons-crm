# Instalação das skills do projeto

Rodar numa sessão no ambiente **dons-crm** (tem acesso a `github.com` e `codeload.github.com`).
Instalar no **projeto** (`.claude/skills/`) e commitar: as sessões na nuvem são descartáveis,
então skills instaladas só no usuário (`~/.claude`) somem a cada sessão.

Antes de instalar cada skill: ler o `SKILL.md` e os scripts que ela traz (é conteúdo de terceiros
que vira instrução para o Claude).

## Design e texto
| Skill | Repositório |
|---|---|
| design-taste-frontend, learn-taste | `Leonxlnx/taste-skill` |
| impeccable | `pbakaus/impeccable` |
| scroll-craft | `nateherkai/scroll-craft` |
| human-speak | `nateherkai/human-speak` |

## Animação e interação (Emil Kowalski)
`emilkowalski/skills` (confirmar; também existe `emilkowalski/skill`):
animate, choreograph, gestures, mobile-native, review-animations, improve-animations,
find-animation-opportunities, remove-animations, animation-performance, animation-vocabulary,
apple-design, emil-design-eng, break-ui, prototype, pick-ui-library, ask-emil, ask-sonner.
Não instalar: animate-expo e write-swift (React Native/iOS, não se aplicam ao site).

## Fluxo de trabalho
| Skill | Repositório (confirmar) |
|---|---|
| grill-me | `mattpocock/skills` |
| brainstorm | `obra/superpowers` (skill `brainstorming`) |
| caveman | `JuliusBrussee/caveman` |
| agent-browser | `vercel-labs/agent-browser` |
| find-skills | `vercel-labs/skills` |

## Comandos
```bash
npx skills add Leonxlnx/taste-skill
npx skills add pbakaus/impeccable
npx skills add nateherkai/scroll-craft
npx skills add nateherkai/human-speak
npx skills add emilkowalski/skills
npx skills add mattpocock/skills --skill grill-me
npx skills add obra/superpowers --skill brainstorming
npx skills add JuliusBrussee/caveman
npx skills add vercel-labs/agent-browser
npx skills add vercel-labs/skills --skill find-skills
```
(Conferir as opções com `npx skills --help`: escolher instalação no projeto e o agente Claude Code.)

## Bibliotecas (já instaladas em 22/11/2026)
gsap 3.15 (ScrollTrigger, SplitText, ScrollSmoother, Flip, MorphSVG, DrawSVG inclusos), animejs 4,
three 0.187 + @types/three, motion 14 (base do Motion Primitives — componentes via
`npx motion-primitives add <nome>`), liquid-glass-react, sonner.

Componentes do **21st.dev** e do **shadcn/ui** são adicionados sob demanda:
`npx shadcn@latest add <componente ou URL do 21st.dev>`.

## Registros e MCP (configurados no repositório)
- **microkit** (`@microkit`, microinterações): registro em `components.json` → `https://microkit.co/r/{name}.json`.
  Primeiro componente pedido: `npx shadcn@latest add @microkit/hold-to-delete-button`.
- **kitbitz** (ícones 3D): servidor MCP em `.mcp.json` → `https://mcp.kitbitz.art`.
  Confirmar o caminho do endpoint (pode ser `/mcp` ou `/sse`) na primeira sessão que carregá-lo.

## Hosts que o ambiente dons-crm precisa liberar
`ui.shadcn.com` (índice de registros do shadcn), `microkit.co`, `mcp.kitbitz.art`
(além de `github.com`, `codeload.github.com`, `21st.dev`, já liberados).

Pendente (nome não encontrado no npm, aguardando link): kinects.
