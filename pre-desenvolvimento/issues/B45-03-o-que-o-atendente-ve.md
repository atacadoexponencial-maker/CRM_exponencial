# B45-03: O atendente vê os contatos e as conversas dele e os sem dono

**Tipo:** Implementação
**Página:** Contatos (lista e perfil); Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-dono-do-contato.md`

## Descrição

O atendente passa a ver em Contatos, no perfil e no Chat os contatos e as conversas dele mais os sem dono, e não vê os dos colegas. A regra vale também para o que pertence ao contato (tags, compras, notas, campos personalizados). O atendente que responde uma conversa sem responsável vira o dono dela, do contato e dos cards. Os botões de atribuir seguem só com Admin e Gerente. Admin e Gerente seguem vendo a empresa toda. Depende da B45-02 (o dono já alinhado).

## Pronto quando

Na empresa de teste, o Atendente Teste abre Contatos e vê os 5 clientes da carteira dele, o Luan e os contatos sem dono, e não vê os de outro atendente. No Chat ele vê as conversas dele e as sem responsável. Ao responder uma conversa sem responsável, ela passa a ser dele e some do Chat dos outros atendentes.

## Critérios de aceite

- **CA-B45-12** (automática) — Atendente vê em Contatos os dele e os sem dono. Dado o Atendente Teste dono da Ana e do Luan, o Bruno dono da Carla, e o contato "Davi" sem dono, quando o Atendente Teste abre Contatos, então a lista tem a Ana, o Luan e o Davi, e não tem a Carla
- **CA-B45-13** (automática) — Atendente não abre o contato de colega. Dado a Carla, do Bruno, quando o Atendente Teste tenta abrir o perfil da Carla pelo endereço ou ler as tags, compras e notas dela, então o perfil não abre (contato não encontrado) e nada da Carla é devolvido
- **CA-B45-14** (automática) — Atendente vê no Chat as conversas dele e as sem responsável. Dado a conversa da Ana com o Atendente Teste, a da Carla com o Bruno e a do Davi sem responsável, quando o Atendente Teste abre o Chat, então a caixa de entrada tem a conversa da Ana e a do Davi, e não tem a da Carla
- **CA-B45-20** (automática) — Atendente que responde conversa sem responsável vira o dono. Dado o Davi, sem dono, com a conversa sem responsável e um card na Entrada sem atendente, quando o Atendente Teste manda uma mensagem na conversa do Davi, então a conversa, o Davi e o card dele passam a ser do Atendente Teste, o histórico de carteira registra a troca, e a conversa some do Chat dos outros atendentes
- **CA-B45-15** (automática) — Atribuir pelos botões continua só com Admin e Gerente. Dado o Davi, sem dono, com a conversa sem responsável, quando o Atendente Teste tenta atribuir a conversa ou o card do Davi a si mesmo, então a tela recusa ("Sem permissão") e o Davi continua sem dono

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B45-04 | Só o Atendente vira dono ao responder conversa sem responsável. Admin e Gerente que respondem não mudam o dono (CA-B45-20) | confirmada | Marcelle, 27/10/2026 ("não vira dono") |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B45-04 | O atendente vê contato sem dono? | respondida | Sim, em Contatos e no Chat. Marcelle, 27/10/2026 |
| PER-B45-05 | O atendente pode pegar para si um contato sem dono? | respondida | Não pelos botões de atribuir, que ficam com Admin e Gerente; responder a conversa sem responsável faz dele o dono (PER-B45-07). Marcelle, 27/10/2026 |
| PER-B45-07 | O atendente que responde uma conversa sem responsável vira o dono dela e do contato? Se sim, ele "pega para si" ao responder, o que esbarra na PER-B45-05. Se não, o contato segue sem dono até o Admin ou o Gerente atribuir | respondida | Sim, vira dono: da conversa, do contato e dos cards (CA-B45-20). Os botões de atribuir seguem só com Admin e Gerente. Marcelle, 27/10/2026 |
