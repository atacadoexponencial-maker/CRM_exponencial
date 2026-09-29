# B10-06: Contatos em páginas de 50 com busca sobre todos

**Tipo:** Implementação
**Página:** Contatos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Limitar a listagem de contatos a 50 por página, com "carregar mais" ou
paginação para o restante, mantendo a busca por nome ou telefone sobre todos
os contatos da empresa e a identidade resolvida uma vez.

Cobre os comportamentos de "Contatos".

## Pronto quando

No CRM publicado, com mais de 50 contatos de teste, a listagem abre com 50,
o restante vem ao pedir mais, e buscar um contato que não está na primeira
página o encontra. Abrir o perfil de um contato segue funcionando.
