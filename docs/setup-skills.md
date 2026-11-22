# Skills, bibliotecas e integrações do projeto

**Status (22/11/2026): instalado.** 27 skills em `.claude/skills/` (commitadas), exceto `taste-skill`
(38 MB), baixada automaticamente no início de cada sessão pelo hook
`.claude/hooks/install-taste-skill.sh` (configurado em `.claude/settings.json`; pasta no `.gitignore`).
Todas foram lidas antes de instalar. Observações da auditoria: `impeccable` baixa seu motor das
releases oficiais do GitHub quando usado e conversa só com localhost; `brainstorming` sobe um
servidor local de pré-visualização; `scroll-craft` usa ffmpeg para codificar vídeo.

Origens confirmadas: learn-taste vem de `emilkowalski/skills` (não do taste-skill); a skill do
`Leonxlnx/taste-skill` chama-se `taste-skill` (design-taste-frontend); brainstorm = `brainstorming`
(obra/superpowers); grill-me = mattpocock/skills; caveman = JuliusBrussee/caveman.

Para atualizar uma skill: clonar o repositório de origem e substituir a pasta em `.claude/skills/`.

---


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
  Instalado: `components/microkit/hold-to-delete-button.tsx`.
- **kitbitz** (ícones 3D): servidor MCP em `.mcp.json` → `https://mcp.kitbitz.art`.
  Endpoint confirmado (HTTP streamable, raiz). Somente leitura: `search_illustrations`, `get_illustration`.

## Hosts que o ambiente dons-crm precisa liberar
`ui.shadcn.com` (índice de registros do shadcn), `microkit.co`, `mcp.kitbitz.art`
(além de `github.com`, `codeload.github.com`, `21st.dev`, já liberados).

Pendente (nome não encontrado no npm, aguardando link): kinects.
