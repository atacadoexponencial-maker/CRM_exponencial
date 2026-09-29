# Spec: Desconectar e reconectar de verdade no canal direto

## Visão Geral

No canal direto (número conectado por QR Code, pelo gateway próprio), o CRM
oferece três ações sobre um número: **Desconectar**, **Encerrar no aparelho** e
**Remover**. A tela promete, para a primeira:

> O número para de enviar e receber, mas a sessão continua guardada: para voltar,
> basta reconectar — sem ler o QR Code de novo.

Hoje essa promessa não é cumprida, e o teste com chip real de 24/09/2026 mostrou
por quê:

- **Desconectar não desconecta.** O gateway só troca o estado para
  "desconectado"; a conexão com o WhatsApp continua aberta. O celular segue
  mostrando o aparelho como ativo, e o número provavelmente continua recebendo.
- **Não existe reconectar sem QR.** O botão "Reconectar" do CRM pede um QR Code
  novo. Numa sessão que já estava pareada, o gateway fica esperando um código
  que nunca vem e, ao estourar o tempo, encerra a sessão.
- **Um reinício do gateway reconecta tudo.** A cada publicação, o gateway reabre
  sozinho todos os números "desconectados" — sem distinguir o que caiu por
  problema de rede do que o cliente pediu para desconectar.

Esta mudança faz **desconectar** significar pausa de verdade (a conexão com o
WhatsApp é fechada, a sessão fica guardada) e cria a operação **reconectar com a
sessão guardada**, sem QR Code, que o CRM passa a usar no botão "Reconectar".

**Para quem é:** o administrador do workspace, que precisa pausar um número (troca
de aparelho, pausa de operação, suspeita de problema) sem perder o pareamento.

**Problema que resolve:** hoje a única forma de parar um número de verdade é
removê-lo ou encerrar no aparelho — e as duas obrigam a ler o QR Code de novo.

A mudança toca os dois lados e o **contrato entre eles**: ganha uma operação nova,
e o significado de "desconectado" fica mais preciso.

---

## Páginas / Módulos

### Gateway — Desconectar

**Descrição:** a operação de desconectar um número passa a fechar de fato a
conexão com o WhatsApp, guardando a sessão para uma volta sem QR Code.

**Componentes:**
- Operação Desconectar: a operação que já existe no contrato, com o mesmo pedido
  e a mesma resposta.
- Sessão guardada: as credenciais do número, que continuam no gateway depois da
  desconexão.
- Marca de "desconectado a pedido": o registro de que a desconexão foi pedida, e
  não causada por queda.

**Comportamentos:**
- Fechar a conexão: ao desconectar, a conexão com o WhatsApp é encerrada no mesmo
  instante — o número deixa de receber e de enviar.
- Guardar a sessão: a desconexão não apaga as credenciais; o número continua
  pareado e aparece na lista de "Aparelhos conectados" do celular.
- Deixar de aparecer como ativo: depois de desconectado, o celular deixa de
  mostrar o aparelho como "ativo agora" e passa a mostrar a última atividade.
- Recusar envio: um pedido de envio para um número desconectado é recusado com o
  motivo "instância não conectada", sem entrar na fila.
- Não reconectar sozinho: um número desconectado a pedido não volta a conectar
  por conta própria — nem por tentativa automática de reconexão, nem quando o
  gateway reinicia.
- Avisar o CRM: a desconexão é informada ao CRM como mudança de estado para
  "desconectado", sem motivo (o que o contrato já define como transição
  solicitada).
- Repetir sem erro: desconectar um número já desconectado responde com sucesso e
  não muda nada.
- Recusar número banido: desconectar um número banido continua recusado, como
  hoje, para não esconder o banimento.

### Gateway — Reconectar com a sessão guardada

**Descrição:** operação nova no contrato. Reabre a conexão de um número
desconectado usando a sessão guardada, sem QR Code.

