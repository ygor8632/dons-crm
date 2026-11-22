# Auditoria do Dons CRM — novembro/2026

Revisão completa do código (todas as rotas, páginas, configs), typecheck, lint, build de produção e `npm audit`.
Estado na data: `tsc` ✅ · `next build` ✅ (com aviso de segurança do Next) · lint ❌ 29 erros / 42 avisos · `npm audit` 15 vulnerabilidades (1 crítica, 6 altas).

> Este documento é o ponto de partida das próximas sessões. Atualize os checkboxes conforme as etapas forem concluídas.

---

## 0. Incidente: chave mestra do Supabase exposta

- `.env.production` foi commitado de propósito (commit `f16a6b5`, "força o envio do env.production ignorando o gitignore") e contém a `SUPABASE_SERVICE_ROLE_KEY` (JWT legado, ignora RLS).
- Remover o arquivo do repositório **não basta**: a chave segue no histórico do Git. Ela precisa ser **revogada e substituída**.

Plano de rotação (sem derrubar produção):
- [x] Criar uma nova **secret key** (`sb_secret_...`) em Supabase → Project Settings → API Keys.
- [x] Colocar a nova chave na variável `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente da Hostinger e refazer o deploy.
- [x] Confirmar que produção funciona (login, painel, webhook de leads, convite).
- [x] **Desativar as chaves JWT legadas** (anon + service_role) em Supabase → API Keys → Legacy API Keys. O app já usa a publishable key (`sb_publishable_...`) no navegador, então só a service_role legada cai.
- [ ] (Opcional) Rotacionar o JWT secret / migrar para JWT signing keys.
- [x] `.env.production` removido do repositório (branch `claude/hopeful-cori-y3jjdg`). **Atenção:** antes de levar isso para a `main`, garantir que as variáveis estão configuradas no painel da Hostinger, senão o build de produção fica sem elas.

---

## 1. Segurança — crítico

| # | Problema | Arquivo | Ação |
|---|---|---|---|
| 1.1 | `POST /api/equipe/convite` **sem autenticação**: qualquer pessoa convida qualquer e-mail para qualquer `empresa_id` com `role: 'admin'` → tomada de conta de qualquer empresa. | `app/api/equipe/convite/route.ts` | Exigir sessão (cliente Supabase de servidor + `getUser()`), checar que o chamador é admin **da mesma empresa** ou superadmin; whitelist de roles; só superadmin cria admin. |
| 1.2 | `POST /api/webhooks` (legado) **sem autenticação**, aceita `empresa_id` no corpo → injeção de leads em qualquer cliente. | `app/api/webhooks/route.ts` | Apagar (substituído por `/api/webhooks/leads`). |
| 1.3 | Server Action `criarCliente` sem checagem de quem chama, usando tabelas antigas (`tenants`/`profiles`). Código morto mas exposto. | `app/dashboard/actions.ts` | Apagar. |
| 1.4 | Proteção de rotas só no navegador: `/dashboard` e `/painel` são estáticas; checagem de superadmin e de empresa ativa roda em JS no cliente. Segurança real depende 100% do RLS. | `app/dashboard/page.tsx`, `app/painel/page.tsx` | Proxy/middleware de sessão + checagem no servidor (layout server-side) + revisar RLS. |
| 1.5 | Possível escalada de privilégio: o navegador faz `perfis.update({ role })` e `empresas.update(...)`. Se o RLS permitir o usuário editar o próprio perfil, um vendedor vira superadmin. | `app/painel/page.tsx` (~l.230) | Mover alterações de role para Server Action autorizada; RLS: coluna `role` nunca editável pelo próprio usuário. |
| 1.6 | Token de webhook gerado com `Math.random()` no navegador (previsível). | `app/dashboard/page.tsx` (~l.95) | Gerar no servidor com `crypto.randomBytes(32)`; permitir regenerar. |
| 1.7 | `valido_ate` (validade do plano) salvo mas **nunca verificado**; `ativo` só é checado no cliente. | `app/painel` | Verificar no servidor e no RLS/webhook. |
| 1.8 | Next.js 16.4.0 com vulnerabilidade crítica (RCE na otimização de imagem com SVG; DoS em Server Actions). Corrigido em 16.4.6. | `package.json` | Atualizar `next` e `eslint-config-next` para 16.4.6; `npm audit fix`. |

Menores: token do webhook aceito por query string (vaza em logs) · CORS `*` no webhook · sem rate limit no webhook · `error.message` do banco devolvido ao usuário · `package-lock.json` fora de sincronia (`npm ci` falha).

## 2. Banco de dados e arquitetura

- Não existe cliente Supabase de servidor nem proxy/middleware de sessão: tudo usa `createBrowserClient` + `getSession()` (não valida o JWT no servidor). Criar `utils/supabase/server.ts` com `@supabase/ssr` e usar `getUser()`.
- Onboarding de empresa em 3 chamadas soltas do navegador (empresa → etapas → convite); falha no meio deixa empresa órfã. Consolidar numa Server Action com rollback.
- Schema não versionado e documentação desatualizada (doc fala `tenants`/`profiles`; código usa `empresas`, `perfis`, `etapas_funil`, `leads`, `lead_anotacoes`, `tarefas`). Criar `supabase/migrations/` com tabelas + policies RLS.
- Cliente admin recriado em 3 arquivos. Centralizar em `utils/supabase/admin.ts` com `import 'server-only'`.
- Sem tipos gerados (`supabase gen types typescript`) → 20+ `any`.
- Importação de CSV feita à mão: quebra com vírgula entre aspas, sem validação nem limite de tamanho. Validar com Zod no servidor.

## 3. Estilização e código

- `app/painel/page.tsx` com 848 linhas e ~50 `useState`. Quebrar em componentes (Kanban, Lista, Equipe, Configurações, Ficha do Lead, Importação).
- Três paletas coexistindo: tokens do `globals.css` (deep-azure/teal, não usados), hex fixos espalhados (`#021024`, `#5483B3`, `#4361EE`…) e `--brand-primary` por empresa. Dark mode feito com ternários em vez da classe `.dark` do shadcn.
- `lib/utils.ts` usa o pacote `cn` em vez de `clsx` + `tailwind-merge` (conflitos de classe não resolvidos).
- 3 fontes carregadas (Inter, Geist, Geist Mono); `lang="pt-PT"` num app pt-BR.
- `alert()`/`confirm()` em vez de toasts/diálogos; `.jpg` de 78 KB solto na raiz; `test-lead.js` desatualizado; `README` padrão.

