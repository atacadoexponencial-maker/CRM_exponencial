# B36-12: Automações no estilo Caderno

**Tipo:** Implementação
**Página:** /configuracoes/automacoes
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar a lista, o editor em fluxo e o histórico de automações na linguagem Caderno, sem perder nenhuma informação ou ação.

## Pronto quando

As telas de automações seguem a linguagem Caderno nos dois temas e nada sumiu.

## Critérios de aceite

- **CA-B36-34** (manual) — Automações aprovadas visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre a lista, o editor em fluxo e o histórico, nos dois temas, então ela aprova o visual e confere que nada sumiu.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- Lista e histórico de automações ganham o título e as margens do Caderno, a tabela em livro-caixa e as caixas na superfície.
- O editor em fluxo deixa de ser sempre escuro: o quadro, os blocos e os controles seguem o tema da tela, e mudam na hora quando a pessoa troca o tema (gancho `useTemaDaTela`).

### Edge Cases
- Os cabeçalhos dos blocos continuam com as cores de gatilho (aviso), condição (informação) e ação (sucesso), agora nas versões do tema.
- Criar, editar, testar com um contato, salvar, pausar, duplicar e excluir automação continuam iguais.

### Cenário de Erro
- Mensagens de erro no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-34 | manual | roteiro abaixo | a lista, o editor em fluxo e o histórico seguem o Caderno nos dois temas e nada sumiu |

### Roteiro manual — CA-B36-34
1. Abra o preview e entre com a empresa de teste.
2. Em Automações, abra a "[B36] Tag para interessados": o quadro está claro no tema claro.
3. Adicione um bloco, teste com um contato e saia sem salvar.
4. Troque o tema no menu do usuário com o editor aberto: o quadro muda junto.
5. Abra o histórico e use um filtro.
6. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/dialogo-horario-comercial.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — o quadro do React Flow segue o tema (era sempre escuro)
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/historico-client.tsx` — título, margens, tabelas e caixas no estilo Caderno
- **Criar:** `src/lib/use-tema-da-tela.ts` — gancho que diz o tema da tela agora e acompanha a troca

## Checklist

- [x] Editor em fluxo seguindo o tema
- [x] Título, margens, tabelas e caixas do Caderno na lista e no histórico