**Componentes:**
- Operação Reconectar: pedido com a credencial da instância, sem corpo.
- Resposta imediata: o estado depois do pedido, "conectando".
- Evento de estado: o aviso ao CRM quando a conexão termina — "conectado" no
  sucesso, "desconectado" com motivo na falha.

**Comportamentos:**
- Reconectar um número desconectado: o gateway reabre a conexão com a sessão
  guardada, responde na hora com "conectando" e avisa o CRM quando ficar
  "conectado".
- Voltar sem QR Code: em nenhum momento da reconexão é gerado ou pedido QR Code.
- Voltar com o mesmo número: a reconexão devolve o mesmo telefone e o mesmo nome
  de exibição de antes, informados no evento de "conectado".
- Retomar o recebimento: depois de reconectado, as mensagens enviadas ao número
  voltam a chegar ao CRM normalmente.
- Entregar o que chegou durante a pausa: o que o WhatsApp entregar ao aparelho na
  volta — mensagens recebidas enquanto o número estava desconectado — chega ao CRM
  como mensagem recebida comum, com o horário original. Quanto o WhatsApp entrega
  depende dele e precisa ser medido no teste com chip real.
- Retomar o envio: depois de reconectado, o número volta a aceitar envios, com o
  ritmo e o aquecimento que já tinha (a desconexão não reinicia o aquecimento).
- Falhar por sessão encerrada no celular: se o aparelho foi removido pelo celular
  enquanto o número estava desconectado, a reconexão falha, e o CRM é avisado com
  estado "desconectado" e motivo "sessão encerrada no aparelho".
- Falhar sem sessão guardada: se não houver sessão guardada (número nunca
  pareado, ou sessão perdida), o pedido é recusado com um motivo próprio, que diz
  que é preciso parear de novo.
- Recusar número banido: reconectar um número banido é recusado com o motivo
  "instância banida".
- Recusar número removido: reconectar um número removido é recusado como
  instância inexistente.
- Repetir sem erro: reconectar um número já conectado, ou já conectando, responde
  com o estado atual e não abre uma segunda conexão.
- Desfazer a marca de "a pedido": ao reconectar, o número volta a ser tratado como
  qualquer número conectado — se a conexão cair depois, o gateway tenta voltar
  sozinho.

### Gateway — Reinício do serviço e queda de conexão

**Descrição:** o gateway passa a distinguir "desconectado a pedido" de "caiu a
conexão" ao decidir o que reabrir sozinho.

**Componentes:**
- Recuperação no reinício: a rotina que reabre as sessões quando o gateway sobe.
- Reconexão automática: a rotina que tenta voltar quando a conexão cai.

**Comportamentos:**
- Reabrir o que caiu: no reinício, números conectados, conectando ou
  desconectados por queda continuam sendo reabertos sozinhos, como hoje.
- Não reabrir o que foi pausado: no reinício, números desconectados a pedido
  ficam desconectados.
- Manter a pausa entre reinícios: um número desconectado a pedido continua
  desconectado depois de qualquer quantidade de reinícios, até alguém pedir para
  reconectar.
- Não insistir no que foi pausado: uma queda de conexão durante o fechamento
  pedido não dispara reconexão automática.

### Contrato Gateway ↔ CRM

**Descrição:** o documento do contrato, nos dois repositórios, passa a descrever
a operação nova e o significado preciso de "desconectado".

**Componentes:**
- Tabela de operações da instância: ganha a linha de Reconectar.
- Tabela de erros: ganha o motivo "sem sessão guardada para reconectar".
- Descrição do estado "desconectado": passa a dizer quando o gateway volta
  sozinho e quando não volta.

**Comportamentos:**
- Documentar Reconectar: quem pode pedir, o que recebe, o que devolve e em quais
  estados é aceita ou recusada.
- Documentar o novo motivo de recusa: código estável e mensagem legível, como os
  demais.
- Documentar a diferença: "desconectado sem motivo" é pausa pedida e não volta
  sozinho; "desconectado por perda de conexão" volta sozinho.
