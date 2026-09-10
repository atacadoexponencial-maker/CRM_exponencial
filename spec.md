# Spec: Gateway WhatsApp Próprio (Canal Não-Oficial)

## Visão Geral

O CRM Exponencial hoje só conversa com o WhatsApp pela API Oficial da Meta. Isso
impõe ao cliente um onboarding longo (verificação de negócio, criação de conta
WhatsApp Business, aprovação de templates), custo por conversa e a restrição da
janela de 24 horas.

Este projeto entrega um **canal alternativo completo**: um serviço próprio,
operado por nós, que conecta o número de WhatsApp do cliente por leitura de QR
Code e passa a enviar e receber mensagens em nome dele. Do ponto de vista do
usuário do CRM, tudo funciona igual — mesma caixa de entrada, mesmo pipeline,
mesmas automações, mesmas campanhas — muda apenas a origem do número.

**Para quem é:** atacadistas que vendem por WhatsApp e não querem (ou não
conseguem) passar pelo processo da Meta, e clientes que querem reduzir custo por
conversa.

**Problema que resolve:** elimina a maior fricção de entrada do produto e o
custo por mensagem, mantendo todos os módulos já entregues funcionando.

O sistema tem duas partes:

- **Gateway** — serviço independente, hospedado e operado por nós, que mantém as
  conexões vivas com o WhatsApp e expõe uma interface própria para o CRM.
- **CRM** — passa a tratar "provider" como uma característica de cada número
  conectado, permitindo que o mesmo workspace tenha números na Meta e números no
  gateway ao mesmo tempo.

**Decisões já tomadas:**

- Nós hospedamos e operamos o gateway. O cliente nunca vê infraestrutura — só lê
  um QR Code dentro do CRM.
- O canal não-oficial é alternativa **completa** à API oficial: atende Chat,
  Pipeline, Sequências, Automações, Expansão e Campanhas.
- Meta e gateway coexistem **por número**, não por workspace.
- Grupos (Módulo 6) ficam para uma spec posterior. O gateway nasce capaz de
  grupos, mas nada de grupos é exposto agora.

**Risco assumido explicitamente:** o canal não-oficial opera fora dos Termos de
Serviço do WhatsApp e o número do cliente pode ser banido, com risco maior em
disparo em massa e mensagem para desconhecido. Como o escopo escolhido inclui
Campanhas e Expansão, os módulos de **Fila e Ritmo de Envio** e **Saúde e Risco
do Número** são parte obrigatória da entrega, não melhorias futuras.

---

## Páginas / Módulos

# PARTE A — Gateway

### A1. Gestão de Instâncias

**Descrição:** Cada número de WhatsApp conectado é uma "instância" isolada
dentro do gateway. Este módulo cuida do ciclo de vida dessas instâncias, desde a
criação até a remoção definitiva, garantindo que uma instância nunca enxergue os
dados de outra.

**Componentes:**
- Registro de Instância: identificação da instância, workspace dono, número
  associado, estado atual e datas de criação e última conexão
- Estado da Instância: um entre aguardando pareamento, conectando, conectada,
  desconectada, banida, removida
- Credencial de Acesso: chave secreta por instância, usada pelo CRM para
  autorizar chamadas referentes àquele número
- Depósito de Sessão: armazenamento durável das credenciais de sessão do
  WhatsApp, preservado entre reinícios do serviço

**Comportamentos:**
- Criar uma instância vinculada a um workspace
- Consultar o estado atual de uma instância
- Listar todas as instâncias de um workspace
- Desconectar uma instância mantendo a sessão salva para reconexão
- Encerrar a sessão de uma instância no aparelho do cliente (logout)
- Remover uma instância e apagar definitivamente sua sessão e seus dados
- Recuperar automaticamente as instâncias conectadas após reinício do serviço
- Rejeitar qualquer chamada cuja credencial não corresponda à instância alvo
- Impedir que um workspace crie instâncias acima do limite contratado

### A2. Pareamento e Conexão

**Descrição:** Como o cliente autoriza o gateway a agir em nome do seu número.
Substitui todo o fluxo de cadastro da Meta por uma leitura de QR Code.

**Componentes:**
- Código de Pareamento Visual: representação do QR Code a ser lido pelo aplicativo
  do cliente, com prazo de validade
- Código de Pareamento por Número: alternativa em que o cliente digita um código
  no aplicativo, para casos em que a leitura do QR falha
- Contador de Expiração: tempo restante antes do código atual perder validade
- Registro de Reconexão: histórico de quedas e restabelecimentos da conexão

