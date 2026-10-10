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
