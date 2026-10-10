---
name: auditor
description: Roda o auditor do fluxo com prova — o conferidor mecânico que diz se uma issue ou uma série está alinhada (cada critério de aceite tem teste com o código dele e o teste passou, suposições e perguntas fechadas, seções presentes). Use quando o usuário pedir para auditar uma issue ou série, perguntar "qual critério não tem teste?", "o que estamos assumindo?", "o que falta de teste manual?", ou quiser registrar que um teste manual foi feito. O /revisildo e o /issue também o usam.
---

# Auditor — a prova que não depende de leitura

O auditor é um script. Ele não julga: lê a spec, a issue e os testes, roda os testes da
issue e devolve problemas ou nenhum. **Quem diz que a issue está alinhada é ele, não
você.** Nunca apresente uma conferência feita por leitura como se fosse o auditor.

O script fica nesta skill, em `scripts/auditor.mjs`, e roda **a partir da raiz do
projeto**, só com o Node do ambiente:

```bash
node .claude/skills/auditor/scripts/auditor.mjs issue <id|caminho> [--sem-rodar] [--json]
node .claude/skills/auditor/scripts/auditor.mjs serie <série> [--sem-rodar] [--json]
node .claude/skills/auditor/scripts/auditor.mjs suposicoes
node .claude/skills/auditor/scripts/auditor.mjs regras
node .claude/skills/auditor/scripts/auditor.mjs licao listar
node .claude/skills/auditor/scripts/auditor.mjs licao adicionar <issue> --falha <código|revisildo|teste-manual> --texto "..." [--evidencia "..."]
node .claude/skills/auditor/scripts/auditor.mjs licao recorreu <L-nn> <issue>
node .claude/skills/auditor/scripts/auditor.mjs licao remover <L-nn>
node .claude/skills/auditor/scripts/auditor.mjs confirmar <id> <CA-...> --por <nome> [--dia dd/mm/aaaa]
```

| Pergunta | Comando |
|---|---|
| Esta issue está alinhada? | `issue B23-02` |
| Qual critério não tem teste? | `issue B23-02` ou `serie B23` |
| Posso arquivar a spec? | `serie B23` (tem que dar **alinhada**) |
| O que estamos assumindo? | `suposicoes` |
| O que cada regra acha no projeto hoje? | `regras` |
| A Marcelle fez o teste com o chip | `confirmar B23-03 CA-B23-04 --por Marcelle` |

`--sem-rodar` confere só a estrutura, sem executar os testes. Serve para uma olhada
rápida; nunca libera commit.

## Vereditos

| Veredito | Saída | O que significa |
|---|---|---|
| alinhada | 0 | Pode commitar e pode fechar a issue |
| alinhada com teste manual pendente | 10 | Pode commitar e publicar; a issue **fica aberta** até o teste manual ser confirmado |
| estrutura conferida, testes não rodados | 11 | Rodou com `--sem-rodar`; não vale como prova |
| não alinhada | 1 | Há problema que trava; corrija |
| formato antigo | 0 | Issue sem critérios com código; a prova mecânica não se aplica |

## Problemas que ele aponta

| Problema (código) | O que significa | O que fazer |
|---|---|---|
| critério sem teste (`CRITERIO_SEM_TESTE`) | critério automático sem teste com o código dele | escreva o teste com o código no nome do `it`/`test` |
| critério sem prova (`CRITERIO_SEM_PROVA`) | o teste existe, mas falhou, foi pulado ou não rodou | faça passar; teste pulado não é prova |
| teste órfão (`TESTE_ORFAO`) | teste com código que não existe na spec da série | a spec mudou: atualize ou remova o teste |
| critério fora de issue (`CRITERIO_FORA_DE_ISSUE`) | critério da spec que nenhuma issue entrega | inclua em uma issue |
| critério em duas issues (`CRITERIO_EM_DUAS_ISSUES`) | o mesmo critério em mais de uma issue | deixe em uma só |
| critério fora da spec (`CRITERIO_FORA_DA_SPEC`) | critério na issue que não está na spec | acrescente à spec ou tire da issue |
| suposição aberta (`SUPOSICAO_ABERTA`) | suposição sem confirmação | confirme ou invalide com quem decide |
| pergunta aberta (`PERGUNTA_ABERTA`) | pergunta sem resposta | pergunte e grave a resposta |
| seção ausente (`SECAO_AUSENTE`) | falta Suposições ou Perguntas em aberto | acrescente; sem nenhuma, escreva `Nenhuma.` |
| spec não encontrada (`SPEC_NAO_ENCONTRADA`) | nenhuma spec com a série da issue | confira `> série:` no topo da spec |
| exceção inválida (`EXCECAO_INVALIDA`) | exceção sem motivo, aprovador ou dia | complete ou remova |
| arquivo fora da issue (`ARQUIVO_FORA_DA_ISSUE`) | arquivo mexido que não está na seção Arquivos | desfaça, ou pare e pergunte antes de incluir na issue |
| arquivo não tocado (`ARQUIVO_NAO_TOCADO`) | arquivo listado que não foi mexido | implemente o que falta ou tire da issue |
| checklist incompleto (`CHECKLIST_INCOMPLETO`) | item do Checklist ainda `[ ]` | conclua e marque |
| regra violada (`REGRA_VIOLADA`) | uma regra por script foi quebrada, com arquivo e linha | siga o "o que fazer" da regra |
| regra desligada sem motivo (`REGRA_DESLIGADA_SEM_MOTIVO`) | `auditor-desligar` sem o porquê | escreva o motivo |
| escopo não conferido (`ESCOPO_NAO_CONFERIDO`) | nada mudou desde o último commit | **não trava**; para conferir o escopo, rode antes de commitar |
| teste manual pendente (`TESTE_MANUAL_PENDENTE`) | critério manual sem confirmação | **não trava**; faça o teste e use `confirmar` |
| issue no formato antigo (`FORMATO_ANTIGO`) | issue sem critérios com código | **não trava**; revise do jeito antigo |

