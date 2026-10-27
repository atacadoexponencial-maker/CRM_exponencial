# B44-11: Funções do banco fechadas ao público e cadastro público desligado

**Tipo:** Implementação
**Página:** Banco de dados; painel do Supabase
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

As funções de recalcular classificação e de conferir lixeira deixam de responder a quem chama de fora do CRM, e o cadastro público do Supabase Auth é conferido como desligado no painel.

## Pronto quando

Um visitante sem login ou um usuário de outra empresa não consegue usar essas funções nem descobrir se um contato de outra empresa está na lixeira; a lixeira e a classificação continuam funcionando nas telas; o painel mostra o cadastro público desligado e `/cadastro` continua criando empresas.

## Critérios de aceite

- **CA-B44-39** (automática) — Visitante sem login não chama as funções. Dado um visitante com a chave pública e sem login, quando ele chama a função de recalcular classificação ou as de conferir lixeira, então o banco recusa
- **CA-B44-40** (automática) — Usuário de outra empresa não descobre se um contato está na lixeira. Dado um contato da empresa B na lixeira e um usuário logado da empresa A que sabe o código desse contato, quando ele chama direto a função que confere lixeira, ou a de recalcular a classificação, com esse código, então o banco recusa ou não responde nada sobre o contato de B, e a classificação dele fica igual
- **CA-B44-41** (automática) — Lixeira e classificação continuam funcionando nas telas. Dado a empresa A com um contato na lixeira e um card que muda a classificação de outro contato, quando o Gerente abre a lixeira, restaura o contato e move o card, então a lixeira mostra e restaura o contato, e a classificação muda, como hoje
- **CA-B44-42** (manual) — Cadastro público desligado no Supabase Auth. Dado o painel do Supabase do projeto, quando a Marcelle (ou o Luan) abre as configurações de Auth, então "Allow new users to sign up" está desligado, e uma empresa nova ainda consegue se cadastrar pela tela `/cadastro` do CRM

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
