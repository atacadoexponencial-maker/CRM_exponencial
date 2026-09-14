---
name: issue
description: Executa o fluxo completo de uma issue — /plan → /execute → testes → /revisildo — a partir do identificador da issue. Use quando o usuário disser apenas o identificador (ex.: "issue 8", "/issue 8" ou "/issue B1-01"). Resolve automaticamente o caminho do arquivo em pre-desenvolvimento/issues/.
---

# Fluxo completo de issue (plan → execute → testes → revisildo)

## O que fazer

O usuário passou o identificador da issue como argumento: **ARGUMENTS**

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
Reporte o resultado ao usuário.

### Passo 7 — Atualizar ClickUp para "concluído" (opcional)

Somente se o `/revisildo` não encontrou problemas, e nas mesmas condições do Passo 2, execute:
```
pwsh scripts/clickup-issue-status.ps1 -issueFile "<caminho_do_arquivo>" -status "concluído"
```
Se o revisildo encontrou problemas, **não atualize o ClickUp** — corrija os problemas primeiro.

### Passo 8 — Mover a issue para a pasta de concluídas

Somente se o `/revisildo` não encontrou problemas, mova o arquivo da issue para a pasta de concluídas correspondente, dentro de `pre-desenvolvimento/issues/`:

- Issues numéricas dos módulos 0 a 7: `concluidas_moduloX/`, onde `X` é o número do módulo
- Issues com prefixo de letra (ex.: `B1-01`): `concluidas_B1/` — o módulo sai do prefixo do nome do arquivo

Para determinar o módulo de uma issue numérica, leia o caminho do arquivo e/ou o conteúdo da issue. Use o comando:
```bash
mv "<caminho_do_arquivo>" "pre-desenvolvimento/issues/<pasta_de_concluidas>/"
```

Se a pasta de destino não existir, crie-a antes de mover.
Se não for possível determinar o módulo, informe o usuário e peça confirmação antes de mover.

## Regras

- Issues de protótipo nunca têm testes — não invente testes para elas.
- Se o `/revisildo` encontrar problemas, corrija-os antes de encerrar — não encerre o fluxo com problemas em aberto.
- Não peça confirmação entre os passos — execute tudo em sequência.
- Se qualquer passo falhar ou encontrar algo inesperado, pare e informe o usuário.
