# 13: Editar Observações do Contato

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Usuário edita o campo de observações do contato (texto livre) e o valor é salvo ao sair do campo ou ao clicar em "Salvar"; as observações são visíveis apenas internamente pelo time.

## Cenários

### Happy Path
1. Usuário (Admin ou Gerente) abre o perfil do contato
2. Na seção "Observações", clica no botão "Editar"
3. Um `<textarea>` aparece com o valor atual das observações
4. Usuário digita ou modifica o texto
5. Clica em "Salvar" ou sai do campo (onBlur)
6. O texto é salvo no banco e o modo de visualização é restaurado

### Edge Cases
- Campo vazio: salvar com texto vazio é permitido (limpa as observações)
- Usuário clica "Cancelar": descarta alterações e volta ao modo de visualização
- Atendente não vê o botão "Editar" (somente leitura)
- Texto muito longo: o textarea permite scroll sem limite de caracteres

### Cenário de Erro
- Se o save falhar: exibe mensagem de erro inline ("Erro ao salvar. Tente novamente.") e permanece em modo de edição

## Banco de Dados

- Tabela: `contacts`
  - `observacoes` (text, nullable) — observações internas sobre o contato

## Arquivos

- **Criar:** `supabase/migrations/20260603000004_add_contact_observacoes.sql` — adiciona coluna `observacoes text` à tabela `contacts`
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — atualiza `PERFIL_SELECT` para incluir `observacoes`, mapeia campo em `buscarDadosContato`, adiciona action `atualizarObservacoesContato`
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — adiciona edição inline na seção Observações (estado local `editandoObs`, `textoObs`, `erroObs`, `salvandoObs`)

## Checklist

- [x] Migration: adicionar coluna `observacoes text` em `contacts`
- [x] Action `atualizarObservacoesContato`: salva observações no banco, verifica autenticação, todos os papéis podem editar (não só admin/gerente)
- [x] `buscarDadosContato`: incluir `observacoes` no SELECT e mapear no retorno
- [x] `perfil-contato.tsx`: seção Observações com botão "Editar" (visível para todos os papéis), textarea ao editar, botões "Salvar" e "Cancelar", erro inline
