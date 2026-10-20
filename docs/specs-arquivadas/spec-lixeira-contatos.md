# Spec: Excluir lead e contato, com lixeira

> Pedido da Marcelle em 02/10/2026: "eu posso criar um lead de teste e não posso
> excluir". Triagem: **arquitetural** — não existe fluxo de exclusão no sistema, e
> excluir um contato atravessa chat, pipeline, agenda, sequências, campanhas,
> automações e dashboard.

## Visão Geral

Hoje dá para criar lead e contato, mas não dá para tirar nenhum dos dois do sistema:
o lead de teste fica para sempre no funil, e um contato cadastrado errado fica para
sempre na lista. Esta mudança cria a exclusão, com **lixeira**: o que é excluído sai de
todas as telas na hora, fica 30 dias guardado para poder voltar e depois some de vez.

### Decisões da Marcelle (02/10/2026)

| Pergunta | Decisão |
|---|---|
| Quem exclui | **Todos** os papéis — cada um exclui o que já consegue ver (o atendente só os contatos dele) |
| Excluir o card do pipeline | **Leva o contato junto** — card e contato são a mesma exclusão |
| Contato com dois cards (Entrada e Recompra) | **Vai tudo** — o contato e os dois cards; a confirmação avisa |
| Contato com conversa no WhatsApp | **Vai tudo**, com aviso de quantas conversas e mensagens vão junto |
| Definitivo ou lixeira | **Lixeira com restaurar** |
| Prazo da lixeira | **30 dias**, depois apaga de vez sozinho |
| Quem vê a lixeira e restaura/apaga de vez | **Todos** — cada um vê o que já veria fora da lixeira |
| Contato na lixeira manda mensagem | **Sai da lixeira sozinho**, com o histórico, e a conversa aparece no chat |
| Criar lead ou contato com o telefone de um contato na lixeira | **Restaura o antigo** e o lead novo entra ligado a ele (decidido no `/plan` da B13-02, 02/10) |

### Premissas (a confirmar na aprovação)

- **Sequências em andamento** do contato são **encerradas** ao ir para a lixeira e não
  recomeçam ao restaurar (evita mandar a mensagem do dia 5 para alguém que ficou duas
  semanas na lixeira). Lembretes pendentes da agenda vão para a lixeira junto e voltam
  ao restaurar.
- **Campanhas**: contato na lixeira não entra em campanha nova e é pulado em campanha em
  andamento (aparece no relatório como "excluído").
- **Dashboard e alertas**: contato e cards na lixeira **não contam** em nenhum número;
  ao restaurar, voltam a contar.
- **Automações** não disparam para contato na lixeira.
- **Apagar de vez** (manual ou após 30 dias) remove contato, cards, histórico do card,
  notas, conversas, mensagens e os arquivos de mídia dessas mensagens. Não tem volta.

### Regras gerais

- "Excluir" sempre significa **mandar para a lixeira**. Apagar de vez só acontece na
  lixeira (manual) ou automaticamente após 30 dias.
- Toda exclusão pede confirmação, dizendo o que vai junto (cards, conversas, mensagens).
- Quem não poderia ver o contato fora da lixeira também não o vê na lixeira.
- A limpeza automática dos 30 dias não pode ser acionada por ninguém de fora do sistema.

## Páginas / Módulos

### Pipeline — painel do card (`/pipeline` e `/pipeline/recompra`)

**Descrição:** o painel lateral que abre ao clicar num card ganha a opção de excluir.

**Componentes:**
- Botão "Excluir" no painel do card, visualmente separado das ações comuns (cor de
  perigo).
- Diálogo de confirmação: "Excluir <nome do contato>?" com a lista do que vai para a
  lixeira (o card; o outro card, se existir; quantidade de conversas e mensagens) e o
  aviso de que fica 30 dias na lixeira.

**Comportamentos:**
- Clicar em "Excluir": abre o diálogo de confirmação.
- Confirmar: contato e todos os seus cards vão para a lixeira; o painel fecha; o card
  some do quadro na hora, sem recarregar a página.
- Cancelar: fecha o diálogo, nada muda.
- Contato com card nos dois funis: o diálogo avisa "o card no Funil de Recompra também
  vai para a lixeira" (ou o inverso).
- Outro usuário com o mesmo funil aberto: o card some no próximo carregamento do quadro
  (o pipeline não tem tempo real hoje — mover card também só aparece para os outros ao
  recarregar; ajustado no `/plan` da B13-02).
- Falha ao excluir: mensagem de erro no diálogo, nada muda.

### Contatos — lista (`/contatos`)

**Descrição:** a lista ganha a exclusão por contato e o acesso à lixeira.

**Componentes:**
- Ação "Excluir" em cada contato da lista.
- Link "Lixeira" no topo da página, com a quantidade de itens (ex.: "Lixeira (3)").

