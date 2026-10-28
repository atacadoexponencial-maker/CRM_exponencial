# Spec: Segurança, rodada 5 (rodada 2 da auditoria de 27/10)

> série: B47
> estado: aprovada em 28/10/2026

> Origem: as 6 unidades que a auditoria `security-audit` de 27/10/2026 (run-1) deixou
> adiadas por orçamento (`REPORT.md`, seção 7, em
> `C:\Users\marce\security-audit-skill\crm-exponencial\run-1\`). Revisadas por leitura do
> código em 28/10/2026, com conferência no banco de teste do que dava para conferir.
> Pedido da Marcelle em 28/10: "pode ser pela rodada 2". Triagem: **arquitetural**. Mexe
> no motor de campanhas, no tempo real, nas fotos de contato e no canal direto.

## Visão Geral

Das 6 unidades, duas não têm problema: as ações de dashboard, etiquetas e mensagens
rápidas conferem o papel e a empresa, e o banco só deixa o Admin gravar; e a pasta de
anexos do chat já não deixa listar nem gravar na pasta de outra empresa desde a B19
(`20261006000006_storage_sem_listagem`, conferido no banco de teste em 28/10). As outras
quatro deram cinco correções:

1. **Campanha gravada direto no banco.** O banco deixa Admin e Gerente gravarem direto nas
   tabelas de campanha, sem passar pela tela. O envio confia no que está gravado: manda o
   anexo de qualquer endereço (a trava da B44-06 só existe na tela) e manda para qualquer
   telefone guardado no destinatário. É a correção principal.
2. **Conta desativada no tempo real.** O canal pessoal do atendente não confere se a conta
   está ativa; os outros canais conferem.
3. **Foto do contato no tempo real.** O aviso de foto nova vai para a empresa inteira,
   inclusive para o atendente que não vê aquele contato (regra da B45). O aviso sai: a
   foto passa a aparecer no próximo carregamento da lista, como qualquer outro dado.
4. **Link da foto do contato.** O servidor assina, com a chave de serviço, o caminho que
   está gravado no contato, e o usuário consegue mudar esse caminho.
5. **Resposta citada no canal direto.** A mensagem citada é procurada sem filtrar a
   empresa.

Como nas outras rodadas, cada falha ganha um teste automático que reproduz o ataque. Quem
usa o CRM não vê diferença, a não ser no relatório de uma campanha adulterada.

### Decisões da Marcelle (28/10/2026)

| Pergunta | Decisão |
|---|---|
| Telefone guardado na campanha diferente do telefone atual do contato | **Manda para o telefone atual.** Vale o que está no contato; telefone inventado nunca recebe |
| Aviso em tempo real de foto nova do contato (B29-03) | **Sai.** "Não tem necessidade disso": a foto aparece no próximo carregamento da lista |

## Páginas / Módulos

### 1. Envio de campanha

**Descrição:** na hora de mandar, o envio confere de novo o anexo e cada destinatário com
as regras da tela. Uma campanha gravada direto no banco não consegue mandar o que a tela
não deixaria.

**Componentes:**
- Envio de campanha (rotina das campanhas): o que sai para o canal.
- Relatório da campanha: o motivo de quem não recebeu e da campanha interrompida.

**Comportamentos:**
- Antes de mandar o primeiro destinatário, o envio confere que o anexo é um arquivo da
  própria empresa, na pasta de campanhas, como a tela confere desde a B44-06.
- Anexo de fora interrompe a campanha inteira, com o motivo no relatório.
- Cada destinatário precisa ser um contato da empresa da campanha. O que não for não
  recebe e fica "Excluído", com o motivo.
- A mensagem vai para o telefone atual do contato, e não para o guardado na campanha.

**Critérios de aceite:**

#### CA-B47-01 — anexo de fora gravado direto no banco não sai · prova: automática

- **Dado** uma campanha confirmada cujo anexo foi trocado direto no banco por um endereço
  fora da pasta de campanhas da empresa
- **Quando** o envio roda
- **Então** nenhuma mensagem vai para o canal, e a campanha fica "Interrompida" com o
  motivo "O anexo da campanha não é um arquivo da empresa"

#### CA-B47-02 — destinatário que não é contato da empresa não recebe · prova: automática

- **Dado** uma campanha com um destinatário gravado direto no banco que aponta para o
  contato de outra empresa
- **Quando** o envio roda
- **Então** nada é mandado para esse destinatário, ele fica "Excluído" com o motivo
  "Não é contato da empresa", e os outros destinatários recebem normalmente

#### CA-B47-03 — a mensagem vai para o telefone atual do contato · prova: automática

- **Dado** um destinatário cujo telefone guardado na campanha é diferente do telefone
  atual do contato
- **Quando** o envio roda
- **Então** a mensagem vai para o telefone atual do contato, e nunca para o guardado

#### CA-B47-04 — a campanha feita pela tela continua saindo · prova: automática

- **Dado** uma campanha montada pela tela, com anexo enviado por ela e destinatários da
  empresa
- **Quando** o envio roda
- **Então** todos recebem a mensagem com o anexo, como antes

### 2. Tempo real do chat

**Descrição:** cada aviso em tempo real chega só a quem pode ver aquilo, e só enquanto a
conta estiver ativa.

**Componentes:**
- Canal pessoal do atendente (`usuario:<id>`).
- Aviso de foto nova do contato (B29-03), que sai.

**Comportamentos:**
- Conta desativada não entra no canal pessoal, como já não entra nos canais da empresa.
- Foto nova guardada não é mais transmitida em tempo real. A tela aberta mostra a foto
  no próximo carregamento da lista (trocar de tela, recarregar ou abrir a conversa). O
  teste da B29 que cobria o aviso (CA-B29-17) sai junto.

**Critérios de aceite:**

#### CA-B47-05 — conta desativada não ouve o canal pessoal · prova: automática

- **Dado** um atendente com a conta desativada e o acesso ainda válido
- **Quando** ele tenta entrar no próprio canal de tempo real
- **Então** a entrada é recusada, e com a conta ativa ela continua aceita

#### CA-B47-06 — foto nova do contato não é transmitida para a empresa · prova: automática

- **Dado** um contato cuja foto de perfil acabou de ser guardada
- **Quando** a guarda termina
- **Então** nada é transmitido em tempo real com a foto, e a foto aparece para quem vê o
  contato no próximo carregamento da lista do chat e do perfil

### 3. Foto do contato

**Descrição:** o link da foto é sempre o da foto daquele contato, naquela empresa, seja
qual for o caminho gravado.

**Componentes:**
- Foto do contato no perfil e na lista do chat.

**Comportamentos:**
- O servidor só assina o caminho da foto do próprio contato, na pasta da empresa dele.
  Caminho gravado diferente disso não vira link.

**Critérios de aceite:**

#### CA-B47-07 — caminho de foto de outra empresa não vira link · prova: automática

- **Dado** um contato cujo caminho da foto foi trocado direto no banco para a foto de um
  contato de outra empresa
- **Quando** o perfil do contato e a lista do chat pedem a foto
- **Então** nenhuma foto aparece para ele, e a foto de um contato sem adulteração continua
  aparecendo

### 4. Mensagem enviada e recebida pelo canal direto

**Descrição:** a mensagem citada numa resposta é sempre uma mensagem da mesma empresa.

**Componentes:**
- Resposta citada (reply) nas mensagens recebidas e nas enviadas pelo celular.

**Comportamentos:**
- A mensagem citada é procurada só na empresa do número por onde o evento chegou.

**Critérios de aceite:**

#### CA-B47-08 — resposta não cita mensagem de outra empresa · prova: automática

- **Dado** um evento do canal direto que cita o identificador de uma mensagem de outra
  empresa
- **Quando** a mensagem é gravada
- **Então** ela fica sem mensagem citada ligada, e citar uma mensagem da própria empresa
  continua ligando as duas

## Fora de escopo

- **Gateway (outro repositório):** recusar baixar anexo de endereço interno ou fora do
  Supabase. Esta série fecha a porta no CRM; o reforço no gateway vira issue lá.
- **Anexos do chat por link público:** o link continua público e permanente; trocar por
  link temporário é mudança grande, fora desta rodada.
- **Leitura de etiquetas e mensagens rápidas por conta desativada:** as regras dessas duas
  tabelas não conferem a conta ativa. O acesso dura no máximo uma hora depois da
  desativação e mostra só nomes; fica anotado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B47-01 | Anexo de fora interrompe a campanha inteira (e não só pula o anexo), porque a campanha foi adulterada | confirmada | Marcelle, 28/10/2026 |
| SUP-B47-02 | O aviso de foto nova segue a mesma regra de canais das mensagens novas (gestão, responsável, fila aberta) | invalidada | O aviso sai (Marcelle, 28/10/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B47-01 | Telefone guardado diferente do atual: mandar para qual? | respondida | Para o telefone atual do contato (Marcelle, 28/10/2026) |
