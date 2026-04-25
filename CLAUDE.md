# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**CRM Exponencial** é um CRM para atacadistas voltado ao método de vendas exponencial. O sistema é projetado para empresas que vendem via WhatsApp, com times separados de **Expansão** (prospecção) e **Retenção** (recompra). É uma aplicação **multi-tenant**: cada empresa (workspace) tem seus próprios usuários, times e números de WhatsApp isolados por RLS.

### Módulos previstos

- **Módulo 0 — Fundação** *(em desenvolvimento)*: multi-tenant, papéis (Admin/Gerente/Atendente), times, números WhatsApp
- **Módulo 1+** *(futuro)*: Chat WhatsApp (API Oficial Meta), Pipeline de vendas, Contatos, Dashboard

### Status atual

A maioria das páginas são **protótipos UI-only com mock data local** — o schema Supabase ainda não foi criado e o `types.ts` está vazio. Os clientes Supabase estão configurados, mas sem queries ou mutations reais.

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
- `/login` — formulário de login (UI-only, sem lógica backend)
- `/cadastro` — cadastro de empresa com validação Zod + Server Action para checar e-mail duplicado
- `/(auth)/perfil` — perfil do usuário (UI-only)
- `/(auth)/configuracoes/usuarios` — gestão de usuários (mock data)
- `/(auth)/configuracoes/times` — gestão de times (mock data)
- `/(auth)/configuracoes/whatsapp` — números WhatsApp (mock data)

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
