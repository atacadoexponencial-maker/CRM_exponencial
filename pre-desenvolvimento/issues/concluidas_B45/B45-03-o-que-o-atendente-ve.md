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
| PER-B45-12 | Como quase toda conversa nova chega sem responsável, o atendente vê essas conversas ao vivo (fila aberta, quem responde primeiro vira o dono), só ao recarregar, ou não vê (Admin, Gerente e o rodízio distribuem)? | respondida | Fila aberta, ao vivo: a mensagem de conversa sem responsável chega na hora para todos os atendentes da empresa. Marcelle, 27/10/2026 |
| PER-B45-13 | Os cards sem atendente aparecem também no Funil do atendente (necessário para o perfil do contato sem dono mostrar o card)? | respondida | Sim, aparecem no Funil; mover continua só para o dono, Admin e Gerente. Marcelle, 27/10/2026 |

## Cenários

### Happy Path
1. O Atendente Teste abre Contatos: a lista traz os contatos dele e os sem dono (dono = `contacts.atendente_id`). O banco aplica a mesma regra em tudo do contato (tags, compras, notas, campos personalizados), pela função `pode_ver_contato`.
2. Ele abre o perfil de um contato dele ou sem dono: abre, com os cards (cards sem atendente passam a ser visíveis para ele, também no Funil).
3. Ele abre o Chat: a caixa de entrada traz as conversas dele e as sem responsável. Mensagem nova de conversa sem responsável chega ao vivo para todos os atendentes da empresa, por um tópico novo `workspace:<id>:sem-responsavel`.
4. Ele responde uma conversa sem responsável: antes de enviar, o servidor a toma para ele numa gravação só ("só se ainda estiver sem responsável"), e passa o contato, os cards e as outras conversas para ele (`passarContatosPara`, motivo `pelo_chat`). A conversa some do Chat dos outros atendentes no próximo carregamento.
5. Admin e Gerente que respondem não mudam o dono (SUP-B45-04).

### Edge Cases
- Dois atendentes respondem a mesma conversa sem responsável quase juntos: só um ganha a gravação; o outro recebe "Não enviada: outro atendente já está atendendo esta conversa." e nada é enviado.
- O atendente tenta abrir o perfil de contato de colega pelo endereço: "contato não encontrado" (RLS).
- O atendente vê o card sem atendente no Funil, mas não o move: a política de alteração de card continua "dono, Admin ou Gerente".
- O atendente continua sem poder trocar o responsável de uma conversa por conta própria (trigger `conversas_campos_protegidos`); a tomada ao responder é gravada pelo servidor.

### Cenário de Erro
- Se a tomada da conversa falhar no banco, a mensagem não é enviada e a tela mostra "Não enviada: tente de novo em instantes."
- Atendente que tenta atribuir pelos botões recebe o erro de hoje ("Sem permissão para atribuir conversas" / "Sem permissão para atribuir atendente") e nada muda.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B45-12 | automática | `src/test/atendente-ve-os-dele.integration.test.ts` | `listarContatos` como Atendente Teste traz Ana, Luan e Davi e não traz a Carla |
| CA-B45-13 | automática | `src/test/atendente-ve-os-dele.integration.test.ts` | `buscarDadosContato` da Carla como Atendente Teste devolve nada, e as leituras diretas de tags, compras e notas dela voltam vazias |
| CA-B45-14 | automática | `src/test/atendente-ve-os-dele.integration.test.ts` | `listarConversas` como Atendente Teste traz as conversas da Ana e do Davi e não a da Carla |
| CA-B45-20 | automática | `src/test/atendente-ve-os-dele.integration.test.ts` | Depois de `enviarMensagem` do Atendente Teste na conversa do Davi, a conversa, o Davi e o card são dele, o histórico tem a troca "pelo_chat", e a conversa não aparece mais no `listarConversas` do Bruno |
| CA-B45-15 | automática | `src/test/atendente-ve-os-dele.integration.test.ts` | `atribuirConversa` e `atribuirAtendente` chamados pelo Atendente Teste para o Davi são recusados com "Sem permissão" e o Davi continua sem dono |

