# B51-03: Convite por e-mail (Resend)

**Tipo:** Implementação
**Página:** `/plataforma/convites` e e-mail do convite
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-cadastro-por-convite.md`

## Descrição

Convite com e-mail: o CRM recusa e-mail que já tem conta, manda o e-mail do convite pelo Resend e o reenvia ao gerar link novo; se o envio falha, mostra o link para mandar por outro meio.

## Pronto quando

Marcelle cria um convite para um e-mail, o e-mail chega com o botão que abre `/cadastro` com o e-mail já preenchido e travado.

## Critérios de aceite

- **CA-B51-13** (automática) — Convite para e-mail manda o e-mail. Dado Marcelle na tela de convites, quando ela cria um convite para `ana@exemplo.com` com validade de 7 dias, então um e-mail sai para `ana@exemplo.com` com o link do convite, o link aparece para copiar, e a lista mostra o convite pendente, vencendo daqui a 7 dias.
- **CA-B51-17** (automática) — E-mail que já tem conta. Dado um e-mail que já tem conta no CRM, quando Marcelle tenta criar um convite para ele, então a tela avisa que esse e-mail já tem conta e nenhum convite é criado.
- **CA-B51-18** (automática) — E-mail que não saiu. Dado o envio de e-mail fora do ar, quando Marcelle cria um convite para um e-mail, então o convite é criado, a tela avisa que o e-mail não saiu e mostra o link para ela mandar por outro meio.
- **CA-B51-20** (automática) — Gerar link novo. Dado um convite pendente para um e-mail, quando Marcelle gera um link novo para ele, então o link anterior cai no aviso de convite inválido, o novo abre o formulário, e o e-mail é enviado de novo com o link novo.
- **CA-B51-22** (manual) — E-mail chega e abre o cadastro. Dado um convite criado na produção para um e-mail do Luan, quando o Luan abre a caixa de entrada, então o e-mail chegou na caixa de entrada (não no spam), com o remetente e o texto combinados (remetente "crmatacado exp" <convite@disparos.atacadoexponencial.com>), e o botão abre `/cadastro` com o e-mail já preenchido.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B51-02 | O link só aparece para copiar logo depois de criado; para mandar de novo, gera-se um link novo e o anterior para de funcionar | confirmada | Sim, link novo a cada reenvio (Luan, 29/10/2026) |
| SUP-B51-04 | O banco de teste também usa o cadastro por convite, com os mesmos dois e-mails da plataforma, e os testes automáticos não mandam e-mail de verdade | confirmada | Sim, o banco de teste também exige convite (Luan, 29/10/2026) |
| SUP-B51-05 | Gerar link novo para um convite pendente mantém a validade dele; para prorrogar, cria-se outro convite | confirmada | Mantém a validade (Luan, 29/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B51-01 | Os dois formatos de convite (para um e-mail e link avulso) existem? | respondida | Sim, os dois (Luan, 29/10/2026) |
| PER-B51-06 | Qual é o remetente do e-mail (nome e endereço)? | respondida | "crmatacado exp" <convite@disparos.atacadoexponencial.com> (Luan, 29/10/2026) |
