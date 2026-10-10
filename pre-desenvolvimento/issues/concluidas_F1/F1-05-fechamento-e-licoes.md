# F1-05: Fechamento da issue e lições aprendidas

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (`/issue`, `/spec`, `/plan`)
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-fluxo-com-prova.md`

## Descrição

O `/issue` só move a issue para a pasta de concluídas quando o auditor diz **alinhada**;
com teste manual pendente, ela fica aberta mesmo com o código no ar. Ao fechar, o projeto
pode registrar lições no arquivo de lições versionado: no máximo duas por issue, cada uma
citando a falha real que a originou (problema do auditor, teste que falhou, problema do
`/revisildo` ou erro achado em teste manual). Lição sem falha de origem é recusada;
caminho limpo não gera lição. A mesma falha em outra série marca a lição como recorrente.
O `/spec` e o `/plan` passam a ler no máximo dez lições, as recorrentes primeiro. A
pessoa pode mandar remover uma lição errada.

Cobre o módulo 9 da spec e o comportamento "ler as lições" dos módulos 1 e 3.

Depende de F1-04.

## Pronto quando

Fechando uma issue de exemplo que teve um problema apontado pelo auditor no caminho: a
lição é aceita e aparece no arquivo de lições com a issue e a falha de origem; uma lição
sem falha é recusada; a terceira lição da mesma issue é recusada. Rodando `/spec` e
`/plan` depois, a lição aparece entre as lidas. Uma issue com teste manual pendente não
é movida para concluídas.

## O que a pesquisa achou

- O `/issue` de hoje move a issue para concluídas sempre que o `/revisildo` passa. Na
  prática, as issues com teste de chip pendente já ficavam soltas na pasta (B13-05,
  B19-04), mas por decisão de quem conduzia, não por regra da skill.
- A skill `onp-spec-driven` só aceita lição que cita um sinal registrado pelo motor. Mesmo
  desenho aqui: o auditor guarda os problemas que travaram cada issue e só aceita lição
  que cite um deles.
- O histórico de sinais muda a cada rodada do auditor. Versionado, geraria conflito entre
  a Marcelle e o Luan; por isso fica em `.claude/auditor-sinais.json`, que o `.gitignore`
  já deixa fora. O arquivo de lições, esse sim, é versionado.
- Falha achada por leitura ou em teste manual não passa pelo auditor. Para não ficar de
  fora, entra com a evidência por escrito.

## Decisões de formato

Arquivo de lições, escrito só pelo auditor:

```markdown
| ID | Lição | Origem | Falha | Voltou a acontecer em |
|---|---|---|---|---|
| L-01 | Confira o valor gravado, não só o retorno | B23-02 | critério sem prova em CA-B23-03 | B24-01 |
```

## Cenários

### Happy Path
1. `/issue`: com o auditor em **alinhada**, move a issue para concluídas. Com teste manual
   pendente, não move, lista os testes com o roteiro e explica o `confirmar`.
2. Depois da revisão, se algo deu errado no caminho: `licao adicionar` (no máximo duas) ou
   `licao recorreu` quando a falha é a de uma lição que já existe, em outra série.
3. `/spec` e `/plan` começam por `licao listar`: até dez lições, recorrentes primeiro.

### Edge Cases
- Caminho limpo: nenhuma lição.
- Issue no formato antigo: fecha pelo resultado do `/revisildo`, como hoje.
- Lição cujo texto tem barra vertical: o caractere é trocado por `/`, para não quebrar a
  tabela.
- Projeto ainda sem arquivo de lições: `licao listar` responde "Nenhuma lição registrada."

### Cenário de Erro
- Lição sem falha, com falha que o auditor não registrou naquela issue, ou terceira
  lição da mesma issue: recusada, com o motivo.
- Recorrência na mesma série, ou em série já contada: recusada.
- Remover ou marcar lição que não existe: recusada.

## Banco de Dados

Sem mudança.

## Arquivos

- **Modificar:** `.claude/skills/auditor/scripts/auditor.mjs` — registro de sinais e os
  comandos `licao listar`, `adicionar`, `recorreu` e `remover`.
- **Modificar:** `.claude/skills/auditor/SKILL.md` — seção Lições aprendidas e comandos.
- **Modificar:** `.claude/skills/issue/SKILL.md` — fecha só com "alinhada"; passo de lições.
- **Modificar:** `.claude/commands/spec.md` — lê as lições antes de escrever.
- **Modificar:** `.claude/commands/plan.md` — lê as lições antes de planejar.
- **Modificar:** `src/test/auditor.test.mjs` — testes das lições e dos sinais.

O arquivo `pre-desenvolvimento/licoes.md` nasce quando a primeira lição for gravada.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Sinais dos problemas que travam, guardados fora do git
- [x] `licao adicionar` com as recusas (sem falha, falha não registrada, terceira lição)
- [x] `licao recorreu`, `licao listar` (dez, recorrentes primeiro) e `licao remover`
- [x] `/issue` fecha só com "alinhada" e ganha o passo de lições
- [x] `/spec` e `/plan` leem as lições
- [x] Testes do auditor passando (39)
- [x] Comandos experimentados no CRM: lista vazia e recusa de lição sem falha real