## Como falar com a pessoa

- **Cole a saída do auditor** e depois traduza em uma ou duas frases simples o que ela
  diz e qual é o próximo passo. A saída é a prova; a tradução é para ela não precisar
  decifrar.
- Use o nome por extenso: "o critério de aceite do aviso (CA-B23-01) ainda não tem
  teste", nunca só o código.
- Havendo teste manual pendente, mostre o roteiro que o auditor imprimiu.

## Regras

- **Nunca pule, enfraqueça ou apague um teste para o auditor passar.** Nem mude o tipo
  de prova de um critério de `automática` para `manual` por conta própria.
- **Nunca escreva uma exceção por conta própria.** Exceção é decisão de quem aprova.
- Se o mesmo problema persistir depois de três tentativas de correção, pare e apresente
  os problemas à pessoa. Não contorne o auditor.
- Não use `confirmar` sem a pessoa ter dito que fez o teste. O nome em `--por` é o de
  quem conferiu, nunca o seu.

## Formatos que o auditor lê e escreve na issue

**Testes manuais** (o `confirmar` escreve):

```markdown
## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B23-04 | Marcelle | 12/10/2026 |
```

**Exceções** (só com aprovação de quem pode aprovar; a lista fica em `auditor.json`,
nesta skill):

```markdown
## Exceções

| Problema | Alvo | Motivo | Aprovado por | Dia |
|---|---|---|---|---|
| CRITERIO_SEM_PROVA | CA-B23-02 | Depende do chip, que está fora do ar | Marcelle | 12/10/2026 |
```

A coluna **Problema** leva o código do problema; **Alvo**, o código do critério ou da
suposição. Toda exceção aceita aparece no relatório com `⚑`, para nunca ficar escondida.

## Escopo e regras por script

O auditor compara o que mudou **desde o último commit** com a seção Arquivos da issue.
Por isso ele confere o escopo antes do commit; depois do commit, só avisa que não
conferiu. Documentos do fluxo (`pre-desenvolvimento/`) nunca contam como fora da issue;
a lista está em `foraDoEscopo`, no `auditor.json` desta skill.

As regras do projeto ficam em `regras.json`, nesta skill. Cada uma diz de qual regra do
`CLAUDE.md` ela vem. Há dois tipos:

- `conteudo`: procura um padrão nas **linhas acrescentadas** dos arquivos mexidos (o que
  já existia antes não é cobrado). `somenteSe` restringe a arquivos com certo conteúdo,
  como `'use client'`.
- `intocavel`: acusa quando um arquivo que já existia foi modificado ou apagado.
  `salvoSeMudar` libera quando outro arquivo mudou junto (os tipos do banco podem mudar
  se houver migration nova).

Para **acrescentar uma regra**, inclua um item em `regras.json` e rode `regras`: ele
mostra quantos arquivos a regra confere e o que ela acha hoje. Regra que confere zero
arquivos está com o caminho errado.

Para **desligar uma regra em um arquivo**, escreva um comentário no próprio arquivo, com
o motivo: `// auditor-desligar variante-dark: componente de terceiros, mantém o original`.
Sem motivo, o auditor recusa. Toda regra desligada aparece no relatório com `⚑`. Só
desligue uma regra com a aprovação da pessoa.

O que script não enxerga continua sendo lido pelo `/revisildo`: lógica de negócio no
frontend e autorização só no cliente.

## Lições aprendidas

O arquivo `pre-desenvolvimento/licoes.md` guarda regras que nasceram de falhas reais. Ele
é versionado, para todo mundo do projeto receber, e **só o auditor escreve nele**.

- Toda vez que o auditor acusa um problema que trava, ele guarda um sinal em
  `auditor-sinais.json`, dentro da pasta `.git` do projeto (nunca é versionado). É o lastro: `licao adicionar --falha
  <CÓDIGO>` só aceita um código que o auditor de fato acusou naquela issue.
- Falha que o auditor não vê (achada pelo `/revisildo` por leitura ou em teste manual)
  entra com `--falha revisildo` ou `--falha teste-manual` e a `--evidencia` por escrito.
- No máximo duas lições por issue. Caminho limpo não gera lição.
- `licao recorreu` marca que a mesma falha voltou em **outra série**. Lição recorrente é
  lida primeiro.
- `licao listar` entrega no máximo dez: as recorrentes na frente, depois as mais novas.
  É o que o `/spec` e o `/plan` leem.
- `licao remover` só por decisão da pessoa.

## Limites

- Roda só testes do Vitest, nas pastas de `auditor.json` (nesta skill). Roteiro de tela
  (`e2e/preview/`) não conta como prova automática: critério que só se confere pela tela
  é de prova `manual`.
- Vale o código no nome do `it`/`test`. Código só no `describe` não conta.
- Roda apenas os arquivos de teste que carregam os códigos da issue, não a suíte inteira.
