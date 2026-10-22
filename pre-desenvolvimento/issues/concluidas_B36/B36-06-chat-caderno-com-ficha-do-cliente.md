# B36-06: Chat no estilo Caderno com ficha do cliente

**Tipo:** Implementação
**Página:** /chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar o Chat como no quadro, em três colunas, com a ficha do cliente (total comprado, pedidos, ticket, última compra, etapa e etiquetas) ao lado da conversa.

## Pronto quando

O Chat segue o quadro, com a ficha do cliente ao lado da conversa, e tudo o que se fazia antes continua funcionando.

## Critérios de aceite

- **CA-B36-26** (automática) — Ficha do cliente ao lado da conversa. Dado um contato com 3 compras de R$ 1.000, R$ 2.000 e R$ 3.000, a última há 10 dias, quando a conversa dele é aberta, então a ficha mostra total comprado R$ 6.000, 3 pedidos, ticket médio R$ 2.000, última compra há 10 dias, a etapa atual e as etiquetas dele.
- **CA-B36-27** (manual) — Chat aprovado visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre o Chat, filtra, abre conversas e manda mensagem, nos dois temas, no computador e no celular, então ela aprova que segue o quadro e que tudo o que fazia antes continua funcionando.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-06 | A ficha do cliente no Chat usa as compras registradas do contato (a mesma fonte do perfil do contato e dos Relatórios) | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Chat abre em três colunas: a lista de conversas (título "Chat", busca, filtros e as conversas na superfície), a conversa aberta e, nas telas largas, a ficha do cliente à direita.
2. A ficha mostra, no topo, o resumo das compras do cliente em faixa de números: total comprado, pedidos, ticket médio e última compra ("há 10 dias"); embaixo, o primeiro contato, o cadastro, a etapa em cada funil, as etiquetas e o link "Abrir perfil completo".
3. Os balões seguem o Caderno: o enviado no tom do item ativo, o recebido na superfície, os dois com linha fina; o horário em fonte de número.

### Edge Cases
- Tela menor que 1280 px: a ficha não ocupa espaço; abre pelo botão da conversa, por cima, como antes.
- Fechar a ficha na tela larga: ela some até ser aberta de novo pelo botão.
- Cliente sem compra: total R$ 0,00, 0 pedidos, ticket e última compra "—".
- O resumo vem pelo servidor: o Atendente da conversa vê as compras do cliente mesmo sem ler as compras pela RLS.

### Cenário de Erro
- Falha ao carregar a ficha: "Erro ao carregar", como antes.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-26 | automática | `src/test/chat-caderno.test.tsx` | a ficha mostra R$ 6.000,00, 3 pedidos, R$ 2.000,00, "há 10 dias", a etapa e as etiquetas |
| CA-B36-26 | automática | `src/test/chat-caderno.integration.test.ts` | o servidor devolve o resumo das 3 compras para o Atendente da conversa |
| CA-B36-27 | manual | roteiro abaixo | o Chat segue o quadro e tudo o que se fazia antes continua funcionando |

### Roteiro manual — CA-B36-27
1. Abra o preview e entre com a empresa de teste.
2. No Chat, confira a lista, os filtros e as conversas.
3. Abra uma conversa: confira os balões e a ficha do cliente à direita com o resumo das compras.
4. Mande uma mensagem rápida (digite /) e uma mensagem com anexo (a empresa de teste não tem número conectado: a mensagem fica com erro de envio, o que é esperado).
5. Feche a ficha e abra de novo pelo botão da conversa.
6. Repita no tema escuro e no celular (uma coluna por vez).
7. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver parado de funcionar.

## Arquivos

- **Criar:** `src/lib/resumo-de-compras.ts` — total, pedidos, ticket médio e dias desde a última compra
- **Modificar:** `src/app/(auth)/chat/actions.ts` — a ficha recebe o resumo das compras
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — "Ficha do cliente" com o resumo das compras em faixa de números
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — ficha à direita, aberta por padrão em tela larga; lista com título "Chat" na superfície
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — balões do Caderno
- **Criar:** `src/test/chat-caderno.test.tsx` — ficha com o resumo das compras, etapa e etiquetas
- **Criar:** `src/test/chat-caderno.integration.test.ts` — resumo das compras vindo do servidor

## Checklist

- [x] Resumo das compras no servidor
- [x] Ficha do cliente à direita, com o resumo
- [x] Lista e balões no estilo Caderno
- [x] Testes da tabela Prova

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-27 | Marcelle | 22/10/2026 |
