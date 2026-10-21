# B33-03: Evolução dos perfis, base saudável e aprovação da aba

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba RFV
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-rfv.md`

## Descrição

Fecha a aba RFV: a tabela de evolução dos perfis, semanal (14 semanas, domingo como fim) ou mensal (13 meses), com a quantidade por perfil em cada coluna e a diferença contra a anterior, calculada do histórico de compras com a data de referência no fim de cada semana ou mês; e o bloco "Base saudável" com a coluna atual, a anterior, o crescimento e a variação. Com os quatro blocos no ar, a Marcelle aprova a aba em produção. Depende da B33-01.

## Pronto quando

Na empresa de teste, a evolução semanal mostra 14 colunas (S43 a S30) com os perfis mudando ao longo das semanas e a mensal 13 colunas; a base saudável compara as duas últimas colunas. A aba inteira aparece ao clicar em RFV e a Marcelle aprova no computador e no celular.

## Critérios de aceite

- **CA-B33-01** (automática) — A aba RFV abre o relatório. Dado a tela Relatórios aberta na Visão Geral, quando o usuário clica na aba "RFV", então a aba fica selecionada, o cabeçalho diz a data de hoje e o tamanho da base, e aparecem a matriz, os indicadores, a lista de clientes e a evolução.
- **CA-B33-13** (automática) — Colunas semanais com a diferença. Dado hoje 21/10/2026 (semana 43) e um cliente que era Campeão até 11/10 e passou a Clientes Fiéis depois, quando a evolução semanal é calculada, então há 14 colunas, da S43 à S30; Campeão mostra 1 na S41 e 0 na S42 e S43, com "−1 (−100%)" na S42; Clientes Fiéis mostra 0 na S41 e 1 na S42, com "+1".
- **CA-B33-14** (automática) — Colunas mensais. Dado hoje 21/10/2026, quando o usuário escolhe "Mensal", então há 13 colunas, de Out/2026 a Out/2025, cada uma com o perfil calculado no último dia do mês (Out/2026 em 21/10).
- **CA-B33-15** (automática) — Base saudável. Dado 64 clientes saudáveis na coluna atual e 71 na anterior, quando o bloco é desenhado, então mostra "64 clientes", "71 clientes", crescimento "−7" e variação "−10%", em vermelho.
- **CA-B33-16** (manual) — A aba RFV aprovada pela Marcelle em produção. Dado a empresa "[TESTE] Automações B11" com as vendas de 25 meses, quando a Marcelle abre a aba RFV em produção, no computador e no celular, então a matriz tem as cores e os nomes dos perfis, os blocos aparecem na ordem da spec, legíveis no tema escuro, e clicar numa célula filtra a lista.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B33-04 | A evolução mostra as últimas 14 semanas (semana termina no domingo) e os últimos 13 meses; não o ano inteiro como o Tailor, para a tela abrir rápido. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
