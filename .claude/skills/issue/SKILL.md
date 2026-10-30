---
name: issue
description: Executa o fluxo completo de uma issue — /plan → /execute → testes → /revisildo — a partir do identificador da issue. Use quando o usuário disser apenas o identificador (ex.: "issue 8", "/issue 8" ou "/issue B1-01"). Resolve automaticamente o caminho do arquivo em pre-desenvolvimento/issues/.
---

# Fluxo completo de issue (plan → execute → testes → revisildo)

## O que fazer

O usuário passou o identificador da issue como argumento: **ARGUMENTS**

Antes de qualquer coisa, leia o `AGENTS.md` da raiz do projeto: é a página de
princípios, com as regras sempre ativas, a arquitetura, o fluxo e as regras de git.

### Passo 1 — Resolver o caminho

Use o Glob para localizar o arquivo da issue dentro de `pre-desenvolvimento/issues/`, a partir da raiz do repositório.

O padrão é: `{identificador}-*.md`
Exemplos: `08-*.md`, `09-*.md`, `B1-01-*.md`

Se o identificador for um número de um dígito (ex.: 8), normalize para dois dígitos (08).
Aceite variações de caixa (`b1-01` resolve para `B1-01`).
Se o arquivo não for encontrado, informe o usuário e pare.

### Passo 2 — Atualizar ClickUp para "em andamento" (opcional)

Se o arquivo `scripts/clickup-issue-status.ps1` existir e houver `CLICKUP_API_KEY` no `.env.local`, execute:
```
pwsh scripts/clickup-issue-status.ps1 -issueFile "<caminho_do_arquivo>" -status "em andamento"
```
Se o script não existir ou falhar, informe o usuário mas continue o fluxo — o ClickUp não é bloqueante.

### Passo 3 — /plan

Invoque o skill `plan` passando o caminho completo do arquivo da issue como argumento.
Aguarde a conclusão antes de continuar.

### Passo 4 — /execute

Invoque o skill `execute` passando o mesmo caminho completo do arquivo da issue.
Aguarde a conclusão antes de continuar.

### Passo 5 — Testes

Invoque o skill `testes` passando o identificador da issue como argumento.
O skill verificará se há testes mapeados para a issue e os implementará automaticamente.
Aguarde a conclusão antes de continuar.

### Passo 6 — /revisildo

Invoque o skill `revisildo` passando o mesmo caminho completo do arquivo da issue.
Ele roda o auditor e lê o código. Reporte o resultado ao usuário.

Guarde o **veredito do auditor**, porque os próximos passos dependem dele:

- **alinhada**: a issue pode ser fechada.
- **alinhada com teste manual pendente**: o código pode ser commitado e publicado, mas
  **a issue fica aberta** até a pessoa confirmar o teste manual.
- **formato antigo**: vale o resultado do `/revisildo` por leitura, como sempre.

### Passo 7 — Atualizar ClickUp para "concluído" (opcional)

Somente se o `/revisildo` não encontrou problemas **e não há teste manual pendente**, e nas mesmas condições do Passo 2, execute:
```
pwsh scripts/clickup-issue-status.ps1 -issueFile "<caminho_do_arquivo>" -status "concluído"
```
Se o revisildo encontrou problemas, **não atualize o ClickUp** — corrija os problemas primeiro.

### Passo 8 — Mover a issue para a pasta de concluídas

Somente se o `/revisildo` não encontrou problemas **e o veredito do auditor é "alinhada"** (ou a issue é do formato antigo), mova o arquivo da issue para a pasta de concluídas correspondente, dentro de `pre-desenvolvimento/issues/`.

Com **teste manual pendente, não mova**: a issue continua solta na pasta, mesmo com o código no ar. Diga à pessoa quais testes faltam, com o roteiro de cada um, e como registrar depois:

```bash
node .claude/skills/auditor/scripts/auditor.mjs confirmar <id> <CA-...> --por <nome de quem conferiu>
```

Quando a pessoa disser que fez o teste, registre com o nome dela, rode o auditor de novo e, com "alinhada", mova a issue.

Pastas de destino:

- Issues numéricas dos módulos 0 a 7: `concluidas_moduloX/`, onde `X` é o número do módulo
- Issues com prefixo de letra (ex.: `B1-01`): `concluidas_B1/` — o módulo sai do prefixo do nome do arquivo

Para determinar o módulo de uma issue numérica, leia o caminho do arquivo e/ou o conteúdo da issue. Use o comando:
```bash
mv "<caminho_do_arquivo>" "pre-desenvolvimento/issues/<pasta_de_concluidas>/"
```

Se a pasta de destino não existir, crie-a antes de mover.
Se não for possível determinar o módulo, informe o usuário e peça confirmação antes de mover.

### Passo 9 — Lições (só se algo deu errado no caminho)

Uma lição é uma regra geral, em uma frase, que teria evitado uma falha **que aconteceu de verdade** nesta issue. O auditor guarda sozinho os problemas que acusou; é esse o lastro.

1. Olhe o que aconteceu no caminho: o auditor acusou algum problema antes de dar "alinhada"? O `/revisildo` achou algo por leitura? Um teste manual revelou erro?
2. **Caminho limpo → nenhuma lição.** Isso é o certo, não é esquecimento.
3. Se a falha é a mesma de uma lição que já existe (`licao listar`) e esta issue é de outra série, marque a recorrência em vez de criar outra:
   ```bash
   node .claude/skills/auditor/scripts/auditor.mjs licao recorreu <L-nn> <id da issue>
   ```
4. Senão, registre **no máximo duas** lições:
   ```bash
   # falha que o auditor acusou nesta issue
   node .claude/skills/auditor/scripts/auditor.mjs licao adicionar <id> --falha <CODIGO_DO_PROBLEMA> --texto "regra geral em uma frase"
   # falha achada pelo /revisildo por leitura, ou em teste manual
   node .claude/skills/auditor/scripts/auditor.mjs licao adicionar <id> --falha revisildo --evidencia "o que deu errado" --texto "regra geral em uma frase"
   node .claude/skills/auditor/scripts/auditor.mjs licao adicionar <id> --falha teste-manual --evidencia "o que deu errado" --texto "regra geral em uma frase"
   ```
5. Se o auditor recusar a lição (sem falha real, ou a issue já tem duas), **a lição não existe**. Não force nem edite o arquivo de lições à mão.
6. Mostre à pessoa as lições gravadas. Ela pode mandar remover uma que considere errada: `licao remover <L-nn>`.

A lição descreve a regra, não o caso: "Confira o valor gravado no banco, não só o retorno da ação", e não "o teste da B23-02 estava errado".

## Regras

- Issues de protótipo nunca têm testes automáticos — não invente testes para elas.
- Nunca mova para concluídas uma issue com teste manual pendente.
- Nunca registre um teste manual como confirmado sem a pessoa ter dito que o fez.
- Se o `/revisildo` encontrar problemas, corrija-os antes de encerrar — não encerre o fluxo com problemas em aberto.
- Não peça confirmação entre os passos — execute tudo em sequência.
- Se qualquer passo falhar ou encontrar algo inesperado, pare e informe o usuário.
