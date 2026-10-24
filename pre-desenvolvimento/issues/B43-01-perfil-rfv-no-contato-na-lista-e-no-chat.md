# B43-01: Perfil RFV no contato, na lista e no chat

**Tipo:** Implementação
**Página:** Contatos (lista e perfil) e Chat (painel do contato)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacao-por-perfil-rfv.md`

## Descrição

Mostrar o perfil RFV da hora (mesma regra de Relatórios, base da empresa inteira) na coluna nova "Perfil RFV" da lista de contatos, no perfil do contato e no painel do contato no chat; quem nunca comprou aparece como "Sem compras".

## Pronto quando

Abrindo Contatos, o perfil de um contato ou uma conversa no chat, a pessoa vê o perfil RFV de cada contato, igual ao de Relatórios, já atualizado depois de uma compra registrada.

## Critérios de aceite

- **CA-B43-01** (automática) — A lista de contatos mostra o perfil RFV de cada contato. Dado uma empresa com contatos que compraram e o perfil de cada um em Relatórios → RFV, quando a pessoa abre Contatos, então a coluna "Perfil RFV" mostra, para cada contato, o mesmo perfil de Relatórios, com o ícone e o nome dele.
- **CA-B43-02** (automática) — Contato sem compras aparece como "Sem compras". Dado um contato que nunca comprou, quando a pessoa olha a lista de contatos, o perfil do contato ou o painel do chat, então o perfil RFV aparece como "Sem compras".
- **CA-B43-03** (automática) — O perfil do contato mostra o perfil RFV. Dado um contato no perfil Clientes Fiéis, quando a pessoa abre o perfil desse contato, então aparece o selo "💎 Clientes Fiéis".
- **CA-B43-04** (automática) — O painel do contato no chat mostra o perfil RFV. Dado uma conversa com um contato no perfil Em Risco, quando a pessoa abre a conversa e o painel do contato, então aparece o selo "🔥 Em Risco".
- **CA-B43-05** (automática) — O perfil mostrado é o da hora. Dado um contato no perfil Em Risco, quando alguém registra uma compra para ele hoje e abre o perfil do contato, então o selo já mostra o perfil novo, o mesmo que Relatórios mostra naquele momento.
- **CA-B43-06** (automática) — O Atendente vê o mesmo perfil que o Admin. Dado um Atendente com contatos na carteira e uma empresa com clientes de vários atendentes, quando o Atendente abre a lista de contatos, então cada contato dele mostra o mesmo perfil que o Admin vê (calculado sobre a base da empresa inteira), e ele não vê contato que não é dele.
- **CA-B43-07** (manual) — Visual do perfil aprovado. Dado a empresa de teste com contatos em vários perfis, quando a Marcelle olha a lista de contatos, o perfil do contato e o painel do chat, no computador e no celular, nos temas claro e escuro, então o perfil fica legível, alinhado e sem cortes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-06 | A coluna "Perfil RFV" da lista de contatos aparece para todos os papéis. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B43-02 | O perfil mostrado no contato, na lista e no chat, e usado na condição, é o da hora ou o da conferência do dia? | respondida | Sempre o da hora, igual a Relatórios. Marcelle, 24/10/2026. |
