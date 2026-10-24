# B42-01: Perfil RFV e Atendente (carteira) no filtro de Contatos

**Tipo:** Implementação
**Página:** Contatos → filtro avançado
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-segmentacao-de-campanhas.md`

## Descrição

O filtro avançado ganha o campo Perfil RFV (assunto Compras), com o perfil calculado sobre a empresa inteira como na aba RFV sem filtro de atendente, e o campo Atendente passa a se chamar Atendente (carteira).

## Pronto quando

Na lista de Contatos dá para filtrar "Perfil RFV é Campeão", "é qualquer um de", "está vazio" e "não está vazio", com os mesmos clientes da aba RFV, e o campo aparece como "Atendente (carteira)". Como a campanha vai usar este mesmo filtro, os dois campos chegam lá sozinhos na B42-02.

## Critérios de aceite

- **CA-B42-21** (automática) — O filtro por perfil RFV traz os mesmos clientes da aba RFV. Dado uma empresa com vendas que dão clientes em vários perfis, quando o filtro é "Perfil RFV é Campeão" e depois "Perfil RFV é qualquer um de Em Risco, Não Perder", então os contatos encontrados são exatamente os que a aba RFV dos Relatórios, sem filtro de atendente, lista nesses perfis hoje
- **CA-B42-22** (automática) — O perfil não muda com quem filtra. Dado um cliente que é Campeão na base da empresa inteira e que teria outro perfil se o cálculo usasse só os clientes do atendente dele, quando o Admin e o Atendente dono desse cliente filtram por "Perfil RFV é Campeão" na lista de Contatos, então o cliente aparece para os dois como Campeão
- **CA-B42-23** (automática) — Quem nunca comprou não tem perfil. Dado um contato sem nenhuma compra e um com compras, quando o filtro é "Perfil RFV está vazio" e depois "Perfil RFV não está vazio", então o primeiro filtro traz só o que nunca comprou; o segundo, só o que comprou
- **CA-B42-24** (automática) — "Não é" não traz quem não tem perfil. Dado um Campeão, um Perdido e um contato que nunca comprou, quando o filtro é "Perfil RFV não é Campeão", então aparece só o Perdido, como as outras comparações negativas do filtro
- **CA-B42-25** (automática) — O campo Atendente passa a se chamar Atendente (carteira). Dado o painel do filtro aberto na lista de Contatos e na campanha, quando a pessoa abre a lista de campos, então aparece "Atendente (carteira)" no lugar de "Atendente", e um filtro salvo que já usava Atendente continua trazendo os mesmos contatos
- **CA-B42-26** (automática) — Atendente segue vendo só os próprios contatos. Dado um Atendente logado na lista de Contatos, quando filtra por "Perfil RFV é Campeão", então aparecem só os Campeões que ele já enxerga hoje

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-03 | Em campanha, o filtro funciona com a visão do Admin e do Gerente (todos os contatos da empresa); não há caso de Atendente montando campanha. | confirmada | Lido no código em 23/10/2026: toda action de campanha passa por `perfilGestor` (só Admin e Gerente) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-03 | Que campos novos entram no filtro além dos que ele já tem? | respondida | Perfil RFV e carteira (Marcelle, 23/10/2026) |
| PER-B42-04 | Carteira é diferente do atendente do contato? | respondida | Não: o campo Atendente passa a se chamar "Atendente (carteira)", nas duas telas (Marcelle, 23/10/2026) |
| PER-B42-05 | O perfil RFV do filtro é calculado sobre qual base? | respondida | Empresa inteira, o mesmo da aba RFV sem filtro de atendente (Marcelle, 23/10/2026) |
