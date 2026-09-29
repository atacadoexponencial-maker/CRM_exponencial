# B10-08: Sequências predefinidas conferidas uma vez por empresa

**Tipo:** Implementação
**Página:** Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Registrar na empresa que as sequências predefinidas já foram criadas, de modo
que abrir a biblioteca de Sequências não faça mais essa conferência a cada
visita. Empresas antigas que já têm as predefinidas ganham o registro na
migração; empresas novas ganham no cadastro.

Cobre: "Abrir Sequências não recria nem confere sequências predefinidas a cada
visita".

## Pronto quando

No CRM publicado, abrir Sequências não gera consulta de contagem de
predefinidas no log; uma empresa cadastrada do zero continua vendo as
sequências predefinidas na primeira visita.
