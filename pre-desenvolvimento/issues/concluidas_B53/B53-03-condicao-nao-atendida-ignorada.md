# B53-03: Condição não atendida aparece como "Ignorada" no Histórico

**Tipo:** Implementação
**Página:** Automações — histórico
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Execução que para numa condição falsa sem saída "não" ligada passa a ser gravada como "Ignorada" com o motivo, em vez de "Concluída —".

## Pronto quando

O Histórico mostra "Ignorada — Condição não atendida: <nome>" nesses casos.

## Critérios de aceite

- **CA-B53-06** (automática) — Condição não atendida aparece como Ignorada. Dado uma automação cuja condição deu "não" e a saída "não" não está ligada a nenhum bloco, quando a execução termina, então o Histórico mostra "Ignorada" com o motivo "Condição não atendida: <nome da condição>".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-06 | O bloco de condição não tem nome; o "<nome da condição>" do motivo é o rótulo da primeira verificação que não valeu, como no editor (ex.: "Condição não atendida: Tag do contato"). E a execução só vira "Ignorada" quando nenhuma ação rodou no caminho: a que já fez alguma ação antes da condição continua "Concluída" (ou "Falhou"), porque a proteção de repetição não conta as ignoradas e a regra mandaria a mesma ação de novo. | confirmada | Marcelle confirmou, 30/10/2026. |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A regra roda: gatilho → condição → (sim) ação; a saída "não" não está ligada.
2. A condição dá "não": `percorrerFluxo` (`src/lib/fluxo-automacao.ts`) termina ali e marca `naoAtendida` com o bloco e a verificação que não valeu.
3. `motivoDaCondicaoNaoAtendida` (`src/lib/automacoes/execucoes.ts`) devolve "Condição não atendida: <rótulo da verificação>".
4. `executarRegra` (`src/lib/automacoes/index.ts`) grava a execução como `ignorada`, com o motivo e o caminho. O Histórico já mostra "Ignorada" e o motivo (`historico-client.tsx`).

### Edge Cases
- Uma ação rodou antes da condição: continua "Concluída" ou "Falhou", sem esse motivo (SUP-B53-06).
- A condição deu "não" e a saída "não" está ligada: segue o caminho, como hoje.
- Depois de uma espera (`src/lib/automacoes/esperas.ts`), o caminho para numa condição falsa sem saída e não houve ação nenhuma: também "Ignorada".
- Ignorada não gasta a vez na proteção de repetição; como não houve ação, nada muda nela.

### Cenário de Erro
- Condição que não conseguiu consultar o banco: continua "Falhou" com o motivo do erro.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-06 | automática | `src/test/automacoes.test.ts` | a execução com a condição "tag do contato tem vip" dando "não" e sem saída "não" é gravada como `ignorada` com o motivo "Condição não atendida: Tag do contato"; com uma ação antes, continua `concluida` |

## Arquivos

- **Modificar:** `src/lib/fluxo-automacao.ts` — `percorrerFluxo` marca `naoAtendida` quando a condição dá "não" sem ligação.
- **Modificar:** `src/lib/automacoes/execucoes.ts` — `motivoDaCondicaoNaoAtendida`, com o rótulo da verificação (`VERIFICACOES` do catálogo do editor).
- **Modificar:** `src/lib/automacoes/index.ts` — grava `ignorada` com o motivo.
- **Modificar:** `src/lib/automacoes/esperas.ts` — o mesmo ao seguir depois de uma espera.
- **Modificar:** `src/test/automacoes.test.ts` — testes do CA-B53-06.

## Checklist

- [x] `percorrerFluxo` marca a condição não atendida sem saída "não"
- [x] Motivo "Condição não atendida: <rótulo>" e resultado `ignorada` no motor e depois da espera
- [x] Execução com ação antes da condição continua concluída
- [x] Testes do CA-B53-06