**Comportamentos:**
- Solicitar um novo código de pareamento visual para uma instância
- Solicitar um código de pareamento por número de telefone
- Renovar automaticamente o código quando ele expira sem ter sido lido
- Detectar que o pareamento foi concluído e mudar o estado para conectada
- Registrar o número e o nome de exibição confirmados após o pareamento
- Reconectar automaticamente quando a conexão cai, com espera progressiva entre
  tentativas
- Distinguir queda temporária de sessão encerrada pelo cliente no aparelho
- Marcar a instância como banida quando o WhatsApp recusa a sessão por bloqueio
- Parar de tentar reconectar quando a sessão foi encerrada ou banida

### A3. Recebimento de Mensagens

**Descrição:** Captura tudo o que chega ao número conectado e converte para um
formato único, igual ao que o CRM já consome do webhook da Meta, para que o
restante do sistema não precise saber a origem.

**Componentes:**
- Evento de Mensagem Recebida: remetente, conteúdo, tipo, data e identificador
  único da mensagem
- Evento de Atualização de Status: confirmação de entrega, leitura ou falha de
  uma mensagem enviada anteriormente
- Formato Normalizado: estrutura única de evento, idêntica para qualquer provider
- Registro de Mensagens Processadas: controle para não entregar a mesma mensagem
  duas vezes ao CRM

**Comportamentos:**
- Receber mensagem de texto
- Receber mensagem de imagem com legenda
- Receber mensagem de áudio e de mensagem de voz
- Receber mensagem de vídeo com legenda
- Receber mensagem de documento com nome do arquivo
- Receber figurinha
- Receber localização
- Receber cartão de contato
- Receber reação a uma mensagem
- Receber mensagem que responde a outra mensagem, preservando a referência
- Receber aviso de mensagem editada pelo remetente
- Receber aviso de mensagem apagada pelo remetente
- Receber confirmação de entrega de uma mensagem enviada
- Receber confirmação de leitura de uma mensagem enviada
- Descartar mensagens vindas de conversas de grupo, sem erro
- Descartar mensagens enviadas pelo próprio número em outro aparelho, quando
  duplicadas
- Ignorar uma mensagem já processada anteriormente
- Converter qualquer tipo recebido para o formato normalizado antes de entregar
- Registrar como tipo desconhecido, sem falhar, qualquer mensagem de tipo não
  previsto

### A4. Envio de Mensagens

**Descrição:** Interface pela qual o CRM pede o envio de mensagens. Toda saída
passa obrigatoriamente pela fila do módulo A6 antes de chegar ao WhatsApp.

**Componentes:**
- Pedido de Envio: instância de origem, destinatário, tipo e conteúdo
- Comprovante de Envio: identificador único da mensagem, usado para casar as
  confirmações de entrega e leitura recebidas depois
- Resultado do Envio: aceito na fila, enviado, recusado ou falhado, com motivo

**Comportamentos:**
- Enviar mensagem de texto
- Enviar imagem com legenda
- Enviar vídeo com legenda
- Enviar áudio como mensagem de voz
- Enviar documento com nome de arquivo
- Enviar figurinha
- Enviar mensagem que responde a outra mensagem
- Enviar reação a uma mensagem recebida
- Marcar uma conversa como lida
- Sinalizar que o atendente está digitando
- Sinalizar que o atendente parou de digitar
- Verificar se um número existe no WhatsApp antes de enviar
- Recusar o envio quando a instância não está conectada, informando o motivo
- Recusar o envio quando o destinatário não tem WhatsApp
- Devolver o identificador único da mensagem para o CRM registrar

### A5. Mídia

**Descrição:** Mídia trafega criptografada no WhatsApp. Este módulo cuida de
baixar e decifrar o que chega, e de preparar e enviar o que sai, entregando ao
CRM sempre um arquivo utilizável.

**Componentes:**
- Arquivo Recebido: conteúdo decifrado, tipo, tamanho e nome original
- Endereço de Acesso: referência temporária pela qual o CRM obtém o arquivo
- Limite de Tamanho: teto por tipo de mídia, alinhado ao que o WhatsApp aceita

**Comportamentos:**
- Baixar e decifrar automaticamente a mídia de uma mensagem recebida
- Disponibilizar o arquivo decifrado ao CRM por um endereço de acesso temporário
- Gerar miniatura de imagem e de vídeo para exibição na caixa de entrada
- Receber um arquivo do CRM e prepará-lo para envio
- Recusar arquivo acima do limite de tamanho, informando o limite
- Recusar tipo de arquivo não suportado pelo WhatsApp
- Reprocessar o download quando ele falha, até um número máximo de tentativas
- Descartar arquivos temporários após o prazo de retenção definido

