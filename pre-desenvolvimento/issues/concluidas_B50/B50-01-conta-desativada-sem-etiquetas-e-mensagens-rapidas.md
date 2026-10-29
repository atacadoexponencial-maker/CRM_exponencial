# B50-01: Conta desativada sem etiquetas e mensagens rápidas

**Tipo:** Implementação
**Página:** Configurações › Etiquetas e Mensagens rápidas (banco)
**Spec:** `docs/specs-arquivadas/spec-seguranca-rodada-6.md`

## Descrição

As regras do banco de etiquetas e de mensagens rápidas passam a exigir conta ativa, para ler e para gerenciar, como as outras tabelas da empresa desde a B19.

## Pronto quando

Uma conta desativada, com a sessão ainda válida, não lê nem altera etiquetas e mensagens rápidas; a conta ativa segue igual.

## Critérios de aceite

- **CA-B50-05** (automática) — Conta desativada não lê etiquetas nem mensagens rápidas. Dado um atendente desativado com a sessão ainda válida, e etiquetas e mensagens rápidas da empresa conferidas antes com a chave de serviço, quando ele lê as etiquetas e as mensagens rápidas pelo banco, com a própria sessão, então não recebe nenhuma.
- **CA-B50-06** (automática) — Admin desativado não altera etiquetas nem mensagens rápidas. Dado um admin desativado com a sessão ainda válida, quando ele tenta criar, alterar e apagar uma etiqueta e uma mensagem rápida pelo banco, com a própria sessão, então nada é gravado, e o que existia continua igual.
- **CA-B50-07** (automática) — Conta ativa continua igual. Dado um atendente e um admin ativos, quando o atendente lê e o admin cria, altera e apaga etiquetas e mensagens rápidas, então tudo funciona como antes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B50-02 | As outras tabelas da empresa já exigem conta ativa (pela função da B19 ou por `status = 'active'`); só etiquetas e mensagens rápidas ficaram com a regra antiga | invalidada | Nem essas duas ficaram abertas: as regras delas leem o próprio perfil, e conta inativa não lê o próprio perfil desde a B20-02 (20261006000007). Conferido no banco de teste em 29/10/2026 (Claude): desativado lê 0 e não grava. A B50-01 só fixa isso em teste |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
Conta ativa lê etiquetas e mensagens rápidas; o admin ativo cria, altera e apaga.

### Edge Cases
- Conta desativada com o token ainda válido: as regras de `labels` e `quick_replies` descobrem a empresa lendo o próprio perfil, e a regra de `profiles` exige `status = 'active'` (B20-02). Sem perfil, nenhuma linha passa.

### Cenário de Erro
- Escrita do admin desativado: o banco recusa a inserção e não acha linha para alterar ou apagar.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B50-05 | automática | `src/test/conta-desativada-etiquetas.integration.test.ts` | com etiqueta e mensagem rápida conferidas antes, o atendente lê 1 ativo e nada depois de desativado |
| CA-B50-06 | automática | `src/test/conta-desativada-etiquetas.integration.test.ts` | o admin desativado tenta criar, alterar e apagar as duas, e o banco fica igual ao de antes |
| CA-B50-07 | automática | `src/test/conta-desativada-etiquetas.integration.test.ts` | o atendente ativo lê as duas; o admin ativo cria, altera e apaga, conferido com a chave de serviço |

## Banco de Dados

Nada muda: a sonda no banco de teste mostrou que a regra da B20-02 já fecha as duas tabelas.

## Arquivos

- **Criar:** `src/test/conta-desativada-etiquetas.integration.test.ts` — testes da B50-01

## Checklist

- [x] Conferido no banco de teste que a conta desativada não lê nem grava (sem mudança no banco)
- [x] Testes da tabela Prova passando