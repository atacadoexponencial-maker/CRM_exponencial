# B11-08: Ações de time, sequência e conversa; condição de horário comercial

**Tipo:** Implementação
**Página:** Editor de fluxo; Motor; Configurações (horário comercial)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

> **Mudança de 07/10/2026:** "atribuir a um time" foi feita antes, na B11-11. As
> condições de conversa (sem atendente, atendente é, card em funil e etapa) já
> vieram na B11-02.

## Descrição

Entram as ações iniciar sequência, resolver conversa e reabrir conversa, e a
condição de horário comercial (dentro/fora), com os dias e a faixa configurados
uma vez em Configurações do workspace.

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), a regra "mensagem recebida fora do horário comercial →
enviar mensagem de ausência, atribuir ao time Entrada" responde à noite e
não responde de dia, e o card do contato fica com um atendente do time.

## Plano (07/10/2026)

### Decisões do plano

O registro está na seção 10 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Onde o horário fica guardado:** numa tabela nova, `business_hours`, com uma
  linha por empresa, no padrão da `alert_config`. Sem linha, vale o padrão: de
  segunda a sexta, das 08:00 às 18:00.
  - **Descartado:** uma coluna em `workspaces`. Essa tabela só tem política de
    leitura, e liberar a escrita para o admin deixaria ele mexer nas outras
    colunas.
- **Uma faixa para todos os dias marcados,** como a spec pede ("dias e faixa").
  O início vem antes do fim, então não há faixa que atravesse a meia-noite.
  Faixa diferente por dia fica para quando alguém pedir.
- **Fuso fixo da operação** (`FUSO_DA_OPERACAO`, São Paulo), o mesmo das telas.
  A Vercel roda em UTC, e sem o fuso escrito, 20h de São Paulo seria 23h.
- **Onde se configura:** botão "Horário comercial" na lista de automações, ao
  lado de "Histórico", que abre um diálogo. Hoje só as automações usam o
  horário. O painel da condição mostra o horário em vigor e onde mudar.
  - **Descartado:** uma página própria no menu de Configurações. Seria mais um
    item no menu por causa de um ajuste que só as automações usam. Se a fila de
    atendimento ou outra tela passar a usar, ele muda de lugar.
- **Iniciar sequência** usa o mesmo `iniciarExecucaoSequencia` do início
  manual. O responsável é o atendente da conversa no momento da ação. Sem
  atendente, a sequência escolhe a cada lembrete, como já faz. (Mudou na
  execução; veja abaixo.)
  - Sequência já em andamento para o contato conta como feita, como a tag que
    ele já tem.
  - Sequência desativada ou apagada conta como falha, com o motivo.
- **Resolver** age na conversa aberta. Sem conversa aberta, não há o que
  resolver, e a ação conta como feita.
- **Reabrir** age na conversa mais recente do contato, porque a conversa
  resolvida não é "aberta" e `conversaDoEvento` não a encontra. Segue a regra
  do chat: com atendente, volta "em atendimento"; sem, "em espera".
- **O "Pronto quando" depende da B11-04** (gatilho "mensagem recebida") e do
  envio pelo chip, que ainda não chegam ao preview. Enquanto isso, o preview
  confere o mesmo comportamento com o gatilho "tag adicionada". Em vez de
  esperar a noite, muda a faixa do horário para o momento do teste ficar dentro
  ou fora dela. A parte da mensagem fica para a B11-04.

### Cenários

#### Happy Path

1. O admin marca o horário comercial: de segunda a sexta, das 08:00 às 18:00.
2. A regra "tag `urgente` adicionada → fora do horário? → sim: atribuir ao time
   Entrada e resolver a conversa" roda fora do horário. A conversa e o card
   ficam com um atendente do time, e a conversa é resolvida.
3. Dentro do horário, a mesma tag segue pelo "não", e nada muda.
4. Outra regra inicia uma sequência escolhida e reabre a conversa.

#### Edge Cases

- **Sábado ou domingo** sem estar marcado: fora do horário em qualquer hora.
- **Exatamente no fim da faixa** (18:00): já está fora. No início (08:00), dentro.
- **Sequência já em andamento** para o contato: feita, sem criar outra.
- **Sequência desativada ou apagada:** falha, com o motivo no histórico.
- **Sequência sem passos:** falha, "Sequência sem etapas".
- **Resolver sem conversa aberta:** feita, porque não muda nada.
- **Reabrir conversa já aberta:** feita. **Reabrir sem conversa nenhuma:** falha,
  "O contato não tem conversa".
- **Horário salvo sem nenhum dia, ou com o fim antes do início:** recusado no
  diálogo e no servidor.

#### Cenário de Erro

- Erro ao ler o horário no banco: a condição não decide, e a regra para com o
  erro no histórico, como nas outras condições.
- Erro ao gravar o horário: o diálogo mostra o erro e o horário antigo fica.

### Banco

Migration só de acréscimo, `20261007000003_business_hours.sql`:

```sql
create table public.business_hours (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  dias smallint[] not null,   -- 0 = domingo … 6 = sábado
  inicio time not null,
  fim time not null,
  updated_at timestamptz not null default now(),
  check (cardinality(dias) between 1 and 7 and dias <@ array[0,1,2,3,4,5,6]::smallint[]),
  check (inicio < fim)
);
```

A RLS segue a das automações: membros leem, admin grava. O motor lê com o
service client.

### Arquivos