### A6. Fila e Ritmo de Envio

**Descrição:** Módulo obrigatório de proteção do número. Como o canal atende
também Campanhas e prospecção fria, é este módulo que impede que um disparo em
massa queime o número do cliente. Nenhuma mensagem sai do gateway sem passar por
aqui.

**Componentes:**
- Fila por Instância: mensagens aguardando envio, na ordem em que entraram
- Perfil de Ritmo: configuração de intervalo entre mensagens, variação aleatória
  aplicada a esse intervalo, teto por hora e teto por dia
- Janela de Envio: faixa de horário em que a instância tem permissão para enviar
- Modo Aquecimento: perfil reduzido aplicado a instâncias recém-conectadas, com
  tetos que crescem ao longo dos primeiros dias
- Freio de Emergência: interrupção automática de toda a fila de uma instância

**Comportamentos:**
- Enfileirar toda mensagem solicitada pelo CRM em vez de enviar imediatamente
- Respeitar o intervalo mínimo configurado entre dois envios da mesma instância
- Aplicar variação aleatória ao intervalo, para que o ritmo não seja constante
- Interromper os envios quando o teto por hora da instância é atingido
- Interromper os envios quando o teto por dia da instância é atingido
- Retomar os envios automaticamente quando o teto se renova
- Adiar mensagens solicitadas fora da janela de envio permitida
- Aplicar o perfil de aquecimento a uma instância nos primeiros dias de vida
- Priorizar mensagem de conversa em andamento sobre mensagem de campanha
- Acionar o freio de emergência quando a instância é marcada como banida
- Acionar o freio de emergência quando a proporção de falhas de envio ultrapassa
  o limite configurado
- Permitir que a operação acione manualmente o freio de emergência de uma
  instância
- Permitir que a operação libere manualmente uma instância freada
- Descartar da fila as mensagens de uma instância removida
- Informar ao CRM a posição e a previsão de envio de uma mensagem enfileirada

### A7. Entrega de Eventos ao CRM

**Descrição:** Como o gateway avisa o CRM de tudo o que acontece. Precisa
tolerar o CRM estar temporariamente indisponível sem perder eventos.

**Componentes:**
- Destino de Eventos: endereço do CRM que recebe os eventos de uma instância
- Assinatura do Evento: prova de que o evento veio do nosso gateway e não foi
  alterado
- Fila de Reentrega: eventos que falharam e aguardam nova tentativa
- Registro de Entrega: histórico de tentativas, respostas e falhas definitivas

**Comportamentos:**
- Entregar ao CRM cada mensagem recebida
- Entregar ao CRM cada atualização de status de mensagem enviada
- Entregar ao CRM cada mudança de estado de uma instância
- Entregar ao CRM cada acionamento de freio de emergência
- Assinar todo evento entregue
- Reenviar o evento quando o CRM responde com erro, com espera progressiva
- Parar de reenviar após o número máximo de tentativas e registrar a falha
- Preservar a ordem dos eventos de uma mesma conversa
- Permitir que a operação reenvie manualmente um evento que falhou

### A8. Saúde e Operação

**Descrição:** Visibilidade sobre o serviço para quem o opera — nós. Sem isto,
a primeira notícia de que uma instância caiu vem do cliente reclamando.

**Componentes:**
- Painel de Instâncias: relação de todas as instâncias, workspace, estado, última
  atividade e volume enviado
- Indicadores por Instância: mensagens enviadas e recebidas por período,
  proporção de falhas, tempo conectada
- Registro de Erros: falhas de sessão, de envio e de entrega de eventos
- Alerta Operacional: aviso disparado para nós quando algo exige intervenção

**Comportamentos:**
- Listar todas as instâncias do serviço com seus estados
- Consultar os indicadores de uma instância específica
- Consultar o registro de erros de uma instância
- Receber alerta quando uma instância é marcada como banida
- Receber alerta quando uma instância fica desconectada acima do tempo tolerado
- Receber alerta quando a proporção de falhas de envio ultrapassa o limite
- Receber alerta quando a fila de reentrega de eventos cresce além do esperado
- Verificar se o serviço como um todo está operante

### A9. Segurança e Isolamento

**Descrição:** Garantias de que um workspace nunca alcança dados de outro e de
que ninguém fora do CRM consegue usar o gateway.

**Componentes:**
- Credencial de Serviço: autorização geral do CRM junto ao gateway
- Credencial de Instância: autorização específica por número
- Cofre de Sessões: guarda cifrada das credenciais de sessão do WhatsApp