**Comportamentos:**
- Clicar em "Excluir" num contato: abre o mesmo diálogo de confirmação do pipeline.
- Confirmar: o contato some da lista na hora.
- Busca e filtros da lista nunca mostram contatos na lixeira.
- Clicar em "Lixeira": abre `/contatos/lixeira`.

### Contatos — perfil (`/contatos/[id]`)

**Comportamentos:**
- Botão "Excluir contato" no perfil: abre o mesmo diálogo de confirmação.
- Confirmar: volta para a lista de contatos, sem o contato excluído.
- Abrir pelo endereço o perfil de um contato que está na lixeira: mostra aviso "Este
  contato está na lixeira" com os botões "Restaurar" e "Ir para a lixeira", sem os dados
  editáveis.
- Abrir o perfil de um contato apagado de vez: mostra "Contato não encontrado".

### Lixeira (`/contatos/lixeira`) — página nova

**Descrição:** lista os contatos excluídos que o usuário poderia ver, com o que foi junto
e quanto tempo falta para sumirem.

**Componentes:**
- Lista de contatos na lixeira: nome, telefone, funis dos cards que foram junto, quem
  excluiu, quando, e "apaga em N dias".
- Botão "Restaurar" por contato.
- Botão "Apagar de vez" por contato.
- Estado vazio: "A lixeira está vazia".
- Aviso fixo no topo: "Itens na lixeira são apagados de vez após 30 dias."

**Comportamentos:**
- Ver a lixeira: só os contatos que o usuário veria fora dela (atendente: os dele).
- Restaurar: o contato volta para Contatos, os cards voltam para os mesmos funis e
  etapas, as conversas e mensagens voltam ao chat e os lembretes pendentes voltam à
  agenda; o item sai da lixeira.
- (Corrigido no `/plan` da B13-02: o banco não permite dois contatos com o mesmo telefone
  na empresa, então não existe "outro contato ativo com o mesmo telefone". Criar lead ou
  contato com o telefone de quem está na lixeira restaura o contato — ver Chat.)
- Apagar de vez: pede confirmação ("Esta ação não pode ser desfeita"); confirmar remove
  tudo para sempre e tira o item da lista.
- Contagem regressiva: "apaga em 1 dia", "apaga hoje".

### Chat (`/chat`)

**Comportamentos:**
- Conversas de contato na lixeira não aparecem na caixa de entrada nem na busca.
- Quem está com a conversa aberta no momento da exclusão: a conversa fecha com o aviso
  "Este contato foi excluído".
- Não dá para enviar mensagem para contato na lixeira.
- **Mensagem recebida de contato na lixeira** (pela API Oficial ou pelo canal direto): o
  contato sai da lixeira sozinho, com cards, conversas e histórico, e a conversa aparece
  na caixa de entrada com a mensagem nova, como qualquer mensagem recebida.
- **Criar lead (pipeline) ou contato (Contatos) com o telefone de um contato na lixeira**:
  o contato sai da lixeira com o histórico; o lead novo entra no funil ligado a ele.

### Agenda, Alertas, Sequências, Campanhas, Automações, Dashboard

**Comportamentos:**
- Agenda (`/agenda` e `/agenda/equipe`): lembretes de contato na lixeira não aparecem.
- Alertas (`/alertas`): cards na lixeira não geram nem mostram alerta.
- Sequências: ao excluir, as sequências em andamento do contato são encerradas; nenhuma
  mensagem de sequência é enviada a contato na lixeira.
- Campanhas: contato na lixeira não aparece na seleção de público nem na contagem;
  em campanha em andamento é pulado e aparece no relatório como "excluído".
- Automações: nenhum gatilho dispara para contato ou card na lixeira.
- Dashboard (`/dashboard` e `/dashboard/performance`): números ignoram contatos e cards na
  lixeira; ao restaurar, voltam a contar.

### Limpeza automática (sem tela)

**Comportamentos:**
- Uma vez por dia, tudo o que está na lixeira há mais de 30 dias é apagado de vez
  (mesmo efeito do "Apagar de vez"), inclusive os arquivos de mídia.
- A limpeza só pode ser acionada pelo próprio sistema: uma chamada de fora sem a
  credencial do agendador é recusada. Se isso exigir configurar o segredo do agendador no
  Vercel (`CRON_SECRET`, hoje não configurado), a Marcelle configura antes de a limpeza
  entrar no ar.
- Falha na limpeza de um item não impede os outros; o item fica para a próxima rodada.

## Fora do escopo

- Excluir conversa, mensagem ou etiqueta isoladamente.
- Excluir vários contatos de uma vez (seleção em massa).
- Lixeira para outras coisas (sequências, campanhas, automações, usuários).
- Exportar os dados do contato antes de excluir.
- Mudar o fluxo de exclusão de dados da LGPD/Meta (`/exclusao-de-dados`).
