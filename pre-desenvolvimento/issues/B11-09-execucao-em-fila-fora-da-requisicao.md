# B11-09: Regras executam em fila, fora da requisição do webhook e do chat

**Tipo:** Implementação
**Página:** Motor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-03

## Descrição

O disparo enfileira a avaliação; o webhook do WhatsApp e as actions do chat
respondem na hora. Um processo separado consome a fila, avalia e executa,
gravando no histórico. Falha na fila nunca derruba o recebimento da mensagem.
Decidir na etapa de plano entre fila no Postgres (tabela + cron curto) ou
serviço de fila da plataforma; registrar a decisão na issue.

Cobre, no "Motor", executar fora da requisição.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), com uma regra que envia mensagem, o tempo de resposta do
webhook medido no gateway ou na Meta não muda com a regra ativa; a mensagem da
regra chega em até 30 segundos e aparece no histórico. Derrubar de propósito a
ação (etiqueta apagada) não afeta o recebimento da mensagem.

## Plano (07/10/2026)

### Decisão: fila no Postgres, consumida logo depois da resposta

O registro está na seção 11 de `decisoes/B11-automacoes-em-fluxo.md`.

**Como fica:**

1. O ponto de disparo (webhook, gateway, actions do funil, do contato e do
   chat) grava o evento numa tabela, `automation_queue`, e responde. É um
   insert só, no lugar de rodar as regras.
2. Logo depois da resposta, `after()` do Next (Server Functions e Route
   Handlers) consome a fila daquele contato e roda as regras com o motor de
   hoje (`processarAutomacoes`).
3. **Os eventos de um mesmo contato rodam um de cada vez, na ordem em que
   chegaram.** Uma função no banco (`reivindicar_evento_de_automacao`) entrega
   o próximo evento só quando nenhum outro do contato está rodando. Quem termina
   um evento pega o próximo.
4. O evento que terminou sai da fila. O histórico continua em `automation_runs`.

**Por que a ordem por contato importa:** um cliente manda "oi", "tudo bem?" e
"quanto custa?" em 3 segundos. Rodando em paralelo, as 3 execuções conferem a
proteção "uma vez por contato" ao mesmo tempo, nenhuma enxerga a outra, e a
mensagem de ausência sai 3 vezes. Em fila, a segunda já vê a primeira e é
ignorada.

**Descartado:**

- **Cron curto na Vercel:** os crons do projeto são diários. No plano Hobby, é
  o máximo. No Pro, o mínimo é 1 por minuto, acima dos 30 segundos do "Pronto
  quando".
- **`pg_cron` com `pg_net` no Supabase chamando uma rota do CRM:** o banco é um
  só para produção e preview. O cron chamaria um endereço fixo, e os eventos do
  preview rodariam com o código da produção, ou o contrário. Também exigiria
  guardar a chave da rota dentro do banco.
- **Serviço de fila da plataforma (Vercel Queues):** mais uma dependência paga,
  para um volume que o Postgres atende.
- **Só `after()`, sem tabela:** resolve o tempo de resposta, mas os eventos de
  um mesmo contato rodam em paralelo (o problema acima) e um evento perdido
  numa queda não deixa rastro.

**Limites aceitos:**

- **No máximo uma vez.** Evento que estava rodando quando a função caiu não é
  repetido. Depois de 5 minutos, que é o tempo máximo da função, ele é marcado
  como descartado e para de travar a fila do contato. Repetir poderia mandar a
  mesma mensagem duas vezes.
- **Evento esperando há mais de 10 minutos é descartado,** para a regra não
  responder fora de hora. Só acontece se a função cair entre gravar o evento e
  consumir a fila. Quem consome é o próximo evento do mesmo contato.
- **A tela não mostra na hora o que a automação fez.** Antes, mover o card
  esperava as regras, e a tela recarregada já vinha com a tag da automação.
  Agora a resposta volta antes, e o efeito aparece na próxima atualização. É o
  que a spec pede: "as ações do chat respondem na hora, e as regras rodam logo
  depois".

### Cenários

#### Happy Path

O card é movido, a resposta volta na hora, e a regra roda logo depois. Em
poucos segundos, a etiqueta, a tag e a execução no histórico aparecem.

#### Edge Cases

- **Vários eventos do mesmo contato ao mesmo tempo:** rodam um de cada vez, na
  ordem. Contatos diferentes rodam em paralelo.
- **Evento sem contato:** a fila é a da empresa.
- **Falha ao gravar na fila:** as regras rodam do mesmo jeito, logo depois da
  resposta, só que sem a ordem por contato.
- **Chamado fora de uma requisição** (script ou teste): roda na hora, como antes.
- **Função cai no meio:** o evento é descartado depois de 5 minutos (acima).

#### Cenário de Erro

Uma ação que falha (etiqueta apagada) fica no histórico, e o card continua
movido. Nada da fila volta para quem disparou.

### Banco

Migration só de acréscimo, `20261007000004_automation_queue.sql`:

