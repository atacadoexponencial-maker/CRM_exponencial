# B36-10: Agenda e alertas no estilo Caderno

**Tipo:** Implementação
**Página:** /agenda, /agenda/equipe e /alertas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar a agenda, a agenda da equipe e os alertas na linguagem Caderno, sem perder nenhuma informação ou ação.

## Pronto quando

As telas da rotina seguem a linguagem Caderno nos dois temas e nada sumiu.

## Critérios de aceite

- **CA-B36-32** (manual) — Rotina aprovada visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre a agenda, a agenda da equipe e os alertas, nos dois temas, então ela aprova o visual e confere que nada sumiu.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- Agenda, agenda da equipe e central de alertas ganham o título e as margens do Caderno, caixas na superfície, listas com linhas finas, estados vazios no tom do tema e números em fonte de número.

### Edge Cases
- Marcar como feito, adiar, reatribuir, criar follow-up, dispensar alerta e mudar os limiares continuam iguais.

### Cenário de Erro
- Mensagens de erro no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-32 | manual | roteiro abaixo | a agenda, a agenda da equipe e os alertas seguem o Caderno nos dois temas e nada sumiu |

### Roteiro manual — CA-B36-32
1. Abra o preview e entre com a empresa de teste.
2. Na Agenda, marque uma tarefa como feita, adie outra e crie um follow-up.
3. Abra a Agenda da equipe e troque o atendente.
4. Em Alertas, filtre por tipo, abra os limiares e dispense um alerta.
5. Repita no tema escuro.
6. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.

## Arquivos

- **Modificar:** `src/app/(auth)/agenda/agenda-client.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/agenda/equipe/agenda-equipe-client.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/agenda/equipe/page.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/agenda/loading.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/agenda/page.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/alertas/loading.tsx` — título, margens, caixas, listas e números no estilo Caderno
- **Modificar:** `src/app/(auth)/alertas/page.tsx` — título, margens, caixas, listas e números no estilo Caderno

## Checklist

- [x] Título e margens do Caderno
- [x] Caixas na superfície e estados vazios no tom do tema
- [x] Números em fonte de número
- [x] Avisos de erro no tom do tema

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-32 | Marcelle | 22/10/2026 |
