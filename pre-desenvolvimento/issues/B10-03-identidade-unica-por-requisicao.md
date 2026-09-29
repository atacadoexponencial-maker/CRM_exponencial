# B10-03: Usuário e perfil resolvidos uma vez por requisição

**Tipo:** Implementação
**Página:** Servidor por trás de todas as páginas; Sequências, Campanhas e Configurações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** nada (mas B10-04 a B10-08 se apoiam nela)

## Descrição

Criar um único ponto que resolve quem é o usuário logado e qual o seu perfil
(papel, nome, empresa), compartilhado por tudo que roda na mesma requisição, e
substituir por ele as buscas repetidas espalhadas pelo menu lateral e pelas
páginas mais simples: Perfil, Sequências, Campanhas e todas as Configurações
(incluindo WhatsApp, cujos três blocos passam a carregar em paralelo com a
identidade resolvida uma vez só). As quatro cópias locais de "perfil atual"
passam a usar esse ponto.

Cobre: identidade e perfil buscados no máximo uma vez por requisição; consultas
independentes ao mesmo tempo; menu lateral reaproveita a identidade; página de
WhatsApp em paralelo.

## Pronto quando

Abrindo Perfil, Sequências, Campanhas ou qualquer Configuração no CRM
publicado, o log do servidor mostra uma única busca de usuário e uma única de
perfil por requisição, e as páginas se comportam exatamente como antes para
admin, gerente e atendente.
