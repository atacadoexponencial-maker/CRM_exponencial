# 45: Criar Nova Mensagem Rápida

**Tipo:** Implementação
**Página:** Mensagens Rápidas

## Descrição

Implementar a criação de mensagem rápida: Admin informa título (atalho) e conteúdo, o sistema salva no Supabase e a mensagem fica imediatamente disponível para todos os usuários do workspace usarem no chat.

## Cenários

### Happy Path
1. Admin clica em "Nova mensagem" no topo da página
2. Dialog abre com campos Título (atalho) e Conteúdo
3. Admin preenche ambos e clica em "Salvar"
4. `criarMensagemRapida()` é chamada → INSERT em `quick_replies`
5. Nova mensagem aparece no fim da tabela sem recarregar a página

### Edge Cases
- Campos vazios: botão "Salvar" permanece desabilitado enquanto qualquer campo estiver vazio
- Clique duplo: botão desabilitado durante `isPendingCriar`

### Cenário de Erro
- Falha no Supabase: `criarMensagemRapida()` retorna `{ erro }` — mensagem de erro exibida dentro do dialog; lista não é alterada

## Banco de Dados

- Tabela: `quick_replies`
  - INSERT: `{ workspace_id, title, content }` — retorna o registro criado com `id`

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/actions.ts` — adicionar `criarMensagemRapida(titulo, conteudo)` retornando `{ mensagem?: MensagemRapidaListada; erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — importar `criarMensagemRapida`; adicionar `isPendingCriar` e `erroCriar`; tornar `handleCriar` assíncrono; exibir erro no dialog; resetar erro no `onOpenChange`

## Checklist

- [x] Adicionar `criarMensagemRapida(titulo, conteudo)` em `actions.ts` com INSERT em `quick_replies`
- [x] Atualizar `mensagens-rapidas-client.tsx`: `handleCriar` async com `isPendingCriar`, `erroCriar`, erro inline no dialog e reset no `onOpenChange`
