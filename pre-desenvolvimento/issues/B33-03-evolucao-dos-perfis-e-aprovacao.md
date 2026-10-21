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

## Cenários

### Happy Path
1. `calcularRfv` passa a devolver também `evolucao.semanal` (14 colunas) e `evolucao.mensal` (13 colunas), cada coluna com a data de referência, o rótulo ("S43" / "Out/26"), a data curta, a contagem por perfil e a base saudável, calculadas do histórico com `calcularClientesRfv` naquela data (sem ativos e lembretes, que não influem no perfil).
2. O bloco "Evolução dos perfis" fecha a aba: alternar Semanal/Mensal, uma linha por perfil, a mais recente primeiro, cada célula com a quantidade e a diferença contra a coluna anterior (mais antiga), verde ou vermelho; passar o mouse mostra "Perfis em dd/mm/aaaa".
3. "Base saudável": última coluna, anterior, crescimento e variação.
4. Clicar na aba RFV mostra tudo: cabeçalho, matriz, indicadores, lista e evolução (CA-B33-01).

### Edge Cases
- Coluna atual = hoje; semanais anteriores = domingos que fecham as semanas anteriores (semana ISO, segunda a domingo); mensais anteriores = último dia de cada mês.
- Diferença contra base zero: "+1 (—)"; zero contra zero: "0 (0%)".
- Base vazia: todas as colunas zeradas e a base saudável "0", "0", "0", "—".

### Cenário de Erro
- Nenhum novo.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B33-01 | automática | `src/test/relatorios-rfv-evolucao.test.tsx` | Clicar em "RFV" na tela Relatórios mostra o cabeçalho com a data e a base, a matriz, os indicadores, a lista e a evolução |
| CA-B33-13 | automática | `src/test/relatorios-rfv-evolucao.test.tsx` | 14 colunas S43 a S30; Campeão 1 na S41 e 0 na S42/S43 com "−1 (−100%)" na S42; Fiéis 0 na S41 e 1 na S42 com "+1" |
| CA-B33-14 | automática | `src/test/relatorios-rfv-evolucao.test.tsx` | 13 colunas de Out/26 a Out/25, com as referências no último dia de cada mês e hoje na atual |
| CA-B33-15 | automática | `src/test/relatorios-rfv-evolucao.test.tsx` | 64 e 71 saudáveis: "64 clientes", "71 clientes", "−7" e "−10%" em vermelho |
| CA-B33-16 | manual | roteiro abaixo | Aba RFV aprovada em produção |

### Roteiro manual — CA-B33-16
1. Entrar na "[TESTE] Automações B11" e abrir Relatórios → RFV, no computador e no celular.
2. Conferir: cabeçalho com a data de hoje e a base; matriz colorida com os onze perfis e "% ativos"; indicadores por perfil; lista com busca, perfil, paginação e Excel; evolução semanal e mensal com a base saudável.
3. Clicar numa célula da matriz: a lista filtra e o chip aparece; clicar de novo limpa.
4. Tudo legível no tema escuro.

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/lib/relatorios/rfv.ts` — `evolucaoDosPerfis` (semanal e mensal), número da semana ISO, `ResultadoRfv.evolucao`.
- **Criar:** `src/app/(auth)/relatorios/components/evolucao-perfis.tsx` — tabela de evolução e base saudável.
- **Modificar:** `src/app/(auth)/relatorios/components/rfv-client.tsx` — desenha a evolução no fim da aba.
- **Criar:** `src/test/relatorios-rfv-evolucao.test.tsx` — testes da tabela Prova.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Lib: evolução semanal e mensal calculada do histórico
- [x] Bloco de evolução com Semanal/Mensal e base saudável na aba
- [x] Testes automáticos passando; roteiro manual do CA-B33-16 registrado
