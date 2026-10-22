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
