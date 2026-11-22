# Regras de Uso e Desenvolvimento - Dons CRM

Este documento define os padrões e regras para continuar a programação deste projeto de forma segura e padronizada, quer seja por programadores humanos ou através de diferentes sessões de Inteligência Artificial.

## 1. Regras de Inteligência Artificial (Continuidade)
Sempre que iniciar uma nova sessão com uma IA para continuar este projeto, copie e cole o seguinte prompt junto com o arquivo `projeto_dons_crm.md`:

> *"Estou a desenvolver um SaaS Multi-tenant chamado Dons CRM. Lê o documento de arquitetura anexado para entenderes o contexto. Todas as tuas respostas devem ser em **Português (PT)**. O foco agora é [DESCREVER O OBJETIVO DA SESSÃO]."*

## 2. Regras de Código e Next.js
- **Client vs Server Components:** O projeto utiliza o Next.js App Router. Por padrão, os componentes são Server Components. Use `'use client'` apenas no topo de arquivos que precisem de interatividade (useState, useEffect, onClick).
- **Server Actions:** Toda a manipulação de dados sensíveis (criar utilizadores, alterar regras que precisam da Service Role Key) deve ser feita em Server Actions (arquivos `.ts` separados com a diretiva `'use server'`).
- **Design System:** Utilize sempre as classes do **Tailwind CSS** e os componentes do **shadcn/ui**. Não crie arquivos `.css` avulsos (exceto o `globals.css` base).

## 3. Regras de Versionamento (Git) e Deploy
O deploy na Hostinger é automático. Cada "push" para a branch `main` gera uma nova build em produção.

**Padrão de Commits (Conventional Commits):**
Utilize prefixos semânticos para facilitar a leitura do histórico:
- `feat:` (Para novas funcionalidades. Ex: `feat: adiciona dashboard de cliente`)
- `fix:` (Para correção de bugs. Ex: `fix: corrige erro de tipagem no componente button`)
- `ui:` (Para mudanças estéticas/design. Ex: `ui: melhora cores da tabela`)
- `chore:` (Para manutenção de dependências ou configs. Ex: `chore: atualiza shadcn`)

**Fluxo de Trabalho Seguro:**
1. Escreva e teste o código localmente (`npm run dev`).
2. Garanta que o terminal não apresenta erros de tipagem do TypeScript.
3. Faça o commit com uma mensagem clara.
4. Faça o `git push`.
5. Acompanhe a build na Hostinger para garantir que não existem conflitos de ambiente.

## 4. Regras de Segurança
- **Arquivos `.env`:** Os arquivos `.env.local`, `.env.production` ou qualquer outro arquivo com chaves, tokens ou senhas não devem ser partilhados em chats públicos de IA e **nunca** devem ser "commitados" no GitHub. (O arquivo `.gitignore` deve incluir `.env*`).
- **RLS do Supabase:** Qualquer nova tabela criada no Supabase **deve obrigatoriamente** ter o *Row Level Security* (RLS) ativado e incluir políticas que restrinjam a leitura/escrita baseadas no `tenant_id` e na função `is_superadmin()`.

## 5. Autorizações permanentes (definidas pelo dono do projeto em 22/11/2026)
Agentes de IA (Claude Code e outros) trabalhando neste repositório estão **previamente autorizados**, sem precisar pedir confirmação a cada vez, a:
- **Fazer commits** (e o push correspondente) das alterações feitas na sessão.
- **Criar, alterar e editar SQL**: migrations em `supabase/migrations/`, roteiros de teste em `supabase/tests/` e a aplicação dessas mudanças no banco do Supabase.
- **Mesclar na `main`** (e dar o push que publica em produção pela Hostinger), acompanhando o build até concluir.
- **Executar SQL diretamente no Supabase** (consultas, ensaios e aplicação de migrations pelo MCP/CLI), além de editá-lo.
- **Rodar o build e publicar na Hostinger**: `npm run build`, commit, merge na `main` e acompanhamento/novo disparo do deploy pela API da Hostinger.

Reforçado pelo dono do projeto em 22/11/2026: nenhuma dessas ações precisa de autorização manual. O agente não deve parar para perguntar antes de executar ou editar SQL no Supabase, buildar, commitar ou publicar na Hostinger.

Continua valendo, por segurança: testar a migration antes (ensaio com rollback, como em `supabase/tests/`); antes de mesclar na `main`, rodar `npm run build` sem erros; depois do merge, acompanhar o build na Hostinger e conferir o site no ar; seguir a seção 4 (RLS em toda tabela nova, nenhuma chave no repositório) e registrar o que foi feito na mensagem do commit.
