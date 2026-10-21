# B32-05: Tabela de vendas do período com busca e exportação

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Visão Geral
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

Entra a tabela com cada venda do período (contato com link para o perfil, telefone, data, origem com o número do pedido, atendente, cidade, UF, peças, forma de pagamento e valor), as 50 mais recentes com "Ver todas (N)", busca pelo nome do contato e botão Exportar que baixa a planilha de todas as vendas do período no padrão da B30-04, respeitando o filtro de atendente. Depende da B32-02 (UF) e da B32-03 (tela e filtros).

## Pronto quando

Na empresa de teste, a tabela lista as vendas semeadas do mês, da mais recente para a mais antiga; digitar parte de um nome filtra; Exportar baixa a planilha com as mesmas linhas e colunas, com data e valor como data e número.

## Critérios de aceite

- **CA-B32-15** (automática) — A tabela lista as vendas do período. Dado 3 vendas no mês e 1 no mês passado, quando o usuário abre a Visão Geral do mês atual, então a tabela tem 3 linhas, da mais recente para a mais antiga, cada uma com contato, telefone, data, origem, atendente, cidade, UF, peças, forma de pagamento e valor.
- **CA-B32-16** (automática) — Busca por contato. Dado vendas dos contatos "Loja da Ana" e "Bazar do Bruno", quando o usuário digita "ana", então só a linha da "Loja da Ana" permanece.
- **CA-B32-17** (automática) — Exportar baixa as vendas do período. Dado 3 vendas no período, quando o usuário clica em Exportar, então baixa uma planilha com 3 linhas e as mesmas colunas da tabela, com data e valor reconhecidos como data e número.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B32-02 | A tabela de vendas mostra a cidade do contato. Vale a pena também a coluna "Telefone", como no Tailor? | respondida | Sim, com a coluna de telefone, na tela e na planilha. Marcelle, 21/10/2026 |
