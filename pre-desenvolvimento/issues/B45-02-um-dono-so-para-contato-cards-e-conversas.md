# B45-02: Um dono só para contato, cards e conversas

**Tipo:** Implementação
**Página:** Chat (atribuir e transferir); Funil (atendente do card); Relatórios → Carteiras; Automações (ação "atribuir atendente")
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-dono-do-contato.md`

## Descrição

O dono do contato (a carteira) passa a ser o mesmo atendente dos cards e das conversas desse contato. Atribuir em qualquer lugar (no Chat, no card, em Relatórios → Carteiras ou por automação) muda os três juntos, e a troca entra no histórico de carteira. Os contatos que hoje têm dono num lugar e outro atendente em outro ficam alinhados.

## Pronto quando

Na empresa de teste, o Admin atribui no Chat a conversa do Luan ao Atendente Teste, e o perfil do Luan, os cards dele e o histórico em Relatórios → Carteiras passam a mostrar o Atendente Teste. O mesmo vale ao trocar o atendente num card, mexer na carteira ou rodar a automação. Nenhum contato tem a conversa com um atendente e a carteira com outro.

## Critérios de aceite

- **CA-B45-06** (automática) — Atribuir a conversa no Chat faz do atendente o dono do contato. Dado o contato "Luan", sem dono, com um card na Entrada e um na Recompra, e a conversa sem responsável, quando o Admin atribui a conversa ao Atendente Teste no Chat, então o Luan passa a ser do Atendente Teste: o perfil mostra o Atendente Teste como atendente, os dois cards mostram o mesmo atendente, e o histórico de carteira registra a troca
- **CA-B45-07** (automática) — Transferir a conversa leva o contato junto. Dado o contato "Luan", do Atendente Teste, com a conversa com ele, quando o Atendente Teste transfere a conversa para o colega Bruno, então o Luan, os cards dele e a conversa passam a ser do Bruno, e o histórico de carteira registra a troca
- **CA-B45-08** (automática) — Atribuir no card leva os outros cards e a conversa junto. Dado o contato "Ana", com um card na Entrada, um na Recompra e a conversa com o Bruno, quando o Admin escolhe o Atendente Teste como atendente do card da Entrada, então a Ana, o card da Recompra e a conversa passam a ser do Atendente Teste
- **CA-B45-09** (automática) — Mudar a carteira leva os cards e as conversas junto. Dado a Ana e o Luan, do Bruno, cada um com card e conversa com o Bruno, quando o Admin transfere a carteira do Bruno para o Atendente Teste em Relatórios → Carteiras, então os cards e as conversas da Ana e do Luan passam a ser do Atendente Teste; e quando o Admin remove a Ana da carteira, ela, os cards e a conversa dela ficam sem dono
- **CA-B45-10** (automática) — Automação que atribui atendente leva a conversa junto. Dado uma automação com a ação "atribuir atendente: Atendente Teste" e o contato "Ana", com a conversa com o Bruno, quando a automação roda para a Ana, então a Ana, os cards dela e a conversa passam a ser do Atendente Teste
- **CA-B45-11** (automática) — Contatos antigos ficam com um dono só. Dado o contato "Luan", sem dono, com a conversa com o Atendente Teste, e o contato "Ana", do Bruno, com a conversa com o Atendente Teste, quando a mudança entra no ar, então o Luan passa a ser do Atendente Teste, e a conversa da Ana passa para o Bruno, que é o dono dela

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-01 | Nos contatos que hoje têm dono num lugar e outro atendente na conversa, vale o dono do contato (a carteira), e a conversa passa para ele (CA-B45-11). Contato sem dono que tem conversa com alguém passa a ser de quem está na conversa | confirmada | Marcelle, 27/10/2026 ("pode ser, são só testes") |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-01 | O que é o dono do contato? | respondida | Um dono só para lead e cliente (a carteira), e "o atendente é dono do que está atribuído a ele". Marcelle, 27/10/2026 |
| PER-B45-02 | Atribuir ou transferir a conversa no Chat muda o dono do contato? | respondida | Sim, tudo junto: conversa, cards e dono do contato. Marcelle, 27/10/2026 |