## 4. Plano por etapas

1. [x] **Segurança imediata** — itens 1.1, 1.2, 1.3, 1.6, 1.8 + rotação de chaves (seção 0) + RLS (seção 6).
2. [ ] **Camada de dados** — clientes server/middleware, rotas protegidas no servidor, Server Actions com Zod, migrations + RLS revisado, tipos gerados, validade do plano.
3. [ ] **Refatoração do painel** — componentes, zerar lint.
4. [ ] **Design system** — tokens únicos, dark mode via `.dark`, cor da empresa via CSS var, toasts (sonner), acessibilidade.
5. [ ] **Qualidade** — GitHub Actions (lint + typecheck + build antes do deploy na Hostinger), testes E2E com Playwright.

## 5. Ferramentas recomendadas

- Já disponíveis: `/security-review`, `/code-review`, `/simplify`, `design:design-system`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`, `run`, `dataviz`, `init`, `session-start-hook`.
- Instalar: plugin/conector **Supabase** (ler schema e RLS reais), conector **Hostinger** (deploys, DNS, variáveis), **claude-security** ou **Security Guidance**, **frontend-design**, (opcional) **Sentry**.

## 6. Atualização 22/11/2026 — RLS aplicado

Achado pelo advisor do Supabase: RLS **desligado** em `empresas`, `leads`, `perfis` e `etapas_funil`, com o papel `anon` tendo todos os privilégios. Qualquer visitante com a chave publishable (que vai no JS do site) lia, alterava e apagava os dados de todas as empresas.

- [x] Migration `supabase/migrations/20261122000000_rls_multitenant.sql` aplicada em produção.
- [x] Ensaio prévio (`supabase/tests/ensaio_rls.sql`): 41/41 testes ok, com rollback forçado.
- [x] Advisor de segurança: 0 erros. Restam: tabelas legadas `tenants`/`profiles` sem policies (intencional, fechadas) e proteção contra senhas vazadas.
- [~] "Leaked password protection" — indisponível no plano gratuito. Alternativa: exigir senha mínima de 8+ caracteres com letras e números em Authentication → Sign In / Providers → Email.
- [x] Tabelas/funções legadas apagadas (`tenants`, `profiles`, `leads.tenant_id`, `get_user_role`, `get_user_tenant_id`, `public.is_superadmin`) — migration `20261122010000`.
- [x] Usuários de teste removidos. Restam: `ygor8632@gmail.com` (superadmin) e `marketingygor2@gmail.com` (admin da Dons tech ltda., conta de validação das telas de cliente).
- [ ] Hostinger não injeta as variáveis de ambiente no build: o `next.config.mjs` tem fallback para a configuração pública e o cliente admin lê a secret key só em tempo de execução.

Outras correções já em produção: cadastro de empresa (webhook_token uuid gerado pelo banco + e-mail obrigatório), API de convite autenticada e criando o perfil, rotas inseguras removidas, Next.js 16.4.6.
