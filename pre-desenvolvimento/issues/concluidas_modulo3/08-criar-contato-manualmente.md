# 08: Criar Contato Manualmente

**Tipo:** Implementação
**Página:** Lista de Contatos

## Descrição

Admin ou Gerente clica em "Novo contato", preenche o formulário com nome e número de WhatsApp (obrigatórios) e dados opcionais, e salva; o contato criado aparece na lista com classificação "Sem histórico".

## Cenários

### Happy Path
1. Admin clica em "Novo contato" — dialog abre com formulário vazio
2. Preenche nome ("Padaria Silva") e número ("+5511999990001") — campos obrigatórios
3. Opcionalmente preenche tipo, nicho e cidade
4. Clica em "Salvar" — dialog fecha, lista atualiza com o novo contato no topo (mais recente)
5. Novo contato aparece com badge "Sem histórico"

### Edge Cases
- Atendente não vê o botão "Novo contato" (já condicional em `lista-contatos.tsx`)
- Fechar o dialog sem salvar descarta os dados do formulário
- Campos opcionais vazios: `tipo`, `nicho` e `cidade` ficam `null` no banco

### Cenário de Erro
- Número já existe para o workspace: exibe mensagem "Número já cadastrado neste workspace" (issue 09 trata a validação prévia; aqui tratamos o erro do banco)
- Erro genérico do Supabase: exibe "Erro ao criar contato. Tente novamente."

## Banco de Dados

- Tabela: `contacts`
  - Inserção com: `workspace_id`, `phone_number`, `name`, `tipo`, `nicho`, `cidade`
  - `classificacao` usa o default `'sem_historico'` do banco

- Nova política RLS necessária:
  - Admin e Gerente podem inserir contatos no próprio workspace

## Arquivos

- **Criar:** `supabase/migrations/20260603000001_contacts_insert_policy.sql` — política RLS de INSERT para admin e gerente
- **Criar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — dialog com formulário (React Hook Form + Zod); padrão igual ao `adicionar-usuario-dialog.tsx`
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — adicionar `criarContato()` server action
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — substituir o `<Button>` solto por `<NovoContatoDialog />`

## Checklist

- [x] Criar `20260603000001_contacts_insert_policy.sql` com política INSERT para admin/gerente
- [x] Criar `novo-contato-dialog.tsx` com schema Zod (nome obrigatório, telefone obrigatório, tipo/nicho/cidade opcionais)
- [x] Implementar `criarContato()` em `actions.ts`: verifica papel, insere em `contacts`, retorna `{ erro }` ou `{ id }`
- [x] Modificar `lista-contatos.tsx`: importar e usar `<NovoContatoDialog>` no lugar do botão estático
