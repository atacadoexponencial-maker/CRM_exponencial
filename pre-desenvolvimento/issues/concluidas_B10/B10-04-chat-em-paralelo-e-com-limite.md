# B10-04: Chat abre com consultas em paralelo e lista limitada

**Tipo:** Implementação
**Página:** Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Reescrever a carga do Chat: identidade resolvida uma vez, listas auxiliares
(atendentes, atendentes para transferência, etiquetas, mensagens rápidas) e
conversas carregadas ao mesmo tempo, lista de conversas limitada às 50 mais
recentes com "carregar mais" ao rolar até o fim, e a conversa indicada na URL
sempre aberta mesmo fora das 50.

Cobre todos os comportamentos de "Chat" na spec.

## Pronto quando

No CRM publicado, com mais de 50 conversas de teste, o Chat abre mostrando as
50 mais recentes, rolar até o fim traz as seguintes, e abrir uma URL com uma
conversa antiga abre essa conversa. O tempo de resposta do servidor cai em
relação a antes, e transferir, etiquetar e usar mensagem rápida seguem
funcionando.

## Cenários

### Happy Path
1. Gerente clica em Chat. Esqueleto (B10-01) aparece; no servidor,
   `sessaoAtual()` resolve usuário e perfil uma vez, e `Promise.all` dispara ao
   mesmo tempo: atendentes do workspace, atendentes para transferência (no caso
   de atendente: times → membros, uma subcadeia dentro do `all`), etiquetas,
   mensagens rápidas e as 50 conversas mais recentes.
2. A lista mostra 50. Ao rolar até o fim, um sentinela dispara
   `carregarMaisConversas(cursor)`; o servidor devolve as 50 seguintes,
   anteriores ao `last_message_at` da última carregada, e a lista as anexa.
3. Quando uma página vem com menos de 50, a lista para de pedir.

### Edge Cases
- URL com `?conversa=<id>` fora das 50: a página busca essa conversa à parte
  (mesma regra de visibilidade) e a inclui na lista inicial, para o clique
  automático funcionar.
- Conversa que chega ao vivo (realtime INSERT/UPDATE) continua entrando no
  topo; se já estava carregada, é movida, não duplicada. Ao anexar uma página,
  ids já presentes são ignorados.
- Filtros e busca da caixa continuam atuando sobre as conversas carregadas.
  Com filtro ativo e a lista curta, rolar até o fim ainda carrega mais.
- Atendente: a regra `assigned_to = user` se mantém na paginação.

### Cenário de Erro
- Falha ao carregar mais: a lista mantém o que tem e o sentinela permite
  tentar de novo ao rolar; sem toast novo.

## Banco de Dados
Não se aplica (sem migração). A ordenação por `last_message_at` já existe.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/conversas.ts` — `listarConversas` ganha
  `limite` e `antesDe` (cursor em `last_message_at`); cada conversa passa a
  carregar `atividadeEm` (ISO) para servir de cursor.
- **Modificar:** `src/app/(auth)/chat/mock-conversas.ts` — tipo `Conversa`
  ganha `atividadeEm: string`.
- **Modificar:** `src/app/(auth)/chat/page.tsx` — `sessaoAtual()`,
  `Promise.all`, limite 50, conversa da URL fora da página inicial, prop
  `temMaisConversas`.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — nova action
  `carregarMaisConversas(antesDe)`; `buscarConversa` usa `sessaoAtual()`.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — estado
  `temMais`/`carregandoMais`, handler que anexa sem duplicar, repassa à lista.
- **Modificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` —
  sentinela com `IntersectionObserver` no fim da lista e linha
  "Carregando mais…".

Reutilizar: `sessaoAtual` (B10-03), `listarConversas`, `Loader2`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] `listarConversas` com limite e cursor; `atividadeEm` no tipo
- [x] Página do Chat com sessão única e consultas em paralelo
- [x] Action `carregarMaisConversas`
- [x] Lista anexa páginas ao rolar, sem duplicar, e para no fim
- [x] Conversa da URL fora das 50 abre normalmente
- [x] `npm run lint`, `npm run build` e testes do chat passando
- [x] Conferido no build local com >50 conversas de teste (criar e apagar)
