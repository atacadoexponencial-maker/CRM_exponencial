# B51-02: Cadastro só com convite

**Tipo:** Implementação
**Página:** `/cadastro`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-cadastro-por-convite.md`

## Descrição

A tela e a ação de cadastro passam a exigir um convite válido: sem ele, aviso no lugar do formulário; com ele, o cadastro de hoje, gastando o convite uma vez só.

## Pronto quando

`/cadastro` sem link mostra o aviso de cadastro por convite; com um link criado na B51-01 a empresa nasce, e o mesmo link depois disso cai no aviso de convite inválido.

## Critérios de aceite

- **CA-B51-01** (automática) — Sem convite não há formulário. Dado um visitante sem login, quando ele abre `/cadastro` sem link de convite, então a tela diz que o cadastro é feito por convite e não mostra o formulário.
- **CA-B51-02** (automática) — Convite que não vale mostra aviso. Dado um convite vencido, um já usado, um cancelado e um código que não existe, quando o visitante abre `/cadastro` com cada um deles, então a tela diz que o convite não vale mais e que é preciso pedir outro, e não mostra o formulário (a mesma mensagem para os quatro casos).
- **CA-B51-03** (automática) — Convite para e-mail trava o e-mail. Dado um convite válido para `ana@exemplo.com`, quando o visitante abre o link, então o formulário aparece com `ana@exemplo.com` no campo de e-mail, que não pode ser editado.
- **CA-B51-04** (automática) — Servidor recusa e-mail diferente do convite. Dado um convite válido para `ana@exemplo.com`, quando alguém envia o cadastro com esse convite e o e-mail `outro@exemplo.com` (mesmo contornando a tela), então nenhuma conta nem empresa é criada, e o convite continua valendo.
- **CA-B51-05** (automática) — Link avulso aceita qualquer e-mail. Dado um link avulso válido, quando o visitante preenche o formulário com o e-mail dele e envia, então a empresa e o Admin são criados, e a pessoa entra no CRM.
- **CA-B51-06** (automática) — Convite serve uma vez só. Dado um convite que acabou de ser usado num cadastro, quando alguém tenta cadastrar outra empresa com o mesmo convite, então o cadastro é recusado e nenhuma conta nova é criada.
- **CA-B51-07** (automática) — Dois cadastros ao mesmo tempo com o mesmo convite. Dado um convite válido, quando dois cadastros com ele chegam ao mesmo tempo, então só um cria empresa; o outro é recusado e não deixa usuário solto no Auth.
- **CA-B51-08** (automática) — Cadastro sem convite recusado no servidor. Dado alguém que chama a ação de cadastro direto, sem convite ou com convite inventado, quando ela é executada, então nenhuma conta nem empresa é criada.
- **CA-B51-09** (automática) — Falha no cadastro não gasta o convite. Dado um link avulso válido, quando o cadastro falha porque o e-mail já tem conta, então a tela avisa que o e-mail está em uso e o link continua valendo para outra tentativa.
- **CA-B51-10** (automática) — Proteções de hoje continuam. Dado um convite válido, quando o cadastro chega sem a conferência de que é uma pessoa, ou depois de passar do limite de cadastros por hora, então é recusado como hoje, e o convite continua valendo.
- **CA-B51-19** (automática) — Cancelar convite. Dado um convite pendente, quando Luan o cancela, então a lista mostra "cancelado" e o link dele cai no aviso de convite inválido (CA-B51-02).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B51-01 | Os quatro casos de convite que não vale (vencido, usado, cancelado, inventado) mostram a mesma mensagem, para não dizer a quem tem um link alheio o que aconteceu com ele | confirmada | Mesma mensagem (Luan, 29/10/2026) |
| SUP-B51-04 | O banco de teste também usa o cadastro por convite, com os mesmos dois e-mails da plataforma, e os testes automáticos não mandam e-mail de verdade | confirmada | Sim, o banco de teste também exige convite (Luan, 29/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B51-01 | Os dois formatos de convite (para um e-mail e link avulso) existem? | respondida | Sim, os dois (Luan, 29/10/2026) |
| PER-B51-04 | O botão da landing muda nesta série? | respondida | Não; depende de conversa com a Marcelle (Luan, 29/10/2026) |
