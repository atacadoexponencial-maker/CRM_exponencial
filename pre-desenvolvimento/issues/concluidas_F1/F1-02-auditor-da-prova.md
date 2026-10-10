# F1-02: Auditor da prova e testes com o código do critério

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (auditor, etapa de testes)
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-fluxo-com-prova.md`

## Descrição

Nasce o auditor: um conferidor que roda sozinho e diz se uma issue, ou uma série
inteira, está alinhada. Nesta issue ele confere a prova e os registros: critério sem
teste, critério sem prova (teste falhou ou foi pulado), teste órfão, critério fora de
issue, suposição aberta, pergunta aberta, seção ausente, teste manual pendente e issue no
formato antigo. Aceita exceção escrita na issue (motivo, quem aprovou e o dia) e a mostra
no relatório. A etapa de testes passa a escrever os testes a partir da tabela Prova, com
o código do critério no nome do teste; issue no formato antigo continua pelo plano de
testes por módulo.

Cobre os módulos 5 e 6 da spec, menos os problemas "arquivo fora da issue", "arquivo não
tocado", "checklist incompleto" e "regra violada", que ficam na F1-03.

Depende de F1-01.

## Pronto quando

Com uma issue de exemplo no formato novo: o auditor responde **alinhada** quando todo
critério automático tem teste passando; tirando o código de um teste, ele acusa
"critério sem teste"; pulando um teste, acusa "critério sem prova"; deixando uma
suposição aberta, acusa "suposição aberta"; com um critério manual sem confirmação,
responde **alinhada com teste manual pendente** e mostra o roteiro; depois de registrar
a confirmação (quem e quando), responde **alinhada**. Em uma issue antiga (ex.: B13-05),
ele avisa que o formato é antigo e não trava. "O que estamos assumindo?" lista as
suposições abertas.

## O que a pesquisa achou

- Os testes do CRM rodam com Vitest 4 (`vitest.config.ts`, pasta `src/test/`, 86
  arquivos, 31 de integração no banco real). O Vitest tem saída em JSON com o nome e o
  resultado de cada teste (`passed`, `failed`, `skipped`, `pending`, `todo`).
- `e2e/` tem um único arquivo do Playwright, antigo; os roteiros de tela ficam em
  `e2e/preview/*.cjs` e não são testes com resultado por caso. O auditor desta issue roda
  só Vitest.
- Não existe nada reaproveitável para ler spec e issue: `scripts/` só tem o script do
  ClickUp. O Node (24) já está no ambiente e basta, sem pacote novo.
- A skill `onp-spec-driven` embarca o motor dentro da pasta da skill. Mesmo caminho aqui:
  o auditor mora em `.claude/skills/auditor/`, e a F1-06 copia a pasta para os outros
  projetos sem instalar nada.
- Rodar a suíte inteira estoura o limite do Supabase. O auditor roda **só os arquivos de
  teste que carregam os códigos da issue**.

## Decisões de formato

**Código no teste.** O código do critério vai no nome do `it`/`test`:
`it('CA-B23-01: avisa quando o telefone já existe', ...)`. Código só no `describe` não
conta.

**Prova.** Um critério automático está provado quando existe ao menos um teste com o
código dele e **todos** os testes com esse código passaram. Falhou ou foi pulado
(`skip`, `todo`): sem prova.

**Teste manual confirmado**, na issue (o auditor escreve com `confirmar`):

```markdown
## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B23-04 | Marcelle | 12/10/2026 |
```

**Exceção**, na issue (escrita à mão, com aprovação):

```markdown
## Exceções

| Problema | Alvo | Motivo | Aprovado por | Dia |
|---|---|---|---|---|
| CRITERIO_SEM_PROVA | CA-B23-02 | Depende do chip, que está fora do ar | Marcelle | 12/10/2026 |
```

**Vereditos e códigos de saída:** `alinhada` (0), `alinhada com teste manual pendente`
(10), `estrutura conferida, testes não rodados` (11, só com `--sem-rodar`),
`não alinhada` (1), erro de uso (2). Issue no formato antigo: aviso e saída 0.

**Comandos:**

```bash
node .claude/skills/auditor/scripts/auditor.mjs issue <id|caminho> [--sem-rodar] [--json]
node .claude/skills/auditor/scripts/auditor.mjs serie <série> [--sem-rodar] [--json]
node .claude/skills/auditor/scripts/auditor.mjs suposicoes
node .claude/skills/auditor/scripts/auditor.mjs confirmar <id> <CA-...> --por <nome> [--dia dd/mm/aaaa]
```

## Cenários

### Happy Path
1. `issue B23-02`: lê a issue e a spec da série, acha os testes com os códigos, roda só
   esses arquivos, cruza o resultado e imprime o relatório com o veredito.
2. `serie B23`: faz o mesmo para todas as issues da série (abertas e concluídas) e
   confere que todo critério da spec está em exatamente uma issue.
3. `confirmar B23-03 CA-B23-04 --por Marcelle`: grava a linha em Testes manuais.
4. `suposicoes`: lista as suposições e perguntas abertas das specs em andamento e das
   issues abertas.

### Edge Cases
- Issue sem a seção Critérios de aceite: formato antigo, aviso, não trava.
- Issue só com critérios manuais: não roda teste nenhum.
- Seção com `Nenhuma.`: vale como presente e vazia.
- Status que o auditor não conhece: conta como aberto.
- Teste com o código de um critério que não está na spec da série: teste órfão.
- Exceção sem motivo, sem aprovador, com aprovador fora da lista ou sem data: recusada,
  e vira o problema "exceção inválida".
- Spec já arquivada: o auditor a procura pela série também em `docs/specs-arquivadas/`.

### Cenário de Erro
- O Vitest não gera o arquivo de resultado: nenhum critério é dado como provado e o
  relatório mostra o fim da saída do Vitest.
- Issue não encontrada, comando desconhecido: mensagem e saída 2.
- `confirmar` com critério que não é manual ou não é da issue: recusa e saída 2.

## Banco de Dados

Sem mudança.

## Arquivos

- **Criar:** `.claude/skills/auditor/scripts/auditor.mjs` — o auditor (leitura de spec e
  issue, busca dos códigos nos testes, execução do Vitest, catálogo, relatório, comandos).
- **Criar:** `.claude/skills/auditor/SKILL.md` — como o agente usa o auditor e traduz a
  saída; formatos de Testes manuais e Exceções.
- **Criar:** `.claude/skills/auditor/auditor.json` — configuração do CRM (pastas e
  aprovadores). Fica dentro da skill porque o `.gitignore` só versiona `.claude/skills/` e
  `.claude/commands/`.
- **Modificar:** `.claude/skills/testes/SKILL.md` — issue no formato novo: testes saem da
  tabela Prova, com o código no nome; formato antigo continua pelo plano de testes.
- **Criar:** `src/test/auditor.test.mjs` — testes do auditor com issues de exemplo em
  pasta temporária.

## Dependências Externas

Nenhuma.

## Checklist

- [x] `auditor.mjs` com os comandos `issue`, `serie`, `suposicoes` e `confirmar`
- [x] Catálogo desta issue: critério sem teste, sem prova, teste órfão, critério fora de
      issue, suposição aberta, pergunta aberta, seção ausente, teste manual pendente,
      formato antigo, exceção
- [x] `SKILL.md` do auditor e `auditor.json`
- [x] Skill `testes` com o caminho do formato novo
- [x] `src/test/auditor.test.mjs` passando
- [x] Demonstração do "Pronto quando" com uma issue de exemplo e o Vitest de verdade
- [x] `npm run lint` e `npx tsc --noEmit` sem erro novo
