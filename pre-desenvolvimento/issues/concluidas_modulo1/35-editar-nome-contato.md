# 35: Editar Nome do Contato

**Tipo:** Implementação
**Página:** Contato Básico

## Descrição

Implementar a edição inline do nome do contato no painel lateral: o usuário clica no nome, edita o campo, salva e o nome é atualizado no Supabase e refletido em todos os lugares onde o contato é exibido (lista de conversas, cabeçalho do chat).

## Cenários

### Happy Path
1. Usuário abre o painel lateral de um contato
2. Clica no ícone de lápis ao lado do nome
3. Campo de texto aparece com o nome atual
4. Edita o nome e pressiona Enter (ou clica no botão ✓)
5. Spinner indica salvamento; campo fica desabilitado
6. Nome é salvo na tabela `contacts` no Supabase
7. Nome atualizado aparece no painel lateral, no cabeçalho do chat e na lista de conversas

### Edge Cases
- Campo vazio: botão ✓ desabilitado, não salva
- Nome idêntico ao atual: permite salvar (sem verificação especial)
- Pressionar Escape: cancela a edição sem salvar, sem chamar o servidor
- Contato sem nome (telefone como fallback): ao salvar, passa a exibir o nome em todos os lugares

### Cenário de Erro
- Erro no Supabase: exibe mensagem "Erro ao salvar" inline no painel, nome local volta ao valor anterior, campo de edição continua visível para nova tentativa

## Banco de Dados

- Tabela: `contacts`
  - `name` (text | null) — nome do contato que será atualizado

## Arquivos

- **Modificar:** `src/app/(auth)/chat/mock-conversas.ts` — adicionar `contactId: string | null` à interface `Conversa`
- **Modificar:** `src/app/(auth)/chat/page.tsx` — incluir `contact_id` na query e mapear `contactId` no objeto `Conversa`
- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar server action `atualizarNomeContato(contactId, nome)`
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — chamar a action ao confirmar edição e propagar nome para cima via `onConversaAtualizada`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — passar `onConversaAtualizada` como prop para `PainelContato`

## Checklist

- [x] Adicionar `contactId: string | null` à interface `Conversa` em `mock-conversas.ts`
- [x] Incluir `contact_id` na query de `page.tsx` e mapear no objeto `Conversa`
- [x] Criar server action `atualizarNomeContato(contactId: string, nome: string)` em `actions.ts`
- [x] Adicionar prop `onConversaAtualizada` e `conversaId` a `PainelContato`, chamar a action em `confirmarEdicao`
- [x] Passar `onConversaAtualizada` de `PainelConversa` para `PainelContato`
- [x] Exibir estado de salvamento (botão desabilitado) e erro inline em `PainelContato`
