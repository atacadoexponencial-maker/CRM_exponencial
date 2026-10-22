# B36-07: Relatórios no estilo Caderno

**Tipo:** Implementação
**Página:** /relatorios
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar as cinco abas dos Relatórios na linguagem Caderno, sem perder nenhuma informação ou ação.

## Pronto quando

As cinco abas seguem a linguagem Caderno nos dois temas e nada sumiu.

## Critérios de aceite

- **CA-B36-29** (manual) — Relatórios aprovados visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre as cinco abas e a performance, nos dois temas, então ela aprova o visual e confere que nada sumiu.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- A tela Relatórios ganha o título do Caderno e as abas com sublinhado na ativa.
- Os dez números da Visão Geral viram uma faixa de números (linha grossa em cima, linhas finas entre as linhas), com os valores em fonte de número e a variação em verde (subiu) ou vermelho (caiu).
- As caixas de gráfico e de tabela ficam na superfície do tema, com a linha fina; as caixinhas internas (RFV, Coorte, Funil, Carteiras) viram células com linha fina em cima.
- As séries dos gráficos usam as cores do tema (peças, ticket, projeção, variação de 25 meses, barras da coorte).

### Edge Cases
- Cores que são dado (perfil RFV, etapas do funil de clientes, mapa de calor da coorte) continuam as mesmas nos dois temas.
- Nenhuma informação, filtro, exportação ou ação das cinco abas muda.

### Cenário de Erro
- Avisos de erro das ações de carteira no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-29 | manual | roteiro abaixo | as cinco abas e a performance seguem o Caderno nos dois temas e nada sumiu |

### Roteiro manual — CA-B36-29
1. Abra o preview e entre com a empresa de teste.
2. Em Relatórios, confira a Visão Geral: faixa de números, gráficos, tabela de vendas e variação por UF.
3. Abra RFV, Coorte, Funil de clientes e Carteiras; em cada uma, use um filtro e uma exportação.
4. Abra Dashboard → Performance por vendedor e expanda um vendedor.
5. Repita no tema escuro.
6. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.

## Arquivos

- **Modificar:** `src/app/(auth)/relatorios/components/acoes-carteira.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/acoes-sem-vendedor.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/cartoes-resumo.tsx` — os dez números da Visão Geral em faixa de números
- **Modificar:** `src/app/(auth)/relatorios/components/coorte-client.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/evolucao-perfis.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/funil-clientes-client.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/grafico-25-meses.tsx` — cor da variação pelo tema
- **Modificar:** `src/app/(auth)/relatorios/components/graficos-visao-geral.tsx` — cores das séries pelo tema
- **Modificar:** `src/app/(auth)/relatorios/components/lista-clientes-rfv.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — título e abas do Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/rfv-client.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/tabela-vendas.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/components/variacao-por-uf.tsx` — caixas, números e cores no estilo Caderno
- **Modificar:** `src/app/(auth)/relatorios/page.tsx` — margens do Caderno
- **Modificar:** `src/test/relatorios-rfv-evolucao.test.tsx` — confere a cor de queda pelo nome do tema (`text-queda`)
- **Modificar:** `src/test/tema-cores-fixas.test.ts` — saem as exceções das cores de gráfico que passaram a vir do tema

## Checklist

- [x] Título, abas e margens do Caderno
- [x] Faixa de números na Visão Geral
- [x] Caixas e células com linha fina nas cinco abas
- [x] Números em fonte de número
- [x] Cores dos gráficos pelo tema

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-29 | Marcelle | 22/10/2026 |