## Banco de Dados

- Migration `supabase/migrations/20261027000013_atendente_ve_os_dele.sql`:
  - `pode_ver_contato`: Admin/Gerente, ou `contacts.atendente_id` = quem chama, ou sem dono.
  - `pode_ver_conversa`: Admin/Gerente, ou `assigned_to` = quem chama, ou sem responsável.
  - Políticas de `conversations` (leitura e alteração) e de `pipeline_cards` (leitura): o atendente alcança também as linhas sem responsável/sem atendente. A troca de responsável e de atendente continua bloqueada para ele pelos triggers.
  - Política nova em `realtime.messages`: o tópico `workspace:<id>:sem-responsavel` é ouvido por qualquer membro ativo da empresa.

## Arquivos

- **Criar:** `supabase/migrations/20261027000013_atendente_ve_os_dele.sql` — regras do banco acima
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `listarContatos` do atendente passa a ser "dono = ele ou sem dono"
- **Modificar:** `src/app/(auth)/chat/conversas.ts` — `listarConversas` do atendente passa a ser "responsável = ele ou sem responsável"
- **Modificar:** `src/app/(auth)/chat/actions.ts` — no envio (`comMotivo`), o atendente toma a conversa sem responsável e vira o dono do contato, dos cards e das conversas (`passarContatosPara`)
- **Modificar:** `src/lib/whatsapp/realtime.ts` — mensagem de conversa sem responsável vai também para `workspace:<id>:sem-responsavel`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — o atendente ouve também o tópico `workspace:<id>:sem-responsavel`
- **Criar:** `src/test/atendente-ve-os-dele.integration.test.ts` — testes dos CA-B45-12, 13, 14, 15 e 20
- **Modificar:** `src/test/atendente-contatos-seguranca.integration.test.ts` — o contato do teste ganha o atendente do card como dono (sim da Marcelle em 27/10/2026, como os oito abaixo)
- **Modificar:** `src/test/atendente-conversas-seguranca.integration.test.ts` — o contato ganha dono; o atendente passa a ver a conversa sem responsável (fila aberta), a da colega continua escondida
- **Modificar:** `src/test/agenda-busca-segura.integration.test.ts` — os contatos do teste ganham dono
- **Modificar:** `src/test/contatos-lista.integration.test.ts` — os contatos ganham dono; o contato sem dono aparece para os atendentes
- **Modificar:** `src/test/campos-personalizados.integration.test.ts` — os contatos ganham dono; o "outro" é do Admin
- **Modificar:** `src/test/funis-personalizados.integration.test.ts` — os contatos ganham dono; os cards sem atendente aparecem no Funil do atendente (PER-B45-13)
- **Modificar:** `src/test/filtro-contatos-rfv.integration.test.ts` — os contatos fora da carteira do atendente ficam com o Admin
- **Modificar:** `src/test/perfil-rfv-no-contato.integration.test.ts` — os contatos fora da carteira do atendente ficam com o Admin
- **Modificar:** `src/test/chat-tempo-real-credencial.test.tsx` — o atendente ouve também o tópico `sem-responsavel`

## Checklist

- [x] Migration com as funções, as políticas e o tópico novo; aplicada com `npx supabase db push --linked`
- [x] `listarContatos` do atendente: os dele e os sem dono
- [x] `listarConversas` do atendente: as dele e as sem responsável
- [x] Envio pelo atendente toma a conversa sem responsável e passa contato, cards e conversas
- [x] Tempo real: transmitir e ouvir o tópico `sem-responsavel`
- [x] Escrever `src/test/atendente-ve-os-dele.integration.test.ts`
- [x] Rodar os testes de segurança do atendente, do chat, de contatos e do funil (L-05) e o `tsc` (L-07)
