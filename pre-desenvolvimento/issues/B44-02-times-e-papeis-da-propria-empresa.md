# B44-02: Times e papéis só da própria empresa, com Admin e dono protegido

**Tipo:** Implementação
**Página:** Configurações → Usuários
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O Admin só coloca em times gente e times da própria empresa, pode dar o papel Admin ao editar e ao cadastrar, rebaixa ou desativa outro Admin, e ninguém mexe no dono da empresa pela tela.

## Pronto quando

Em Configurações → Usuários o papel Admin aparece na edição e no cadastro, o dono da empresa não pode ser rebaixado nem desativado (aviso "O dono da empresa não pode ser alterado"), e pedir para pôr alguém de outra empresa num time é recusado.

## Critérios de aceite

- **CA-B44-05** (automática) — Admin não coloca usuário de outra empresa em time. Dado as empresas A e B, cada uma com um usuário e um time, quando o Admin de A pede para pôr o usuário de B num time (de A ou de B), então o pedido é recusado e os times de B ficam iguais
- **CA-B44-06** (automática) — Admin não põe usuário seu em time de outra empresa. Dado as empresas A e B, quando o Admin de A pede para pôr um usuário de A num time de B, então o pedido é recusado e nenhum vínculo novo aparece
- **CA-B44-07** (automática) — Admin ajusta os times de alguém da própria empresa. Dado um usuário de A num time de A, quando o Admin de A marca outro time de A e desmarca o primeiro, então o usuário passa a estar só no time novo
- **CA-B44-08** (automática) — Admin promove outra pessoa a Admin. Dado um Gerente da empresa A, quando o Admin de A muda o papel dele para Admin, então a lista de usuários mostra a pessoa como Admin, e ela passa a ver as configurações que só o Admin vê
- **CA-B44-09** (automática) — Admin cadastra uma pessoa já como Admin. Dado o Admin de A na tela de cadastro de usuário, quando ele cadastra alguém com o papel Admin, então a pessoa aparece na lista como Admin da empresa A
- **CA-B44-10** (automática) — Papel que não existe é recusado. Dado o Admin de A, quando a edição de papel ou o cadastro recebe um papel que não é Admin, Gerente nem Atendente, então o pedido é recusado com aviso e nada muda
- **CA-B44-43** (automática) — Ninguém rebaixa nem desativa o dono da empresa. Dado a empresa A, com o dono (quem a cadastrou) e um segundo Admin promovido depois, quando o segundo Admin tenta mudar o papel do dono para Gerente ou Atendente, ou desativá-lo, então a tela avisa "O dono da empresa não pode ser alterado", e o dono continua Admin e ativo
- **CA-B44-44** (automática) — Admin rebaixa e desativa outro Admin que não é o dono. Dado a empresa A, com o dono e um segundo Admin, quando o dono muda o papel do segundo Admin para Gerente e depois o desativa, então a lista mostra a pessoa como Gerente e depois como desativada

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-09 | O "dono da empresa" é o Admin criado junto com a empresa na tela `/cadastro`. Hoje o banco não guarda isso, então a série passa a guardar, e nas empresas que já existem o dono é o Admin mais antigo | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B44-01 | Agora que Admin pode promover outra pessoa a Admin: um Admin pode rebaixar ou desativar outro Admin, inclusive o admin principal (atacadoexponencial@gmail.com)? Hoje pode, só não consegue mexer em si mesmo | respondida | Marcelle, 27/10/2026: **só o dono é protegido.** Admin rebaixa ou desativa outro Admin, menos o dono da empresa (quem fez o cadastro da empresa). O dono só muda pelo suporte (CA-B44-43, CA-B44-44) |