- **Criar:** `src/lib/horario-comercial.ts` (puro, usado no servidor e na tela):
  - Tipo `HorarioComercial` e `HORARIO_PADRAO`.
  - `horarioValido`, que confere dias, formato e início antes do fim.
  - `dentroDoHorario(horario, agora)`, no fuso da operação.
  - `descreverHorario`, que escreve, por exemplo, "Seg a Sex, das 08:00 às 18:00".
- **Modificar no motor:**
  - `src/lib/automacoes/verificacoes.ts`: a verificação `horario_comercial`.
  - `src/lib/automacoes/acoes.ts`: as ações `iniciar_sequencia`,
    `resolver_conversa` e `reabrir_conversa`.
  - `src/lib/automacoes/contexto.ts`: recebe `conversaMaisRecente`, que sai de
    `simulacao.ts` para o reabrir usar também.
  - `src/lib/automacoes/referencias.ts`: as sequências citadas no fluxo.
- **Modificar:** `src/lib/sequencias.ts`. Só exporta o texto de "já em
  andamento" como constante, para a ação reconhecê-lo sem repetir a frase.
- **Modificar:** `src/lib/fluxo-automacao.ts`: as 3 ações e a verificação nas
  listas de disponíveis.
- **Modificar nas automações:**
  - `actions.ts`: o servidor confere as sequências do fluxo e a nova
    `salvarHorarioComercial`.
  - `opcoes-editor.ts` e `components/catalogo.ts`: o horário nas opções do
    editor.
  - `lista-client.tsx` e `components/lista-regras.tsx`: o botão.
  - `components/painel-bloco.tsx`: o horário em vigor na condição.
  - Criar `components/dialogo-horario-comercial.tsx`.
- **Testes:**
  - Criar `src/test/horario-comercial.test.ts`.
  - `src/test/automacoes-acoes.test.ts` e
    `src/test/automacoes-verificacoes.test.ts`.
  - Criar `e2e/preview/roteiro-b11-08.cjs`.

### Checklist

- [x] Migration `business_hours` aplicada (depois de `supabase migration list --linked`)
- [x] Horário comercial: funções puras, diálogo e action que grava
- [x] Condição de horário no motor e no painel
- [x] Ações iniciar sequência, resolver e reabrir no motor
- [x] Servidor confere as sequências do fluxo
- [x] Testes automatizados e suíte unitária passando; build com código 0
- [x] Roteiro no preview passando
- [x] Registro de decisões (seção 10)
- [ ] "Pronto quando" com "mensagem recebida" e a mensagem de ausência (espera a B11-04)

## Execução (07/10/2026)

**Aberta só pela parte de mensagem**, como a B11-02. O gatilho "mensagem
recebida" e o envio pelo chip ainda não chegam ao preview (B11-04). Todo o
resto passou pela tela. Falta também a decisão sobre o card (abaixo).

**O que ficou diferente do plano:**

- **Responsável da sequência:** o plano era começar sempre sem responsável.
  Ao ler o motor de sequências, apareceu que a mensagem usa o responsável
  gravado para preencher `{{nome_vendedor}}`, que ficaria em branco. Passou a
  ser o atendente da conversa no momento da ação. Sem atendente, a sequência
  escolhe a cada lembrete, como antes.
- **`contexto.ts` e `simulacao.ts` não mudaram.** O reabrir faz a própria
  consulta da conversa mais recente: devolve "erro ao gravar no banco" como as
  outras ações, em vez de lançar exceção como a busca da simulação.
- **Dois testes antigos** usavam a condição de horário e a ação de iniciar
  sequência como exemplo de "ainda não disponível". Passaram a usar o texto da
  mensagem e a mensagem rápida, que continuam fora.
- **Tipos do Supabase gerados de novo** (`types.ts`), só com a tabela nova.

**Como foi verificado:**

- Suíte unitária com 45 arquivos e 547 testes passando, sendo 26 novos:
  - Horário: conferência, leitura do banco, dentro e fora no fuso de Brasília,
    início e fim da faixa, meia-noite e a frase do painel.
  - A condição no motor.
  - As três ações, com os casos de feita, falha e motivo.
  - As sequências nas referências do fluxo.
- `tsc` limpo. O lint de `src` e `e2e` ficou com 0 erros (os 3 avisos são
  antigos, de telas que não mudaram). Build com código de saída 0.
- **No preview** (commit `f12cf3c`), `e2e/preview/roteiro-b11-08.cjs` passou em
  **8 de 8**, com 2 regras montadas pela tela e disparadas pela tag no perfil:
  - O diálogo grava os 7 dias e a faixa, e o painel da condição mostra "Todos os
    dias, das 00:00 às 23:59".
  - Dentro do horário, a regra segue pelo "não": a conversa da Ana continua
    aberta e sem atendente.
  - Com a faixa trocada para fora do momento do teste, a conversa do Bruno vai
    para o admin, único do time Entrada, e é resolvida.
  - O histórico registra "não" na Ana e "sim" no Bruno.
  - Reabrir devolve a conversa do Bruno para "em atendimento", e a sequência
    começa com o admin como responsável.
  - Nenhum erro no console.

**Ponto em aberto (decisões, seção 10.5):** o "Pronto quando" diz que "o card
do contato fica com um atendente do time". Hoje "atribuir" passa o card só no
gatilho "card movido", como na primeira versão e no chat. Com "mensagem
recebida", o card não mudaria. Falta o Luan decidir entre corrigir a frase ou
fazer "atribuir" passar também o card, e, nesse caso, qual card.