- Manter compatibilidade: a mudança entra na versão atual do contrato, porque só
  acrescenta (operação e código de erro novos); nada existente muda de nome nem
  de formato.
- Manter as duas cópias iguais: a cópia do contrato no CRM e a do gateway ficam
  com o mesmo texto nas seções alteradas.

### CRM — Configurações → WhatsApp (cartão do número)

**Descrição:** as ações do cartão de um número do canal direto passam a cumprir o
que prometem.

**Componentes:**
- Botão Desconectar: aparece em número conectado, como hoje.
- Botão Reconectar: aparece em número desconectado; passa a reconectar com a
  sessão guardada.
- Indicação "Reconectando…": estado do botão e do selo enquanto a reconexão não
  termina.
- Aviso de sucesso: mensagem de que o número voltou e já pode receber e enviar.
- Aviso de falha com saída: mensagem de que a sessão não pôde ser reaberta, com o
  caminho para ler um QR Code novo.
- Texto de efeito de cada ação: os textos que explicam Desconectar, Encerrar no
  aparelho e Remover, revisados para bater com o comportamento real.

**Comportamentos:**
- Desconectar: o administrador confirma a desconexão, e o cartão passa a mostrar
  o número como desconectado.
- Reconectar sem QR: o administrador clica em Reconectar, e o CRM pede a
  reconexão ao gateway, sem abrir a tela de QR Code.
- Ver a reconexão em andamento: enquanto não termina, o cartão mostra
  "Reconectando…", e o botão não aceita um segundo clique.
- Ver o número voltar sem recarregar: quando o gateway confirma, o cartão passa a
  "conectado" sozinho e aparece o aviso de sucesso — sem F5.
- Cair para o QR quando a sessão acabou: se a reconexão falhar por sessão
  encerrada no aparelho ou por falta de sessão guardada, o CRM avisa o motivo e
  oferece ler um QR Code novo para o mesmo número, sem criar outro.
- Ver o motivo de outras recusas: se o gateway recusar por outro motivo (número
  banido, gateway fora do ar), o cartão mostra o motivo em português.
- Não criar número novo: nenhum caminho de Reconectar cria um número novo na lista.
- Conversas continuam no número: depois de reconectado, as conversas antigas do
  número continuam ligadas a ele, e responder nelas funciona.
- Distinguir pausa de queda no cartão: número desconectado a pedido mostra
  "Desconectado"; número que caiu mostra que o gateway está tentando voltar.
- Ver há quanto tempo está desconectado: o cartão de um número desconectado a
  pedido mostra desde quando ("Desconectado há 3 dias").
- Ser avisado de pausa longa: a partir de 10 dias desconectado a pedido, o cartão
  mostra um aviso de que o WhatsApp pode desfazer a conexão se o celular do número
  ficar sem uso por mais de 14 dias, e recomenda reconectar.
- Ver o aviso sumir: ao reconectar, o aviso de pausa longa desaparece.

---

## Fora do escopo

- Esconder ou remover o botão Desconectar (decidido em 24/09/2026: o app ainda não
  tem uso real).
- Registrar no chat as mídias cuja tentativa de envio falhou (hoje só o texto fica
  registrado).
- Números da API Oficial da Meta: esta mudança vale só para o canal direto.
- Verificação periódica do risco e outros itens da fila do canal direto.

## Perguntas em aberto

Nenhuma. Decididas em 24/09/2026 pela Marcelle:

- **Mensagens recebidas durante a pausa** aparecem normalmente no chat.
- **Pausa longa** ganha aviso no cartão a partir de 10 dias. O único prazo oficial
  do WhatsApp é o de 14 dias sem uso do celular principal
  ([central de ajuda](https://faq.whatsapp.com/120604060995491)); para o próprio
  aparelho conectado parado não há prazo oficial publicado, por isso o aviso fala
  do celular. O aviso aparece no cartão, ao abrir a tela; avisar na central de
  alertas sem ninguém abrir a tela depende da rotina periódica que ainda não
  existe, e fica fora.
