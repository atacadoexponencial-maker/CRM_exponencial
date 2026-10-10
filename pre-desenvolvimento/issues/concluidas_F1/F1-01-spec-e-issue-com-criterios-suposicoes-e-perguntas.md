# F1-01: Spec e issue com critérios de aceite, suposições e perguntas

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (`/spec`, `/break`, `/plan`, `/execute`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-fluxo-com-prova.md`

## Descrição

Os comandos `/spec`, `/break` e `/plan` passam a produzir o formato novo: critérios de
aceite com código e tipo de prova (automática ou manual), seções obrigatórias de
Suposições e Perguntas em aberto com status, seção Fora de escopo e, no plano, a tabela
Prova (critério, tipo, arquivo de teste, o que o teste confere). O `/execute` passa a
registrar como suposição aberta a decisão que a issue não previa.

Cobre os módulos 1, 2, 3 e 4 da spec e a seção Vocabulário, menos "ler as lições", que
fica na F1-05.

Esta série (F1) é escrita no formato de hoje, porque o formato novo só existe depois
dela.

## Pronto quando

Rodando `/spec` com uma descrição curta de exemplo, sai uma spec com critérios
`CA-<série>-<nn>` em Dado / Quando / Então, cada um marcado como automático ou manual, e
com as seções Suposições, Perguntas em aberto e Fora de escopo. Rodando `/break` nela,
todo critério aparece em exatamente uma issue. Rodando `/plan` em uma dessas issues, a
tabela Prova tem uma linha por critério e os arquivos de teste entram na seção Arquivos.

## O que a pesquisa achou

- Os quatro comandos existem em duas cópias: `.claude/commands/` (repositório) e a pasta
  pessoal da Marcelle. **Na máquina dela, a cópia pessoal é a que roda**: em 10/10/2026,
  `/break` e `/plan` carregaram o texto da pasta pessoal, não o do repositório. Para o
  Luan, que não tem cópia pessoal, roda a do repositório.
- O `/break` do repositório ainda corta "uma issue por comportamento" e não tem a seção
  **Pronto quando**. As issues reais (B13 em diante) já seguem o corte por entrega e têm
  Pronto quando, que é o texto da cópia pessoal. O repositório está atrasado em relação à
  prática.
- A série (B22, B23...) hoje só é escolhida no `/break`, e ninguém a reserva. Foi assim
  que duas séries B22 nasceram no mesmo dia (landing e correções do QA).
- Formato real de issue a preservar: cabeçalho com Tipo, Página, Repositório e Spec;
  seções Descrição, Pronto quando, Cenários, Banco de Dados, Arquivos, Dependências
  Externas e Checklist (ex.: `B13-05`).
- Modelo de referência para as tabelas de suposições e perguntas: o da skill
  `onp-spec-driven` (`scripts/lib/templates/spec.md`), adaptado para os códigos em
  português.

## Decisões de formato

Estes formatos são o que o auditor (F1-02) vai ler. Mudar depois custa caro.

**Série.** O `/spec` escolhe a próxima série livre olhando a tabela de
`pre-desenvolvimento/issues/README.md` e as pastas `concluidas_*`, escreve
`> série: B23` no topo da spec e acrescenta a linha da série na tabela do README na
mesma hora. Isso reserva o número.

**Critério de aceite, na spec**, sob o comportamento a que pertence:

```markdown
#### CA-B23-01 — [título que uma pessoa entende] · prova: automática

- **Dado** [estado inicial]
- **Quando** [ação]
- **Então** [resultado que dá para observar]
```

O tipo de prova é `automática` ou `manual`. A numeração é contínua dentro da série.

**Suposições e perguntas, na spec e na issue:**

```markdown
## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-01 | [o que foi assumido] | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-01 | [o que falta decidir] | aberta | — |
```

Status de suposição: `aberta`, `confirmada`, `invalidada`. Status de pergunta: `aberta`,
`respondida`. Sem nenhum item, a seção traz só a linha `Nenhuma.`

**Critérios, na issue** (escrita pelo `/break`):

```markdown
## Critérios de aceite

- **CA-B23-01** (automática) — [título]. Dado [...], quando [...], então [...].
- **CA-B23-02** (manual) — [título]. Dado [...], quando [...], então [...].
```

**Prova, na issue** (escrita pelo `/plan`):

```markdown
## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-01 | automática | `src/test/arquivo.test.ts` | [resultado conferido] |
| CA-B23-02 | manual | roteiro abaixo | [o que a pessoa confere] |

### Roteiro manual — CA-B23-02
1. [passo]
```

## Cenários

### Happy Path
1. `/spec <descrição>`: escolhe e reserva a série, escreve a spec com Visão Geral,
   módulos com Componentes e Comportamentos, ao menos um critério de aceite por
   comportamento, e as seções Fora de escopo, Suposições e Perguntas em aberto. Com a
   pessoa presente, pergunta na hora e grava a resposta com o status atualizado.
2. `/break <spec>`: corta por entrega (texto da cópia pessoal), copia para cada issue os
   critérios que ela entrega e as suposições e perguntas que afetam aquela entrega, e
   confere que todo critério da spec caiu em exatamente uma issue.
3. `/plan <issue>`: acrescenta a tabela Prova com uma linha por critério, o roteiro de
   cada critério manual, lista os arquivos de teste na seção Arquivos e registra como
   suposição o que a pesquisa no código não confirmou.
4. `/execute <issue>`: como hoje; decisão não prevista que não justificava parar vira
   suposição `aberta` na issue.

### Edge Cases
- Spec sem suposição ou sem pergunta: a seção existe e traz `Nenhuma.`
- Critério que não dá para observar ("deve ser rápido"): o `/spec` recusa e pede um que
  dê.
- Critério que não cabe em nenhuma entrega: o `/break` avisa a pessoa, não cria issue só
  para ele.
- Issue de protótipo: recebe a seção Critérios de aceite só com critérios manuais, ou
  `Nenhum.`
- Issue no formato antigo passada ao `/plan` (sem Critérios de aceite): o `/plan`
  planeja como hoje e não inventa códigos.
- Pergunta em aberto que muda a implementação: o `/plan` para e pergunta.
- Projeto sem `pre-desenvolvimento/issues/README.md`: fora desta issue; a versão
  genérica dos caminhos entra na F1-06.

### Cenário de Erro
- Série já usada (pasta ou linha existente no README): o `/spec` pula para a próxima
  livre e diz qual escolheu.
- Critério da spec sem issue ao fim do `/break`: o `/break` não termina; lista os
  critérios sobrando.

## Banco de Dados

Sem mudança.

## Arquivos

- **Modificar:** `.claude/commands/spec.md` — estrutura da spec com série reservada,
  critérios de aceite com código e tipo de prova, Fora de escopo, Suposições e Perguntas
  em aberto; regra do critério observável; perguntar na hora.
- **Modificar:** `.claude/commands/break.md` — passa a ter o corte por entrega e o Pronto
  quando (texto da cópia pessoal, com os caminhos do CRM) e ganha a seção Critérios de
  aceite, a cópia de suposições e perguntas e a conferência "todo critério em uma issue".
- **Modificar:** `.claude/commands/plan.md` — tabela Prova, roteiro manual, Suposições e
  Perguntas em aberto da issue, arquivos de teste na seção Arquivos, parar em pergunta
  que muda a implementação, tolerância ao formato antigo.
- **Modificar:** `.claude/commands/execute.md` — decisão não prevista vira suposição
  aberta.

> As cópias da pasta pessoal **não** são mexidas aqui. Elas mudam todas de uma vez na
> F1-06, quando o auditor já existir, para os outros projetos nunca ficarem com meio
> fluxo.

## Dependências Externas

Nenhuma.

## Prova

Esta issue só muda texto de comando; não há teste automático possível nela. A conferência
é manual, e o auditor da F1-02 passa a ler estes formatos.

Como a cópia pessoal é a que roda na máquina da Marcelle, o exemplo é feito **seguindo o
arquivo do repositório lido diretamente**, não chamando `/spec` pelo atalho.

## Checklist

- [x] `.claude/commands/spec.md` com o formato novo
- [x] `.claude/commands/break.md` com corte por entrega e critérios
- [x] `.claude/commands/plan.md` com tabela Prova e roteiro manual
- [x] `.claude/commands/execute.md` com a regra da suposição
- [x] Exemplo de ponta a ponta numa pasta temporária, fora do repositório: uma spec
      curta, as issues dela e o plano de uma issue, seguindo os quatro arquivos novos
- [x] Conferido no exemplo: todo critério em exatamente uma issue; tabela Prova com uma
      linha por critério; seções Suposições e Perguntas presentes nos três níveis
- [x] A Marcelle leu o exemplo e aprovou o formato (10/10/2026)
