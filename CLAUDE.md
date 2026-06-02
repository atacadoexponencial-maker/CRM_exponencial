# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**CRM Exponencial** é um CRM para atacadistas voltado ao método de vendas exponencial. O sistema é projetado para empresas que vendem via WhatsApp, com times separados de **Expansão** (prospecção) e **Retenção** (recompra). É uma aplicação **multi-tenant**: cada empresa (workspace) tem seus próprios usuários, times e números de WhatsApp isolados por RLS.

### Módulos previstos

- **Módulo 0 — Fundação** ✅ *concluído*: multi-tenant, papéis (Admin/Gerente/Atendente), times, números WhatsApp
- **Módulo 1 — Chat** ✅ *concluído*: Chat WhatsApp (API Oficial Meta), caixa de entrada, envio de mídia, etiquetas, mensagens rápidas
- **Módulo 2 — Pipeline** ✅ *concluído*: funil Expansão e Retenção
- **Módulo 3 — Contatos** *(em desenvolvimento)*
- **Módulo 4+ — Sequências, Dashboard, Grupos, Campanhas** *(futuro)*

### Status atual

O app está em **produção no Vercel** em `https://crm-exponencial.vercel.app`. O schema Supabase está criado e todas as queries/mutations são reais. Os módulos 0, 1 e 2 estão completamente implementados com backend real.

### Deploy e variáveis de ambiente

O app está deployado no Vercel. **Todas as variáveis de ambiente já estão configuradas no Vercel** — não é necessário perguntar ou configurar novamente:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `NEXT_PUBLIC_META_APP_ID` / `NEXT_PUBLIC_META_CONFIG_ID` / `META_APP_SECRET` — Meta WhatsApp API
- `WHATSAPP_VERIFY_TOKEN` — validação do webhook Meta
- `META_TEST_ACCESS_TOKEN` — token temporário do número de teste Meta (expira em 24h)

## Commands

```bash
npm run dev          # Dev server na porta 3000
npm run build        # Build de produção
npm run lint         # ESLint
npm run test         # Rodar testes uma vez (Vitest)
npm run test:watch   # Rodar testes em watch mode
```

Para rodar um único arquivo de teste:
```bash
npx vitest run src/test/example.test.ts
```

E2E usa Playwright (`playwright.config.ts`).

## Architecture

Aplicação Next.js 15 (App Router), TypeScript, Supabase.

### Routing & Layout

`src/app/` define todas as rotas. Usuários não autenticados são redirecionados para `/login` pelo middleware. Rotas protegidas ficam em `src/app/(auth)/`.

Rotas existentes:
- `/login` — login com Supabase Auth
- `/cadastro` — cadastro de empresa (cria workspace, admin e times padrão)
- `/politica-de-privacidade` — página pública
- `/termos-de-servico` — página pública
- `/(auth)/chat` — caixa de entrada + conversa WhatsApp (tempo real)
- `/(auth)/pipeline` — funil Expansão
- `/(auth)/pipeline/retencao` — funil Retenção
- `/(auth)/contatos` — listagem de contatos
- `/(auth)/contatos/[id]` — perfil do contato
- `/(auth)/perfil` — perfil do usuário logado
- `/(auth)/configuracoes/usuarios` — gestão de usuários
- `/(auth)/configuracoes/times` — gestão de times
- `/(auth)/configuracoes/whatsapp` — conexão WhatsApp (Embedded Signup Meta)
- `/(auth)/configuracoes/etiquetas` — gestão de etiquetas
- `/(auth)/configuracoes/mensagens-rapidas` — gestão de mensagens rápidas

### Domain Model

| Entidade | Descrição |
|----------|-----------|
| `workspaces` | Empresa cadastrada (isolamento multi-tenant) |
| `users` | Usuários com papel: Admin, Gerente ou Atendente |
| `teams` | Times da empresa: Expansão e Retenção (padrão) + customizados |
| `user_teams` | Associação N:N entre usuários e times |
| `whatsapp_connections` | Números WhatsApp conectados |

### State Management

- **Server state**: TanStack React Query para fetching, cache e mutations.
- **UI state**: `useState` local — sem biblioteca global.

### Backend (Supabase)

- **Database**: PostgreSQL com RLS (Row Level Security) para isolamento por workspace.
- **Auth**: Supabase Auth via SSR cookies — o middleware gerencia o redirecionamento.
- **Types**: `src/integrations/supabase/types.ts` é auto-gerado (`supabase gen types typescript --linked`) — não editar.
- **Migrations**: adicionar novos `.sql` em `supabase/migrations/`.
- **Server Actions**: lógica backend fica em arquivos `actions.ts` co-localizados com a rota. Ex: `src/app/cadastro/actions.ts`.

### Key Directories

- `src/app/` — rotas (App Router)
- `src/components/ui/` — primitivos UI (não modificar componentes gerados pelo shadcn)
- `src/components/shared/` — componentes reutilizáveis da aplicação
- `src/hooks/` — hooks customizados
- `src/lib/` — utilitários e constantes compartilhadas
- `src/integrations/supabase/` — clients Supabase e tipos auto-gerados
- `pre-desenvolvimento/` — specs e documentação do produto

### UI

Componentes usam **Base UI** (`@base-ui/react`) — não Radix UI — com **Tailwind CSS 4** e **CVA** (class-variance-authority) para variantes. Ícones: **Lucide React**. Formulários: **React Hook Form + Zod**. A UI é em **português (pt-BR)**.

## Workflow

Use sempre nesta ordem: `/spec` → `/break` → `/plan` → `/execute`