- Tabela `automation_queue`: `workspace_id`, `chave` (o contato, ou a empresa
  quando o evento não tem contato), `evento` (jsonb), `status` (`pendente`,
  `processando` ou `descartado`), `motivo`, `created_at` e `iniciado_em`.
- RLS ligada e sem política: só o service client lê e grava.
- Função `reivindicar_evento_de_automacao(p_chave)`, executável só pelo service
  role. Ela trava a chave com `pg_advisory_xact_lock`, descarta os eventos
  vencidos e entrega o próximo pendente se nenhum estiver rodando.

### Arquivos

- **Criar:** `src/lib/automacoes/fila.ts`, com `dispararAutomacoes` (grava e
  agenda) e o consumo da fila.
- **Trocar `processarAutomacoes` por `dispararAutomacoes`** nos pontos de
  disparo:
  - `src/app/(auth)/pipeline/actions.ts`
  - `src/app/api/webhooks/whatsapp/route.ts`
  - `src/lib/whatsapp/recebimento.ts`
  - `src/lib/automacoes/gatilhos-do-crm.ts`
- `src/integrations/supabase/types.ts`, gerado de novo.
- **Testes:**
  - Criar `src/test/automacoes-fila.test.ts`.
  - Trocar o mock em `automacoes-gatilhos-do-crm.test.ts`,
    `gateway-recebimento.test.ts` e `gateway-midia-recebida.test.ts`.
- **Roteiros:**
  - `e2e/preview/comum.cjs` ganha uma espera pela fila vazia, e os roteiros a
    usam depois de cada disparo.
  - Criar `e2e/preview/roteiro-b11-09.cjs`, com a função do banco conferida
    direto e a resposta que volta antes das regras.
  - O reset limpa a fila da empresa de teste.

### Checklist

- [x] Migration `automation_queue` aplicada (depois de `supabase migration list --linked`)
- [x] `dispararAutomacoes` e o consumo em ordem por contato
- [x] Pontos de disparo trocados
- [x] Testes automatizados e suíte unitária passando; build com código 0
- [x] Roteiros antigos passando com a fila (B11-10, 11/12, 03, 06, 08)
- [x] Roteiro da B11-09 passando no preview
- [x] Registro de decisões (seção 11)
- [ ] "Pronto quando" com o webhook e o envio de mensagem (espera a B11-04 e o chip)

## Execução (07/10/2026)

> **Atualização de 08/10/2026 (B11-04):** o tempo de resposta do webhook foi
> medido no preview, com mensagens simuladas. A mediana ficou em 801 ms com as
> regras pausadas e em 774 ms com elas ativas, ou seja, sem diferença (decisões,
> seção 11.4). Falta só a mensagem da regra chegando, que precisa do chip
> (B11-07).

**Aberta só pela parte de mensagem**, como a B11-02 e a B11-08. O tempo de
resposta do webhook e a mensagem da regra chegando dependem do gatilho
"mensagem recebida" (B11-04) e do chip. O resto passou.

**O que ficou diferente do plano:**

- **O roteiro não prova que a resposta volta antes das regras.** A ideia era
  conferir se o evento ainda estava na fila quando a resposta chegava. A regra
  leva uns 300 ms e acaba antes de o roteiro consultar, então a verificação não
  dizia nada e saiu (decisões, seção 11.4). Isso fica com os testes da fila e
  com o `after()` do Next.
- **`tela.cjs` passou a esperar a fila esvaziar** depois de mover o card. Os
  roteiros da B11-06 e da B11-08 esperam também depois de adicionar a tag, salvar
  o perfil e aplicar a etiqueta pelo chat.
- **O reset limpa a fila** da empresa de teste.

**Como foi verificado:**

- Suíte unitária com 46 arquivos e 561 testes passando, 8 deles novos, da fila:
  - grava e não roda nada antes da resposta;
  - roda os eventos na ordem que a fila entrega e tira cada um dela;
  - para quando outro evento do contato está rodando;
  - evento sem contato vai para a fila da empresa;
  - sem gravar na fila, roda do mesmo jeito;
  - fora de uma requisição, roda na hora;
  - não lança erro.
- `tsc` limpo e lint sem erros. O build da Vercel passou.
- **No preview** (commit `d1dcd95`), `roteiro-b11-09.cjs` passou em **11 de
  11**:
  - Na função do banco, chamada direto, dois pedidos ao mesmo tempo levaram um
    evento só, o mais antigo.
  - Nada saiu enquanto um evento do contato rodava, e o próximo saiu quando ele
    terminou.
  - Um evento rodando havia mais de 5 minutos foi descartado sem travar a fila.
    Um evento esperando havia mais de 10 minutos foi descartado sem rodar.
  - Pela tela, o card movido respondeu em 1,9 s, e a fila esvaziou 0,5 s depois.
    A etiqueta apagada falhou no histórico, as 4 tags seguintes entraram, e o
    card ficou em Sondagem.
- **Os roteiros antigos passaram com a fila:**
  - B11-10, B11-11/12, B11-03 e B11-06 sem nenhuma falha;
  - B11-08 em 9 de 9;
  - menus em 7 de 7.
