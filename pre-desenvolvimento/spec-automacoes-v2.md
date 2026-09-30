# Spec: Automações v2 — fluxo em blocos (gatilho, condições e ações)

## Visão Geral

Hoje uma automação é uma frase só: "quando X, faça Y". Dois gatilhos (card
movido, conversa criada), quatro ações, uma ação por regra, nenhuma condição,
nenhum histórico. Erro morre em silêncio, e a mesma regra pode disparar cem
vezes para o mesmo cliente.

Esta spec descreve **a mudança**: a automação passa a ser um **fluxo de blocos
ligados entre si**, no estilo do N8N. Um bloco de gatilho abre o fluxo; blocos
de condição dividem o caminho em **sim** e **não**; blocos de ação fazem uma
coisa cada. O admin arrasta os blocos, liga um no outro e monta o caminho que
quiser. Entram também o filtro por texto da mensagem, gatilhos novos (entre eles
a mensagem enviada pelo próprio time), ações sobre tags, etiquetas e dados do
contato, proteção contra disparo repetido, histórico de execução e execução
fora da requisição.

É a **fase 1**. Ficam para a fase 2: gatilho por tempo ("sem resposta há X
horas"), bloco "esperar X minutos", caminhos em paralelo e laços (ver "Fora de
escopo").

Referências usadas: N8N (fluxo de blocos ligados, condição com saída
verdadeiro/falso), Chatwoot (evento → condições → ações), Kommo (gatilho por
mensagem de entrada, de saída ou qualquer, e por palavra-chave), Twenty CRM
(histórico de execuções por regra).

**Premissa registrada:** "automações de informações do lead" foi entendido como
ler e alterar os dados do contato (classificação, tipo, nicho, cidade,
atendente, observações). Se for outra coisa, a spec muda aqui.

**Mudança de 30/09/2026:** a primeira versão desta spec (29/09) descrevia um
formulário com três blocos fixos empilhados (Quando, Se, Então) e as ações numa
lista em ordem. Foi trocada pelo fluxo em blocos a pedido do Luan, para permitir
automações com caminhos diferentes conforme o caso. O raciocínio está em
`decisoes/B11-automacoes-em-fluxo.md`.

Quando a fase 1 entrar no ar, mover este arquivo para `docs/specs-arquivadas/`.

## Vocabulário

- **Regra:** uma automação. Tem nome, está ativa ou pausada, tem um fluxo e uma
  proteção de repetição.
- **Fluxo:** o desenho da regra: os blocos e as ligações entre eles.
- **Bloco:** uma peça do fluxo. Há três tipos:
  - **Gatilho:** o acontecimento que faz a regra começar. Todo fluxo tem
    exatamente um, e ele é sempre o início.
  - **Condição:** uma ou mais verificações sobre o acontecimento, o contato ou
    a conversa. Todas precisam valer (E). Tem duas saídas: **sim** (todas
    valeram) e **não** (alguma não valeu).
  - **Ação:** uma coisa que a regra faz. Tem uma saída: o que vem depois.
- **Ligação:** a seta de uma saída de um bloco para a entrada de outro.
- **Caminho:** a sequência de blocos percorrida numa execução, a partir do
  gatilho.
- **Execução:** um disparo da regra para um contato, com o caminho percorrido e
  o resultado de cada bloco.

## Páginas / Módulos

### Configurações → Automações (lista)

**Descrição:** lista das regras do workspace, como hoje, mas mostrando a
estrutura nova.

**Componentes:**
- Linha da regra: nome, resumo em uma frase ("Quando o cliente enviar mensagem
  → 2 condições, 3 ações"), interruptor ativa/pausada, contagem de execuções
  nos últimos 7 dias, última execução.
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

### Configurações → Automações → Editor de fluxo

**Descrição:** onde a regra é montada: uma área livre (canvas) com os blocos e
as ligações, e um painel lateral para configurar o bloco selecionado.

**Componentes:**
- Barra do topo: voltar para a lista, campo nome, proteção de repetição,
  botão "Testar com um contato", botão salvar.
- Canvas: os blocos do fluxo e as setas entre eles. Dá para arrastar a área,
  aproximar e afastar, e centralizar o fluxo.
- Bloco de gatilho: mostra o gatilho escolhido e seus parâmetros em uma frase;
  tem só saída.
- Bloco de condição: mostra as verificações em uma frase; tem uma entrada e as
  saídas "sim" e "não".
- Bloco de ação: mostra a ação e seus parâmetros em uma frase; tem uma entrada
  e uma saída.
- Botão "+" em toda saída sem ligação: abre a escolha do próximo bloco e já o
  cria ligado ali.
- Botão "Adicionar bloco" na barra: cria um bloco solto, para ligar depois.
- Painel do bloco: aparece ao selecionar um bloco. No gatilho, o seletor do
  gatilho e seus parâmetros (funil e etapa; tag; etiqueta; campo do contato).
  Na condição, a lista de verificações, cada uma com atributo, operador e
  valor, o botão "adicionar verificação" e o texto "todas precisam valer". Na
  ação, o tipo e os parâmetros. Em todos, menos no gatilho, o botão remover
  bloco.
- Proteção de repetição: "executar no máximo uma vez por contato", "no máximo
  uma vez a cada N horas por contato" ou "sempre".

**Comportamentos:**

Montar o fluxo:
- Adicionar um bloco pelo "+" de uma saída livre: o bloco novo já nasce ligado
  a ela.
- Adicionar um bloco solto pela barra.
- Ligar dois blocos arrastando de uma saída até a entrada de outro bloco.
- Ligar uma saída que já tinha ligação troca a ligação antiga pela nova (cada
  saída leva a um bloco só).
- Ligar várias saídas à entrada de um mesmo bloco (caminhos que se juntam).
- Ver recusada a ligação que faria o fluxo voltar a um bloco anterior (laço).
- Remover uma ligação.
- Remover um bloco (as ligações dele somem junto). O gatilho não pode ser
  removido.
- Mover os blocos livremente pelo canvas.
- Selecionar um bloco para configurá-lo no painel.

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

Verificações disponíveis no bloco de condição:
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
- Adicionar quantas verificações quiser num bloco; remover qualquer uma.
- Para "uma coisa OU outra": ligar o "não" de uma condição a outra condição.

Ações disponíveis (um bloco por ação):
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

Regras do editor:
- Salvar só com nome, gatilho configurado, pelo menos uma ação ligada ao
  caminho, todos os blocos configurados e nenhum bloco solto. O que impede o
  salvamento fica marcado no próprio bloco.
- Ver, ao trocar o gatilho, marcadas como inválidas as verificações que não
  fazem sentido para ele (texto da mensagem fora dos gatilhos de mensagem, por
  exemplo).
- Testar a regra com um contato: escolher um contato e ver, no próprio canvas,
  o caminho que ele percorreria (qual saída cada condição tomou e quais ações
  seriam feitas), sem executar nada.
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
- Detalhe da execução: o caminho percorrido, bloco a bloco: em cada condição,
  a saída tomada; em cada ação, o resultado e, se falhou, o motivo em
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
- Percorrer o fluxo a partir do gatilho, seguindo as ligações.
- Num bloco de condição, avaliar todas as verificações e seguir pela saída
  "sim" ou "não".
- Num bloco de ação, executar a ação e seguir pela saída dele; se a ação
  falha, o caminho continua e a falha fica no histórico.
- Terminar o caminho quando chega a uma saída sem ligação.
- Registrar toda execução, inclusive as ignoradas, no histórico, com o caminho
  percorrido.
- Respeitar a proteção de repetição por contato e regra.
- Nunca deixar uma ação de automação disparar outro gatilho: mensagem enviada
  por automação, sequência ou campanha não conta como "mensagem enviada pelo
  time"; tag, etiqueta, movimento de card e dado alterado por automação não
  disparam regras.
- Executar fora da requisição que disparou: o webhook do WhatsApp e as ações
  do chat respondem na hora, e as regras rodam logo depois, em fila. Uma falha
  na execução nunca derruba o recebimento da mensagem.
- Guardar as regras existentes: as automações de hoje continuam funcionando
  igual depois da mudança, sem o admin precisar recriá-las. Cada uma vira um
  fluxo de dois blocos: o gatilho dela ligado à ação dela.

## Fora de escopo (fase 2)

- Gatilho por tempo: "sem resposta do cliente há X horas", "card parado na
  etapa há X dias".
- Bloco "esperar X minutos" entre blocos.
- Uma saída ligada a vários blocos ao mesmo tempo (caminhos em paralelo).
- Laços: ligar um bloco de volta a um anterior.
- Verificações com OU dentro do mesmo bloco de condição (na fase 1, o OU se
  monta encadeando condições pelo "não").
- Gatilho por webhook externo e ação "chamar webhook".
- Envio de template da Meta como ação.
