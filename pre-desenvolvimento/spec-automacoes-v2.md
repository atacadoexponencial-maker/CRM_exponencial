# Spec: Automações v2 — gatilho, condições e ações

## Visão Geral

Hoje uma automação é uma frase só: "quando X, faça Y". Dois gatilhos (card
movido, conversa criada), quatro ações, uma ação por regra, nenhuma condição,
nenhum histórico. Erro morre em silêncio, e a mesma regra pode disparar cem
vezes para o mesmo cliente.

Esta spec descreve **a mudança**: a automação passa a ser
**gatilho → condições → ações**, com várias ações por regra, filtro por texto da
mensagem, gatilhos novos (entre eles a mensagem enviada pelo próprio time),
ações sobre tags, etiquetas e dados do contato, proteção contra disparo
repetido, histórico de execução e execução fora da requisição.

É a **fase 1**. Ficam para a fase 2: gatilho por tempo ("sem resposta há X
horas"), ação "esperar X minutos" e condições com OU.

Referências usadas: Chatwoot (evento → condições → ações), Kommo (gatilho por
mensagem de entrada, de saída ou qualquer, e por palavra-chave), Twenty CRM
(histórico de execuções por regra).

**Premissa registrada:** "automações de informações do lead" foi entendido como
ler e alterar os dados do contato (classificação, tipo, nicho, cidade,
atendente, observações). Se for outra coisa, a spec muda aqui.

Quando a fase 1 entrar no ar, mover este arquivo para `docs/specs-arquivadas/`.

## Vocabulário

- **Regra:** uma automação. Tem nome, está ativa ou pausada, um gatilho, zero ou
  mais condições, uma ou mais ações em ordem, e uma proteção de repetição.
- **Gatilho:** o acontecimento que faz a regra ser avaliada.
- **Condição:** filtro sobre o acontecimento, o contato ou a conversa. Todas as
  condições da regra precisam valer (E).
- **Ação:** o que a regra faz, na ordem em que foi escrita.
- **Execução:** um disparo da regra para um contato, com resultado.

## Páginas / Módulos

### Configurações → Automações (lista)

**Descrição:** lista das regras do workspace, como hoje, mas mostrando a
estrutura nova.

**Componentes:**
- Linha da regra: nome, resumo em uma frase ("Quando o cliente enviar mensagem
  contendo 'catálogo' → aplicar etiqueta Interessado, enviar mensagem"),
  interruptor ativa/pausada, contagem de execuções nos últimos 7 dias, última
  execução.
- Botão "Nova automação".
- Menu por regra: editar, duplicar, ver histórico, excluir.
- Estado vazio com explicação curta e exemplos de regras comuns.

**Comportamentos:**
- Ver todas as regras do workspace, ativas e pausadas.
- Pausar e reativar uma regra pelo interruptor, sem abrir o editor.
- Duplicar uma regra (cópia pausada, com "(cópia)" no nome).
- Excluir uma regra, com confirmação; o histórico dela permanece.
- Abrir o histórico de uma regra.
- Abrir o editor de uma regra.
- Só admin vê e mexe nesta página, como hoje.

### Configurações → Automações → Editor de regra

**Descrição:** onde a regra é montada, em três blocos empilhados: Quando,
Se, Então.

**Componentes:**
- Campo nome.
- Bloco "Quando" (gatilho): seletor do gatilho e, conforme o gatilho, seus
  parâmetros (funil e etapa; tag; etiqueta; campo do contato).
- Bloco "Se" (condições): lista de condições, cada uma com atributo, operador e
  valor; botão "adicionar condição"; texto "todas precisam valer".
- Bloco "Então" (ações): lista ordenada de ações, cada uma com tipo e
  parâmetros; botões adicionar, remover, mover para cima e para baixo.
- Bloco "Repetição": "executar no máximo uma vez por contato", "no máximo uma
  vez a cada N horas por contato" ou "sempre".
- Botão salvar; botão testar com um contato (avalia as condições contra um
  contato escolhido e mostra o que faria, sem executar).

**Comportamentos:**

Gatilhos disponíveis:
- Escolher "Mensagem recebida do cliente": qualquer mensagem, não só a primeira
  da conversa.
- Escolher "Mensagem enviada pelo time": mensagem escrita por uma pessoa no
  chat. Mensagens mandadas por automação, sequência ou campanha nunca contam.
- Escolher "Conversa criada" (como hoje).
- Escolher "Card movido para etapa", com funil e etapa, ou "qualquer etapa"
  (como hoje).
- Escolher "Tag adicionada ao contato", com a tag ou "qualquer tag".
- Escolher "Etiqueta aplicada à conversa", com a etiqueta ou "qualquer".
- Escolher "Dado do contato alterado", com o campo (classificação, tipo, nicho,
  cidade, atendente) e, opcionalmente, o valor novo.

Condições disponíveis:
- Texto da mensagem: contém, não contém, começa com, é igual a, contém alguma
  das palavras (lista separada por vírgula). Ignora maiúsculas e acentos.
  Só aparece nos gatilhos de mensagem.
- Tipo da mensagem: texto, imagem, áudio, vídeo, documento. Só nos gatilhos de
  mensagem.
- Canal da conversa: API Oficial, canal direto, ou um número específico.
- Contato tem a tag / não tem a tag.
- Classificação do contato é / não é.
- Tipo do contato é / não é.
- Conversa tem a etiqueta / não tem.
- Conversa está sem atendente / atendente é.
- Card do contato está no funil e etapa.
- Horário: dentro ou fora do horário comercial do workspace (dias e faixa
  configurados uma vez, em Configurações).
- Adicionar quantas condições quiser; remover qualquer uma.

Ações disponíveis:
- Enviar mensagem de texto, com variáveis {{nome_contato}}, {{nome_vendedor}},
  {{primeiro_nome}}.
- Enviar uma mensagem rápida já cadastrada.
- Enviar imagem ou documento, escolhido no editor e guardado no armazenamento.
- Adicionar tag ao contato; remover tag do contato.
- Aplicar etiqueta à conversa; remover etiqueta da conversa.
- Alterar dado do contato: classificação, tipo, nicho, cidade, ou acrescentar
  uma linha às observações.
- Atribuir atendente; atribuir a um time (o CRM escolhe o atendente do time
  com menos conversas abertas).
- Mover card para etapa de um funil.
- Iniciar uma sequência para o contato.
- Resolver a conversa; reabrir a conversa.
- Ordenar as ações; cada uma roda depois da anterior terminar.

Regras do editor:
- Salvar só com nome, gatilho e pelo menos uma ação válida.
- Ver, ao trocar o gatilho, sumirem as condições que não fazem sentido para
  ele (texto da mensagem fora dos gatilhos de mensagem, por exemplo).
- Testar a regra com um contato: escolher um contato, ver quais condições
  passaram e quais ações seriam feitas, sem executar nada.
- Ver aviso ao salvar uma regra que envia mensagem no gatilho "mensagem
  recebida" sem proteção de repetição ("esta regra vai responder toda mensagem
  deste contato").

### Configurações → Automações → Histórico

**Descrição:** o que cada regra fez, quando, para quem, e se deu certo.

**Componentes:**
- Lista de execuções: data e hora, regra, contato (com link), gatilho que
  disparou, resultado (concluída, ignorada pela proteção de repetição, falhou),
  ações feitas.
- Filtros: por regra, por resultado, por período.
- Detalhe da execução: cada ação com seu resultado e, se falhou, o motivo em
  português.

**Comportamentos:**
- Ver as execuções dos últimos 30 dias de todas as regras.
- Filtrar por regra, por resultado ou por período.
- Abrir o detalhe de uma execução.
- Ver por que uma execução foi ignorada (proteção de repetição) ou por que uma
  ação falhou (número desconectado, contato sem conversa, etiqueta apagada).
- Ver a execução de uma regra que foi excluída, com o nome que ela tinha.

### Motor de automações (o que o usuário não vê)

**Descrição:** como o CRM avalia e executa as regras.

**Comportamentos:**
- Avaliar as regras ativas do workspace toda vez que um gatilho acontece, na
  ordem de criação.
- Aplicar todas as condições; uma condição falsa impede a regra.
- Executar as ações em ordem; se uma ação falha, as seguintes ainda rodam e a
  falha fica no histórico.
- Registrar toda execução, inclusive as ignoradas, no histórico.
- Respeitar a proteção de repetição por contato e regra.
- Nunca deixar uma ação de automação disparar outro gatilho: mensagem enviada
  por automação, sequência ou campanha não conta como "mensagem enviada pelo
  time"; tag, etiqueta, movimento de card e dado alterado por automação não
  disparam regras.
- Executar fora da requisição que disparou: o webhook do WhatsApp e as ações
  do chat respondem na hora, e as regras rodam logo depois, em fila. Uma falha
  na execução nunca derruba o recebimento da mensagem.
- Guardar as regras existentes: as automações de hoje continuam funcionando
  igual depois da mudança, sem o admin precisar recriá-las.

## Fora de escopo (fase 2)

- Gatilho por tempo: "sem resposta do cliente há X horas", "card parado na
  etapa há X dias".
- Ação "esperar X minutos" entre ações.
- Condições com OU e grupos.
- Gatilho por webhook externo e ação "chamar webhook".
- Envio de template da Meta como ação.
