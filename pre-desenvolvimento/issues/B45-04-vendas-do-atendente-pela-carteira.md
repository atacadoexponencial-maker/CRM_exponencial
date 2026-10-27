# B45-04: Vendas do atendente pela carteira nos Relatórios e no Dashboard, e aprovação

**Tipo:** Implementação
**Página:** Relatórios (Visão Geral, Coorte, Funil de clientes); Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-dono-do-contato.md`

## Descrição

As vendas do atendente passam a ser as vendas dos clientes da carteira dele, qualquer que seja o vendedor registrado na venda. Vale para a Visão Geral, a Coorte, o Funil de clientes e o Dashboard, para o Atendente e para o Admin que filtra por atendente. Por ser a última entrega da série, leva também a aprovação manual das telas do atendente em produção.

## Pronto quando

Na empresa de teste, o Atendente Teste abre a Visão Geral e o Dashboard e vê as vendas dos clientes da carteira dele, e o Admin, filtrando pelo Atendente Teste, vê os mesmos números. A Marcelle aprova em produção as telas do atendente.

## Critérios de aceite

- **CA-B45-16** (automática) — Visão Geral do atendente soma as vendas dos clientes dele. Dado a Ana, do Atendente Teste, com uma venda de R$ 500 em outubro registrada com o Admin como vendedor, e a Carla, do Bruno, com uma venda de R$ 300 registrada com o Atendente Teste como vendedor, quando o Atendente Teste abre Relatórios → Visão Geral em outubro, então o faturamento é R$ 500 e a tabela de vendas mostra só a venda da Ana
- **CA-B45-17** (automática) — Admin filtrando por atendente vê o mesmo número. Dado as mesmas vendas do critério anterior, quando o Admin abre a Visão Geral, a Coorte e o Funil de clientes filtrados pelo Atendente Teste, então os números são os mesmos que o Atendente Teste vê nas próprias telas
- **CA-B45-18** (automática) — Dashboard do atendente usa a mesma regra. Dado as mesmas vendas, quando o Atendente Teste abre o Dashboard, então as vendas e o faturamento contam a venda da Ana e não a da Carla
- **CA-B45-19** (manual) — Telas do atendente coerentes em produção. Dado a empresa "[TESTE] Automações B11" em produção, depois da mudança, quando a Marcelle entra como o Atendente Teste e abre Contatos, um perfil, o Chat, Relatórios (Visão Geral, RFV, Coorte, Funil de clientes) e o Dashboard, então os 5 clientes da carteira dele aparecem em Contatos, junto com o Luan e os sem dono; o RFV mostra os mesmos 5; a Visão Geral mostra as vendas deles; e todo contato aberto tem card na Entrada

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-03 | O Dashboard segue a mesma regra de vendas da Visão Geral (CA-B45-18) | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-06 | As vendas do atendente nos Relatórios são as dos clientes dele ou as que ele registrou? | respondida | As dos clientes da carteira dele. Marcelle, 27/10/2026 |