**Comportamentos:**
- Recusar qualquer chamada sem credencial válida
- Recusar chamada cuja credencial pertence a outra instância
- Guardar as credenciais de sessão de forma cifrada
- Registrar toda operação sensível: criação, logout e remoção de instância
- Apagar definitivamente sessão e mídias de uma instância removida
- Impedir que os registros de erro contenham conteúdo de mensagens de clientes

---

# PARTE B — CRM

### B1. Camada de Provider

**Descrição:** Ponto único por onde todo o CRM fala com o WhatsApp,
independentemente do provider. É o pré-requisito de tudo: hoje o código chama a
Meta diretamente em treze pontos diferentes. Nenhum módulo do CRM deve voltar a
saber qual provider está em uso.

**Componentes:**
- Contrato de Provider: conjunto único de operações de WhatsApp que o CRM conhece
- Provider Meta: implementação que fala com a API Oficial
- Provider Gateway: implementação que fala com o nosso gateway
- Seletor de Provider: escolhe a implementação a partir do número usado

**Comportamentos:**
- Resolver qual provider usar a partir do número de origem da mensagem
- Enviar mensagem de texto por qualquer provider
- Enviar mídia por qualquer provider
- Marcar conversa como lida por qualquer provider
- Verificar existência de número por qualquer provider
- Informar quais recursos o provider em uso suporta
- Devolver erro claro quando a operação não é suportada pelo provider em uso
- Registrar a mensagem na conversa da mesma forma para qualquer provider

### B2. Conexão de Número por QR Code

**Descrição:** Novo fluxo em Configurações > WhatsApp, ao lado do fluxo atual da
Meta. É aqui que o cliente conecta um número em minutos.

**Componentes:**
- Escolha de Canal: seleção entre API Oficial e canal direto, com explicação de
  cada um
- Tela de QR Code: código exibido para leitura, com instruções e contador de
  expiração
- Alternativa por Código: campo para gerar código de pareamento por número
- Indicador de Estado: aguardando leitura, conectando, conectado ou falhou
- Cartão do Número Conectado: número, nome de exibição, canal e estado

**Comportamentos:**
- Escolher conectar um número pelo canal direto
- Visualizar o QR Code para leitura
- Ver o tempo restante de validade do QR Code
- Obter um novo QR Code quando o atual expira
- Optar por parear usando código digitado em vez de QR Code
- Acompanhar a mudança de estado até a conexão ser concluída
- Ver o número e o nome de exibição confirmados após conectar
- Ver a lista de números conectados com o canal de cada um
- Desconectar um número mantendo a possibilidade de reconectar
- Reconectar um número desconectado lendo um novo QR Code
- Remover definitivamente um número conectado
- Ver o motivo quando a conexão falha
- Ver aviso destacado quando um número está banido

### B3. Termo de Responsabilidade

**Descrição:** O canal direto opera fora dos Termos de Serviço do WhatsApp. O
cliente precisa aceitar isso explicitamente, com registro, antes de conectar o
primeiro número.

**Componentes:**
- Texto do Termo: explicação do risco de banimento, das boas práticas e da
  responsabilidade do cliente sobre o número
- Confirmação de Aceite: marcação obrigatória antes de prosseguir
- Registro de Aceite: quem aceitou, quando e qual versão do termo

**Comportamentos:**
- Exibir o termo antes da primeira conexão pelo canal direto no workspace
- Impedir a conexão enquanto o termo não é aceito
- Registrar o aceite com autor, data e versão do termo
- Consultar o aceite registrado do workspace
- Exigir novo aceite quando o texto do termo muda

### B4. Saúde e Risco do Número

**Descrição:** Como o canal também atende Campanhas e prospecção fria, o cliente
precisa enxergar o risco antes de perder o número, não depois.

**Componentes:**
- Cartão de Saúde: estado da conexão, tempo conectado, volume enviado hoje e na
  hora corrente
- Medidor de Consumo: quanto dos tetos por hora e por dia já foi usado
- Indicador de Aquecimento: dias restantes e tetos vigentes de um número novo
- Sinal de Risco: classificação de baixo, médio ou alto, calculada a partir da
  proporção de respostas, do volume para números sem histórico e do ritmo
- Aviso de Freio: destaque quando os envios do número estão interrompidos

