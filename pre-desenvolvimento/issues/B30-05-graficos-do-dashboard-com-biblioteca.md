# B30-05: Gráficos do dashboard com a biblioteca dos relatórios

**Tipo:** Implementação
**Página:** Dashboard
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

O donut de distribuição da base e o funil de etapas do dashboard, hoje desenhos próprios
sem interação, passam a ser desenhados pela biblioteca de gráficos escolhida para os
relatórios, com nome e valor ao passar o mouse e legenda. Os números não mudam: os dados
entregues ao gráfico são os mesmos de antes. É a prova de que a biblioteca funciona no
tema escuro do CRM antes de as telas de relatório a usarem.

Não depende das outras issues da série.

## Pronto quando

No dashboard com dados, passar o mouse numa fatia do donut ou numa barra do funil mostra o
nome e o valor; os totais são os mesmos de antes da mudança; tudo legível no tema escuro,
sem texto branco em fundo branco.

## Critérios de aceite

- **CA-B30-19** (manual) — Gráficos do dashboard com interação e sem mudar os números. Dado o dashboard com dados, quando a Marcelle passa o mouse nas fatias do donut e nas barras do funil, então aparece o nome e o valor de cada parte; os totais são os mesmos de antes; o gráfico é legível no tema escuro, sem texto branco em fundo branco.
- **CA-B30-20** (automática) — Dados do gráfico continuam iguais. Dado o mesmo conjunto de cards e compras, quando o dashboard calcula a distribuição da base e o funil de etapas, então os valores entregues ao gráfico são os mesmos que a versão anterior entregava.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.

## Cenários

### Happy Path
1. Biblioteca escolhida: **Recharts 3** (`recharts@3.10.1`, React 19 nos peers, SVG, sem CSS próprio; tooltip e legenda com conteúdo customizável, o que resolve o tema escuro). É a biblioteca que as telas de relatório vão usar.
2. `GraficoDonut` e `GraficoFunil` em `src/app/(auth)/dashboard/components/graficos.tsx` mantêm **as mesmas props** de hoje (`dados` e `etapas`), então `secoes-metricas.tsx` não muda e os dados entregues ao gráfico são os de sempre (`metricas.recompra.distribuicao` e `metricas.conversao.funil`).
3. Donut: `PieChart` + `Pie` com `innerRadius`, uma `Cell` por fatia com a cor de hoje; a legenda ao lado continua listando nome, valor e percentual (secundário à cor). Ao passar o mouse na fatia, tooltip próprio com nome e valor, em `bg-popover text-popover-foreground border`.
4. Funil: `BarChart` com `layout="vertical"`, eixo de categoria com o nome da etapa, barra com a quantidade escrita dentro (`LabelList`) e a coluna do percentual sobre a etapa anterior mantida fora do gráfico, como hoje. Ao passar o mouse, tooltip com nome, quantidade e percentual.
5. `GraficoBarras` (leads por semana) e `CardMetrica` ficam como estão: fora do escopo desta issue.

### Edge Cases
- Donut sem dados (total 0): mostra o anel vazio em `var(--muted)` com a legenda zerada, como hoje.
- Funil com todas as etapas em 0: barras no mínimo visível, rótulos "0".
- Tema sempre escuro (sem `dark:`): cores de texto e fundo do tooltip e da legenda vêm dos tokens (`popover`, `muted-foreground`), nunca do padrão branco da biblioteca.

### Cenário de Erro
- Não há entrada do usuário. Se a biblioteca não renderizar (sem largura no servidor), o gráfico tem largura e altura fixas na primeira pintura e `responsive` para ajustar depois.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B30-19 | manual | roteiro abaixo | Nome e valor ao passar o mouse, totais iguais, legível no tema escuro |
| CA-B30-20 | automática | `src/test/graficos-dashboard.test.tsx` | Para um conjunto fixo de cards, `calcularMetricas` entrega a distribuição e o funil com os mesmos valores da versão anterior, e os componentes novos exibem exatamente esses valores |

### Roteiro manual — CA-B30-19
1. Entrar na empresa "[TESTE] Automações B11" (ou qualquer uma com cards nos dois funis) e abrir o Dashboard.
2. Anotar os números da legenda do donut (Ativos, Em Risco, Inativos, Perdidos) e das barras do funil; comparar com os cards de métricas ao lado. Devem bater com o que a versão anterior mostrava.
3. Passar o mouse em cada fatia do donut: aparece um balão com o nome e o valor da fatia.
4. Passar o mouse em cada barra do funil: aparece o balão com a etapa, a quantidade e o percentual sobre a etapa anterior.
5. Conferir que balão, legenda e rótulos estão legíveis no tema escuro, sem texto branco em fundo branco.

## Arquivos

- **Modificar:** `package.json` — dependência `recharts`.
- **Modificar:** `package-lock.json` — travamento da dependência `recharts`.
- **Modificar:** `src/app/(auth)/dashboard/components/graficos.tsx` — `GraficoDonut` e `GraficoFunil` desenhados com Recharts, mesmas props.
- **Criar:** `src/test/graficos-dashboard.test.tsx` — teste da tabela Prova (CA-B30-20).

## Dependências Externas

- `recharts` 3.10.1 — biblioteca de gráficos (SVG, React 19).

## Checklist

- [x] `recharts` instalado
- [x] Donut com Recharts, tooltip no tema escuro, legenda com os mesmos números
- [x] Funil com Recharts, tooltip e rótulos, percentual mantido
- [x] Teste CA-B30-20 escrito e passando; testes antigos do dashboard passando
- [x] `npm run build` e `npx eslint src --quiet` limpos
