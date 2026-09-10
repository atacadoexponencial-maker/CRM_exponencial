# 40: Criar Nova Etiqueta

**Tipo:** Implementação
**Página:** Etiquetas

## Descrição

Implementar a criação de etiqueta: Admin informa nome e escolhe uma cor, o sistema salva no Supabase e a etiqueta aparece imediatamente na lista e fica disponível para todos os usuários do workspace.

## Cenários

### Happy Path
1. Admin clica em "Nova etiqueta"
2. Dialog abre com campo de nome vazio e nenhuma cor selecionada
3. Admin preenche nome e seleciona uma cor
4. Admin clica em "Salvar" (botão habilitado apenas com nome + cor preenchidos)
5. `criarEtiqueta()` é chamada — botão fica desabilitado durante a requisição
6. Supabase insere o registro na tabela `labels`
7. Dialog fecha, nova etiqueta aparece na tabela com 0 conversas

### Edge Cases
- Nome com espaços em branco apenas: `trim()` → bloco no frontend (botão desabilitado)
- Dialog fechado antes de salvar: estado do formulário é resetado (nome e cor limpos)

### Cenário de Erro
- Falha no Supabase: exibe mensagem de erro dentro do dialog ("Não foi possível criar a etiqueta. Tente novamente.")
- Usuário não-admin tentando chamar a action diretamente: retorna `{ erro: "Sem permissão" }`

## Banco de Dados

- Tabela: `labels` (criada na issue 39)
  - `workspace_id` preenchido automaticamente a partir do perfil do usuário logado

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/actions.ts` — adicionar `criarEtiqueta(nome, cor)` que insere na tabela `labels` e retorna `{ etiqueta?: EtiquetaListada; erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — conectar `handleCriar` à server action `criarEtiqueta`, adicionando estado de loading e exibição de erro

## Checklist

- [x] Adicionar `criarEtiqueta(nome, cor)` em `actions.ts` com verificação de admin e inserção no Supabase
- [x] Modificar `handleCriar` em `etiquetas-client.tsx` para chamar `criarEtiqueta` (async, com `isPending`)
- [x] Adicionar estado `erroCriar` no dialog de criar para exibir erros retornados pela action
- [x] Desabilitar o botão "Salvar" durante a requisição (`isPending`)
- [x] Em caso de sucesso, adicionar a etiqueta retornada ao estado local e fechar o dialog
