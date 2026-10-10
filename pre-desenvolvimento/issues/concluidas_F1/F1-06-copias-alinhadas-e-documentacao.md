# F1-06: Cópias alinhadas, outros projetos e documentação

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (repositório do CRM e pasta pessoal da Marcelle)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-fluxo-com-prova.md`

## Descrição

O fluxo novo passa a valer igual no CRM e nos outros projetos da Marcelle. A `/triagem`
entra no repositório do CRM. `/spec`, `/break`, `/plan`, `/execute` e `/revisildo` ficam
com o mesmo conteúdo nas duas cópias, diferindo só nos caminhos de pasta. A pasta pessoal
ganha versões genéricas de `testes` e `/issue`, sem as partes do CRM (cartão do ClickUp,
banco real do Supabase, pastas por módulo), e o auditor fica disponível lá sem instalar
nada além dos comandos, com a lista de regras só com "segredo no frontend". A seção de
fluxo do `CLAUDE.md` do CRM e a do `CLAUDE.md` pessoal passam a descrever o fluxo novo.

Cobre o módulo 10 da spec.

**Atenção:** esta issue mexe em arquivos fora do repositório (a pasta pessoal da
Marcelle). Eles não entram no git do CRM e o Luan não os recebe.

Depende de F1-05.

## Pronto quando

Em um clone limpo do CRM, a `/triagem` existe. Comparando as duas cópias de cada comando,
a única diferença são os caminhos de pasta. Em um projeto de exemplo fora do CRM, o fluxo
roda de ponta a ponta: `/spec` gera critérios com código, `testes` escreve o teste com o
código, o auditor responde **alinhada** e o `/issue` fecha a issue. Os dois `CLAUDE.md`
descrevem o fluxo novo.

## O que a pesquisa achou

- Na máquina da Marcelle, comando e skill da pasta pessoal têm prioridade sobre os do
  repositório. Sem tratar isso, as versões genéricas de `testes` e `/issue` esconderiam as
  do CRM (que têm o ClickUp, o banco real e o plano de testes dos módulos antigos).
- Solução: toda cópia pessoal começa com um aviso — se o projeto tem o próprio arquivo em
  `.claude/`, leia e siga aquele. No CRM, vale sempre a versão do repositório, para a
  Marcelle e para o Luan.
- Pelo mesmo motivo, o auditor da pasta pessoal precisa ler a configuração e as regras
  versionadas no projeto (`.claude/skills/auditor/auditor.json` e `regras.json`).
- A skill pessoal `feature-flow` é uma versão antiga do fluxo. Não é mexida aqui.

## Cenários

### Happy Path
1. Clone do CRM: `/triagem` existe em `.claude/commands/`.
2. Projeto fora do CRM, sem comandos próprios: valem as cópias pessoais, com `issues/` e a
   spec na raiz como pastas padrão, e o auditor da pasta pessoal.
3. CRM, na máquina da Marcelle: a cópia pessoal carrega, lê o aviso e segue o arquivo do
   repositório.

### Edge Cases
- Projeto sem `issues/README.md`: o `/spec` cria o arquivo e começa pela série `S1`.
- Projeto com regra de mesmo `id` da regra pessoal: vale a do projeto, sem repetir.
- Projeto que não usa Vitest: o auditor não consegue rodar os testes; é preciso trocar
  `comandoTeste` em `.claude/auditor.json` do projeto (limite conhecido).

### Cenário de Erro
- Sobrou caminho do CRM (`pre-desenvolvimento`) numa cópia pessoal: o script de cópia
  falha antes de gravar.

## Banco de Dados

Sem mudança.

## Arquivos

No repositório:

- **Criar:** `.claude/commands/triagem.md` — cópia da `/triagem` pessoal.
- **Modificar:** `.claude/skills/auditor/scripts/auditor.mjs` — configuração e regras do
  projeto valem mais que as da skill de onde o script roda.
- **Modificar:** `src/test/auditor.test.mjs` — testes dessa ordem de configuração.
- **Modificar:** `CLAUDE.md` — seção Workflow descreve o fluxo novo.

Fora do repositório, na pasta pessoal da Marcelle (`~/.claude/`), com cópia de segurança
em `~/.claude/backup-fluxo-2026-10-10/`:

- `commands/spec.md`, `break.md`, `plan.md`, `execute.md` — iguais aos do repositório,
  com as pastas genéricas e o aviso de prioridade do projeto.
- `skills/revisildo/SKILL.md` — idem.
- `skills/auditor/` — o mesmo script, configuração genérica e só a regra de segredo no
  frontend.
- `skills/testes/SKILL.md` e `skills/issue/SKILL.md` — versões genéricas, novas.
- `CLAUDE.md` — seção Workflow descreve o fluxo novo.

## Dependências Externas

Nenhuma.

## Checklist

- [x] `/triagem` no repositório
- [x] Auditor lê a configuração e as regras do projeto quando roda da pasta pessoal
- [x] Cópia de segurança dos arquivos pessoais
- [x] Cópias pessoais de `/spec`, `/break`, `/plan`, `/execute` e `/revisildo`
- [x] Auditor, `testes` e `/issue` na pasta pessoal
- [x] Os dois `CLAUDE.md` atualizados
- [x] Comparação das duas cópias: só caminhos e o aviso diferem
- [x] Fluxo de ponta a ponta num projeto de exemplo fora do CRM
- [x] Testes do auditor passando, lint limpo

## Achado durante a execução

O exemplo fora do CRM mostrou um defeito da F1-05: o histórico de problemas do auditor
ficava em `.claude/auditor-sinais.json`. No CRM essa pasta é ignorada pelo git, mas em
outros projetos o arquivo aparecia como "arquivo fora da issue". O histórico passou a
ficar dentro da pasta `.git` do projeto, onde nunca é versionado nem conta como mudança.
