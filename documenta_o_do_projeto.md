# Dons CRM - Documentação do Projeto

## 1. Visão Geral
O **Dons CRM** é uma plataforma SaaS (Software as a Service) Multi-tenant (múltiplos inquilinos/clientes). O sistema permite que um Superadmin crie e gira instâncias de CRM para diferentes clientes (empresas). Cada cliente tem o seu próprio ambiente isolado para receber e gerir as suas Leads.

## 2. Stack Tecnológico (O "Motor")
- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Base de Dados & Autenticação:** Supabase
- **Estilização:** Tailwind CSS
- **Componentes de UI:** shadcn/ui
- **Hospedagem / CI-CD:** Hostinger (deploy automático via GitHub)
- **Repositório:** `github.com/ygor8632/dons-crm` (Branch principal: `main`)

## 3. Arquitetura do Banco de Dados (Supabase)
O projeto utiliza três tabelas principais, protegidas por **Row Level Security (RLS)** avançado.

1. **`tenants` (Empresas/Clientes):** Guarda os dados das empresas registadas.
2. **`profiles` (Utilizadores):** Guarda os perfis de acesso, ligados ao Auth do Supabase. Inclui a coluna `role` (ex: 'superadmin', 'admin') e o `tenant_id`.
3. **`leads` (Potenciais Clientes):** Guarda os contactos recebidos, associados a um `tenant_id`.

**Segurança RLS:**
Para evitar bloqueios de recursividade ("infinite loop"), utilizamos funções `SECURITY DEFINER` diretamente no SQL do Supabase:
- `public.get_user_role()`: Retorna o cargo do utilizador logado.
- `public.get_user_tenant_id()`: Retorna o ID da empresa do utilizador logado.

## 4. Funcionalidades Já Implementadas (Atuais)
- ✅ **Deploy Contínuo:** Configurado na Hostinger (URL: `crm.donstech.com.br`).
- ✅ **Autenticação Segura:** Login padrão e proteção de rotas privadas (ex: `/dashboard`).
- ✅ **Painel Superadmin:** Leitura de métricas (Total de Clientes e Leads Ativas) e listagem em tabelas.
- ✅ **Criação de Clientes (Tenant Onboarding):** Server Action (`app/dashboard/actions.ts`) que utiliza o `supabaseAdmin` (Service Role Key) para criar o Tenant e o Perfil do utilizador nos bastidores, sem derrubar a sessão atual do Superadmin.
- ✅ **Webhook de Leads (API):** Rota `POST` configurada em `/api/webhooks/leads` para receber dados de formulários externos de forma invisível.

## 5. Próximas Funcionalidades (Roadmap)
- ⏳ **Revamp Visual (UI/UX):** Atualização do design da Landing Page, Login e Dashboard com base em referências futuras.
- ⏳ **Dashboard do Cliente:** Visão isolada para o cliente final (sem permissões de Superadmin), onde poderá ver apenas as suas próprias Leads.
- ⏳ **Gestão de Leads:** Interface para alterar o `status` (ex: Novo, Em Contacto, Ganho, Perdido) e adicionar notas.
- ⏳ **Integração Real:** Conectar o Webhook a um formulário real (ex: WordPress/Elementor).
- ⏳ **Recuperação de Palavra-passe:** Fluxo de "Esqueci a minha senha".

## 6. Variáveis de Ambiente e Chaves (Segurança)
**NUNCA adicione chaves reais neste arquivo ou em commits do GitHub.** 
As variáveis necessárias no arquivo `.env.local` (local) e na Hostinger (produção) são:

```env
# URL público do seu projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui

# Chave anónima pública
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui

# CHAVE MESTRA (Segredo absoluto - Usada apenas no backend/Server Actions)
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```