**Comportamentos:**
- Consultar a saúde de um número conectado
- Ver o consumo dos tetos por hora e por dia
- Ver o sinal de risco atual do número e o que o está elevando
- Ver que o número está em período de aquecimento e quais tetos valem
- Ver que os envios do número foram interrompidos e por quê
- Solicitar a retomada dos envios de um número interrompido
- Receber alerta na central de alertas quando o risco de um número fica alto
- Receber alerta na central de alertas quando um número é desconectado ou banido

### B5. Configuração de Ritmo por Número

**Descrição:** Permite ao administrador ajustar a agressividade do envio de cada
número, dentro de limites que o sistema não deixa ultrapassar.

**Componentes:**
- Formulário de Ritmo: intervalo entre mensagens, teto por hora e teto por dia
- Janela de Envio: horário inicial e final permitidos
- Limites do Sistema: valores máximos que o formulário não aceita ultrapassar
- Perfil Sugerido: valores recomendados conforme o tempo de vida do número

**Comportamentos:**
- Consultar o ritmo configurado de um número
- Alterar o intervalo entre mensagens de um número
- Alterar o teto por hora de um número
- Alterar o teto por dia de um número
- Definir a janela de horário de envio de um número
- Aplicar o perfil sugerido a um número
- Impedir configuração acima dos limites do sistema, explicando o limite
- Ver o efeito estimado da configuração sobre o tempo de uma campanha

### B6. Recebimento de Eventos do Gateway

**Descrição:** Ponto do CRM que recebe os eventos do gateway e os injeta no
mesmo fluxo que hoje trata os eventos da Meta — conversas, mensagens, tempo
real, automações e sequências seguem funcionando sem alteração.

**Componentes:**
- Receptor de Eventos: endereço que o gateway chama
- Verificador de Assinatura: confirmação de que o evento veio do nosso gateway
- Conversor de Evento: adaptação do evento para o formato já usado internamente

**Comportamentos:**
- Receber evento de mensagem recebida e registrá-la na conversa do contato
- Criar o contato automaticamente quando a mensagem vem de número desconhecido
- Criar a conversa automaticamente quando não há conversa aberta
- Receber evento de status e atualizar a mensagem correspondente
- Receber evento de mudança de estado da instância e atualizar o número conectado
- Receber evento de freio e registrar o alerta correspondente
- Recusar evento com assinatura inválida
- Ignorar evento já processado anteriormente
- Disparar as automações existentes a partir de mensagem recebida por este canal

### B7. Envio pelos Módulos Existentes

**Descrição:** Ajustes nos módulos já entregues para que passem a operar com
qualquer provider e escolham corretamente o número de origem.

**Componentes:**
- Seletor de Número de Origem: escolha de qual número conectado envia
- Indicador de Canal na Conversa: mostra por qual canal a conversa acontece
- Aviso de Recurso Indisponível: quando algo só existe em um dos canais

**Comportamentos:**
- Enviar mensagem do Chat pelo número da conversa, qualquer que seja o canal
- Ver na conversa por qual canal e por qual número ela está acontecendo
- Enviar mídia do Chat por qualquer canal
- Marcar conversa como lida por qualquer canal
- Executar ação de automação de envio por qualquer canal
- Executar passo de sequência por qualquer canal
- Escolher o número de origem ao criar uma campanha
- Ver aviso quando um recurso pedido não existe no canal do número escolhido
- Ocultar a gestão de templates para números do canal direto

### B8. Campanhas pelo Canal Direto

**Descrição:** Campanhas passam a poder usar números do canal direto. Como este
é o uso de maior risco de banimento, a campanha ganha controles próprios.

**Componentes:**
- Estimativa de Duração: tempo previsto do disparo conforme o ritmo do número
- Aviso de Risco: destaque explicando o risco quando o número escolhido é do
  canal direto
- Acompanhamento de Disparo: progresso, enviados, na fila e falhados
- Interrupção de Campanha: parada do disparo em andamento

**Comportamentos:**
- Escolher um número do canal direto ao criar uma campanha
- Ver o aviso de risco antes de confirmar a campanha
- Ver a duração estimada do disparo conforme o ritmo configurado
- Ver o progresso do disparo em andamento
- Ver quantas mensagens ainda estão na fila
- Interromper uma campanha em andamento
- Retomar uma campanha interrompida
- Ver a campanha ser interrompida automaticamente quando o número é freado
- Ver no relatório de entrega quais mensagens não saíram e por quê

---

## Fora de Escopo

- Grupos de WhatsApp — spec posterior, embora o gateway já suporte
- Hospedagem do gateway pelo próprio cliente
- Migração de histórico de conversas entre canais
- Chamadas de voz e vídeo
- Catálogo de produtos e carrinho
- Substituição ou remoção do canal da API Oficial
