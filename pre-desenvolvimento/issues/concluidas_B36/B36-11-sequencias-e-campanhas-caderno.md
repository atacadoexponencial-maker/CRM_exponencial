# B36-11: Sequências e campanhas no estilo Caderno

**Tipo:** Implementação
**Página:** /sequencias e /campanhas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar a biblioteca e o editor de sequências e a lista, o editor e o relatório de campanhas na linguagem Caderno, sem perder nenhuma informação ou ação.

## Pronto quando

As telas de sequências e campanhas seguem a linguagem Caderno nos dois temas e nada sumiu.

## Critérios de aceite

- **CA-B36-33** (manual) — Sequências e campanhas aprovadas visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre a biblioteca e o editor de sequência, a lista, o editor e o relatório de campanha, nos dois temas, então ela aprova o visual e confere que nada sumiu.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- Biblioteca e editor de sequências, lista, editor em 3 etapas e relatório de campanhas ganham o título e as margens do Caderno, tabelas em livro-caixa e caixas na superfície.
- No relatório da campanha, os números da entrega (enviados, entregues, lidos, falhos e as taxas) viram uma faixa de números do Caderno.
- A faixa de números passa a ser um componente compartilhado (`src/components/shared/faixa-de-numeros.tsx`), usado pelo Dashboard e pelo relatório da campanha; o cartão de número antigo, que ficou sem uso, sai.

### Edge Cases
- Criar, editar, ativar, duplicar e excluir sequência; criar, agendar, interromper e excluir campanha; reenviar para os que falharam: tudo continua igual.

### Cenário de Erro
- Mensagens de erro no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-33 | manual | roteiro abaixo | sequências e campanhas seguem o Caderno nos dois temas e nada sumiu |

### Roteiro manual — CA-B36-33
1. Abra o preview e entre com a empresa de teste.
2. Em Sequências, abra a "[B36] Pós-compra", confira as etapas e volte; ative e desative.
3. Em Campanhas, abra a "[B36] Coleção de verão" e passe pelas 3 etapas do editor sem enviar.
4. Abra o relatório de uma campanha (se houver) e confira a faixa de números.
5. Repita no tema escuro.
6. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/campanhas/[id]/page.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/page.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` — números da entrega em faixa de números
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/campanhas/page.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/dashboard/components/dashboard-client.tsx` — importa a faixa de números compartilhada
- **Modificar:** `src/app/(auth)/dashboard/components/graficos.tsx` — sai o cartão de número, que ficou sem uso
- **Modificar:** `src/app/(auth)/dashboard/components/secoes-metricas.tsx` — importa a faixa de números compartilhada
- **Modificar:** `src/app/(auth)/sequencias/[id]/editor-client.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/sequencias/[id]/page.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/sequencias/page.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/sequencias/sequencias-client.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Criar:** `src/components/shared/faixa-de-numeros.tsx` — faixa de números, agora compartilhada (veio do Dashboard)
- **Remover:** `src/app/(auth)/dashboard/components/faixa-de-numeros.tsx` — foi para `src/components/shared/faixa-de-numeros.tsx`
- **Modificar:** `src/components/shared/iniciar-sequencia-dialog.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/test/dashboard-caderno.test.tsx` — importa a faixa de números do lugar novo

## Checklist

- [x] Faixa de números compartilhada
- [x] Relatório da campanha com a faixa
- [x] Título, margens, tabelas e caixas do Caderno nas telas de sequências e campanhas

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-33 | Marcelle | 22/10/2026 |
