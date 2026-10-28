# Spec: Segurança, rodada 4 (auditoria security-audit de 27/10)

> série: B44
> estado: aprovada em 27/10/2026; no ar e arquivada em 28/10/2026

> Origem: auditoria de 27/10/2026 com a skill `security-audit` da Cloudflare (run-1),
> cruzada com os 12 riscos do guia KipperDev. Relatório completo fora do repositório, em
> `C:\Users\marce\security-audit-skill\crm-exponencial\run-1\` (`REPORT.md`,
> `NEEDS-VALIDATION.md`, `KIPPERDEV-12-RISCOS.md`), e na página
> https://claude.ai/artifact/Gg275mebu9Mwd25VdkMrUR. Pedido da Marcelle em 27/10: "pode
> começar a spec". Triagem: **arquitetural**. Mexe em regras de acesso do banco, em
> webhooks, no motor de campanhas, na loja pública e no cadastro de números do WhatsApp.

## Visão Geral

A auditoria deixou 13 suspeitas "a validar". Nenhuma foi confirmada porque não deu para
rodar o app num ambiente isolado. Cada uma tem o caminho exato no código e passou por dois
verificadores independentes. Esta série fecha as 13 e alguns reforços pequenos que fecham
a mesma porta.

Como nas rodadas 1 a 3, **cada falha ganha um teste automático que reproduz o ataque**:
ele falha antes da correção e passa depois. É esse teste que transforma a suspeita em
falha confirmada e corrigida.

O que muda, agrupado pelo padrão por trás:

1. **Uma empresa alcança outra.** Número da Meta repetido entre empresas, limpeza de fotos
   do catálogo, times com usuário de outra empresa, eventos do gateway mudando mensagem de
   outra empresa, fila de campanhas travada por outra empresa.
2. **Confere antes e grava depois.** Campanha enviada em dobro e limites da loja furados
   por pedidos simultâneos ou por maiúsculas no endereço.
3. **Entrada de fora sem limite.** Redirecionamento depois do login, arquivo da campanha
   escolhido pelo navegador, planilha que esgota a memória, fórmula no CSV, mídia recebida
   do gateway sem limite.
4. **Ciclo de vida.** Contato apagado de vez continua recebendo campanha.

Quem usa o CRM quase não vê diferença. As mudanças visíveis são quatro: o botão "Conectar
número de teste" some, o Admin pode escolher o papel Admin ao editar e ao cadastrar alguém,
algumas recusas ganham aviso (número já conectado em outra empresa, planilha grande demais,
tipo de arquivo não aceito) e campanha travada vira "Interrompida".

### Decisões da Marcelle (27/10/2026)

| Pergunta | Decisão |
|---|---|
| Até onde vai a rodada | **As 13 suspeitas + reforços rápidos**: funções do banco abertas ao público, busca da agenda, SVG e extensão vinda do navegador nos uploads, mídia recebida do gateway (origem, tamanho e tempo) e erro cru do banco na tela |
| Botão "Conectar número de teste" da Meta | **Remover.** O id de número da Meta passa a ser único entre empresas, sem exceção |
| Admin pode promover outra pessoa a Admin? | **Pode.** A edição de papel e o cadastro de usuário passam a oferecer Admin, para as duas portas ficarem iguais |
| Admin pode rebaixar ou desativar outro Admin? | **Pode, menos o dono da empresa**, que só muda pelo suporte |
| CAPTCHA no cadastro, no login e na loja | **Fica para outra série.** Aqui entra só a conferência de que o cadastro público do Supabase está desligado no painel |

## Páginas / Módulos

### 1. Números do WhatsApp pela Meta (Configurações → WhatsApp e entrada de mensagens)

**Descrição:** cada número da API Oficial pertence a uma empresa só. As mensagens que a Meta
manda para esse número entram só nessa empresa, e nenhuma outra consegue tomar ou bloquear
o número.

**Componentes:**
- Botão "Conectar número de teste": **removido** da tela.
- Aviso de número já conectado: aparece quando a conexão pela Meta traz um número que já
  está em outra empresa.

**Comportamentos:**
- O Admin conecta um número pela janela da Meta. Se o número já está em outra empresa, a
  conexão é recusada com aviso.
- Ninguém consegue criar nem alterar a conexão de um número gravando direto no banco, sem
  passar pela conferência do CRM.
- A Meta manda mensagem para um número: ela entra só na empresa dona desse número.
- O botão "Conectar número de teste" deixa de existir, e a ação por trás dele também.

**Critérios de aceite:**

#### CA-B44-01 — Número da Meta que já está em outra empresa é recusado · prova: automática

- **Dado** a empresa A com o número da Meta de id X conectado
- **Quando** o Admin da empresa B conclui a conexão da Meta com o mesmo id X
- **Então** a tela de B avisa "Este número já está conectado em outra empresa", nenhuma
  conexão é criada em B, e a conexão de A continua igual

#### CA-B44-02 — Admin não grava conexão de número direto pelo banco · prova: automática

- **Dado** um Admin logado da empresa B
- **Quando** ele tenta criar ou alterar uma conexão de número direto pela API do banco,
  sem passar pela tela (por exemplo, gravando o id X de A ou trocando o token)
- **Então** o banco recusa e nada é gravado

#### CA-B44-03 — Mensagem da Meta entra só na empresa dona do número · prova: automática

- **Dado** a empresa A com o número de id X e uma tentativa recusada de B com o mesmo id
  (CA-B44-01 e CA-B44-02)
- **Quando** chega um webhook assinado da Meta com mensagem para o id X
- **Então** a mensagem aparece no chat de A e nada aparece em B

#### CA-B44-04 — O botão "Conectar número de teste" não existe mais · prova: automática

- **Dado** um Admin em Configurações → WhatsApp
- **Quando** a tela abre, mesmo com a variável que liberava o número de teste ligada
- **Então** o botão "Conectar número de teste" não aparece, e chamar a ação antiga não cria
  conexão nenhuma

### 2. Equipe: times e papéis (Configurações → Usuários)

**Descrição:** o Admin organiza só gente e times da própria empresa e pode dar qualquer um
dos três papéis, inclusive Admin.

**Componentes:**
- Edição de times do usuário: lista de times com marcação.
- Edição de papel: passa a oferecer **Admin**, Gerente e Atendente.
- Cadastro de usuário: o campo de papel passa a oferecer **Admin**, Gerente e Atendente.

**Comportamentos:**
- O Admin marca e desmarca os times de um usuário da empresa.
- O Admin muda o papel de outra pessoa da empresa para Admin, Gerente ou Atendente.
- O Admin cadastra uma pessoa já com o papel Admin, Gerente ou Atendente.
- O Admin continua sem conseguir mudar o próprio papel (como hoje).
- O Admin rebaixa ou desativa outro Admin, desde que não seja o dono da empresa.
- O dono da empresa (a pessoa que fez o cadastro da empresa) não pode ser rebaixado nem
  desativado por ninguém pela tela. Só pelo suporte.

**Critérios de aceite:**

#### CA-B44-05 — Admin não coloca usuário de outra empresa em time · prova: automática

- **Dado** as empresas A e B, cada uma com um usuário e um time
- **Quando** o Admin de A pede para pôr o usuário de B num time (de A ou de B)
- **Então** o pedido é recusado e os times de B ficam iguais

#### CA-B44-06 — Admin não põe usuário seu em time de outra empresa · prova: automática

- **Dado** as empresas A e B
- **Quando** o Admin de A pede para pôr um usuário de A num time de B
- **Então** o pedido é recusado e nenhum vínculo novo aparece

#### CA-B44-07 — Admin ajusta os times de alguém da própria empresa · prova: automática

- **Dado** um usuário de A num time de A
- **Quando** o Admin de A marca outro time de A e desmarca o primeiro
- **Então** o usuário passa a estar só no time novo

#### CA-B44-08 — Admin promove outra pessoa a Admin · prova: automática

- **Dado** um Gerente da empresa A
- **Quando** o Admin de A muda o papel dele para Admin
- **Então** a lista de usuários mostra a pessoa como Admin, e ela passa a ver as
  configurações que só o Admin vê

#### CA-B44-09 — Admin cadastra uma pessoa já como Admin · prova: automática

- **Dado** o Admin de A na tela de cadastro de usuário
- **Quando** ele cadastra alguém com o papel Admin
- **Então** a pessoa aparece na lista como Admin da empresa A

#### CA-B44-10 — Papel que não existe é recusado · prova: automática

- **Dado** o Admin de A
- **Quando** a edição de papel ou o cadastro recebe um papel que não é Admin, Gerente nem
  Atendente
- **Então** o pedido é recusado com aviso e nada muda

#### CA-B44-43 — Ninguém rebaixa nem desativa o dono da empresa · prova: automática

- **Dado** a empresa A, com o dono (quem a cadastrou) e um segundo Admin promovido depois
- **Quando** o segundo Admin tenta mudar o papel do dono para Gerente ou Atendente, ou
  desativá-lo
- **Então** a tela avisa "O dono da empresa não pode ser alterado", e o dono continua Admin
  e ativo

#### CA-B44-44 — Admin rebaixa e desativa outro Admin que não é o dono · prova: automática

- **Dado** a empresa A, com o dono e um segundo Admin
- **Quando** o dono muda o papel do segundo Admin para Gerente e depois o desativa
- **Então** a lista mostra a pessoa como Gerente e depois como desativada

### 3. Mensagens recebidas pelo canal direto (gateway)

**Descrição:** o que chega pelo gateway de um número só mexe nas mensagens daquele número e
daquela empresa. A mídia recebida vem só do próprio gateway, com limite de tamanho e de
tempo, e nunca vira uma página que abre no navegador.

**Comportamentos:**
- O gateway avisa que uma mensagem foi editada, apagada, recebeu reação ou mudou de status.
- O gateway manda uma mensagem com foto, vídeo, áudio ou documento.

**Critérios de aceite:**

#### CA-B44-11 — Evento do gateway não mexe em mensagem de outra empresa · prova: automática

- **Dado** uma mensagem da empresa B e um número da empresa A no canal direto
- **Quando** chega pelo número de A um evento de edição, apagamento, reação ou status que
  cita essa mensagem de B
- **Então** a mensagem de B fica igual (texto, status e reações)

#### CA-B44-12 — Evento do gateway na própria conversa continua funcionando · prova: automática

- **Dado** uma mensagem da empresa A numa conversa do número de A
- **Quando** chega pelo número de A a edição, o apagamento, a reação ou o status dessa
  mensagem
- **Então** o chat de A mostra a mudança, como hoje

#### CA-B44-13 — Mídia recebida só é baixada do próprio gateway · prova: automática

- **Dado** uma mensagem recebida com mídia cujo endereço não é do gateway configurado
- **Quando** o CRM processa a mensagem
- **Então** o CRM não acessa esse endereço, não manda a chave do número para ele, e a
  mensagem entra no chat como entra hoje quando a mídia não pode ser baixada

#### CA-B44-14 — Mídia grande demais ou lenta demais não trava o recebimento · prova: automática

- **Dado** uma mídia do gateway maior que o limite (SUP-B44-03) ou que não termina de chegar
  no tempo limite
- **Quando** o CRM processa a mensagem
- **Então** o download é interrompido e a mensagem entra no chat como entra hoje quando a
  mídia não pode ser baixada

#### CA-B44-15 — Arquivo recebido de tipo perigoso não abre como página · prova: automática

- **Dado** uma mídia recebida declarada como página da web (HTML) ou como imagem SVG
- **Quando** o CRM guarda o arquivo
- **Então** o arquivo fica guardado como download genérico, com extensão definida pelo CRM
  e não pelo nome que veio de fora, e não abre como página

### 4. Login

**Descrição:** depois de entrar, a pessoa volta para a página onde estava, mas só dentro do
CRM.

**Comportamentos:**
- A pessoa abre um link do CRM sem estar logada, entra e volta para onde ia.

**Critérios de aceite:**

#### CA-B44-16 — Link de login não leva para fora do CRM · prova: automática

- **Dado** um link de login cujo destino de volta é `/\` seguido de outro site, ou tem
  tabulação ou quebra de linha no começo
- **Quando** a pessoa entra com e-mail e senha certos
- **Então** ela cai no Dashboard do CRM, não no outro site

#### CA-B44-17 — Link de login para uma página do CRM continua funcionando · prova: automática

- **Dado** um link de login com destino de volta `/contatos?busca=ana`
- **Quando** a pessoa entra
- **Então** ela cai na lista de contatos com a busca "ana"

### 5. Campanhas

**Descrição:** cada destinatário recebe a campanha uma vez só. Uma campanha travada não
segura a fila das outras empresas. Contato apagado não recebe mais nada. O arquivo da
campanha é sempre um arquivo enviado pela própria empresa.

**Componentes:**
- Status "Interrompida" (já existe), agora também com o motivo de campanha que não tem como
  ser enviada.
- Envio de arquivo da campanha: aceita só os tipos que a campanha oferece.

**Comportamentos:**
- O envio automático e o botão "Retomar" processam a mesma campanha ao mesmo tempo.
- Uma empresa tem campanhas "Enviando" que não têm como sair (por exemplo, o texto ficou
  vazio).
- Um contato é apagado de vez depois de a campanha já ter montado a lista de quem recebe.
- O Gerente reenvia a campanha para quem falhou.
- O Gerente anexa imagem ou documento na campanha.
- O Gerente confirma a campanha com o arquivo anexado.

**Critérios de aceite:**

#### CA-B44-18 — Envio simultâneo não manda a mesma mensagem duas vezes · prova: automática

- **Dado** uma campanha "Enviando" com 40 destinatários pendentes
- **Quando** duas execuções do envio rodam ao mesmo tempo
- **Então** cada destinatário recebe exatamente uma mensagem e o relatório mostra 40 envios

#### CA-B44-19 — Campanha que não tem como sair vira "Interrompida" · prova: automática

- **Dado** uma campanha "Enviando" cujo conteúdo não pode ser enviado
- **Quando** o envio automático roda
- **Então** a campanha aparece como "Interrompida", com o motivo dito na tela, e sai da fila

#### CA-B44-20 — Campanhas travadas de uma empresa não seguram a de outra · prova: automática

- **Dado** a empresa A com 3 ou mais campanhas "Enviando" que não têm como sair e a empresa
  B com uma campanha válida "Enviando"
- **Quando** o envio automático roda uma vez
- **Então** a campanha de B começa a sair nessa mesma rodada

#### CA-B44-21 — Contato apagado de vez não recebe a campanha · prova: automática

- **Dado** uma campanha com lista montada que inclui o contato C, e C ainda pendente
- **Quando** C é apagado de vez e a campanha é enviada
- **Então** C não recebe a mensagem e o relatório mostra que ele não foi enviado porque o
  contato foi apagado

#### CA-B44-22 — Reenvio para falhas pula contato apagado de vez · prova: automática

- **Dado** uma campanha em que o envio para o contato C falhou
- **Quando** C é apagado de vez e o Gerente reenvia para quem falhou
- **Então** C não recebe a mensagem

#### CA-B44-23 — Arquivo de campanha que não veio da própria empresa é recusado · prova: automática

- **Dado** um Gerente da empresa A montando uma campanha de imagem ou documento
- **Quando** a campanha é confirmada com um endereço de arquivo que não é um arquivo enviado
  por A (um site qualquer, um endereço interno ou um arquivo de outra empresa)
- **Então** a tela avisa "Anexe o arquivo pela própria campanha" e a campanha não é
  confirmada

#### CA-B44-24 — Arquivo enviado pela própria campanha continua funcionando · prova: automática

- **Dado** um Gerente da empresa A que anexou uma imagem pela tela da campanha
- **Quando** ele confirma a campanha
- **Então** a campanha é confirmada e sai com essa imagem

#### CA-B44-25 — Anexo da campanha aceita só os tipos oferecidos · prova: automática

- **Dado** um Gerente anexando arquivo na campanha
- **Quando** o arquivo é uma imagem SVG, uma página HTML ou outro tipo fora da lista
  (SUP-B44-04)
- **Então** a tela avisa qual tipo é aceito e nada é guardado. Um arquivo aceito é guardado
  com extensão definida pelo tipo dele, não pelo nome

### 6. Catálogo

**Descrição:** trocar ou apagar fotos e logo apaga só arquivos da própria empresa. A
importação de planilha não trava o servidor. O CSV de pedidos não executa nada na planilha
de quem abre.

**Componentes:**
- Aviso de planilha grande demais na importação.
- Logo e fotos do catálogo: aceitam PNG, JPG e WebP (SVG sai da lista).

**Comportamentos:**
- O Gerente troca ou apaga a foto de um produto.
- O Gerente troca ou remove a logo ou o banner da loja.
- O Gerente apaga um produto.
- O Gerente importa uma planilha de produtos.
- O Gerente exporta os pedidos em CSV e abre no Excel ou no Google Planilhas.
- O Gerente envia a logo da loja.

**Critérios de aceite:**

#### CA-B44-26 — Trocar foto de produto não apaga imagem de outra empresa · prova: automática

- **Dado** uma imagem do catálogo da empresa B e um Gerente de A que gravou direto no banco,
  num produto de A, o caminho dessa imagem de B
- **Quando** o Gerente de A troca a foto do produto ou apaga o produto
- **Então** a imagem de B continua no ar

#### CA-B44-27 — Trocar logo ou banner não apaga imagem de outra empresa · prova: automática

- **Dado** uma imagem da empresa B e o caminho dela gravado direto no banco como logo ou
  banner da loja de A
- **Quando** o Gerente de A troca ou remove a logo ou o banner
- **Então** a imagem de B continua no ar

#### CA-B44-28 — Trocar a foto da própria empresa apaga a antiga · prova: automática

- **Dado** um produto de A com foto
- **Quando** o Gerente de A troca a foto
- **Então** a foto nova aparece e a antiga deixa de existir no armazenamento, como hoje

#### CA-B44-29 — Planilha que declara tamanho gigante é recusada sem travar · prova: automática

- **Dado** um arquivo de planilha pequeno (poucos KB) que declara muito mais que 1.000 linhas
- **Quando** o Gerente importa esse arquivo
- **Então** a tela avisa em poucos segundos que a planilha passa do limite de 1.000 produtos,
  e nada é importado

#### CA-B44-30 — Planilha normal continua importando · prova: automática

- **Dado** a planilha modelo preenchida com 3 produtos
- **Quando** o Gerente importa
- **Então** a prévia mostra os 3 produtos, como hoje

#### CA-B44-31 — CSV de pedidos não vira fórmula · prova: automática

- **Dado** um pedido da loja feito com o nome `=1+1` (ou começando com `+`, `-` ou `@`)
- **Quando** o Gerente exporta os pedidos em CSV
- **Então** a célula do cliente mostra o texto `=1+1`, não o resultado 2 (o CSV marca a
  célula como texto)

#### CA-B44-32 — Logo e fotos do catálogo não aceitam SVG · prova: automática

- **Dado** o Gerente enviando a logo ou uma foto de produto
- **Quando** o arquivo é SVG
- **Então** a tela avisa que a imagem precisa ser PNG, JPG ou WebP, e nada é guardado

### 7. Loja pública (pedido sem login)

**Descrição:** os limites contra robôs valem de verdade: 10 pedidos por hora por endereço de
internet em cada loja, e um pedido por telefone a cada 2 minutos.

**Comportamentos:**
- Um visitante faz pedidos usando o endereço da loja com letras maiúsculas e minúsculas
  diferentes.
- Um robô dispara muitos pedidos ao mesmo tempo.
- Dois pedidos com o mesmo telefone saem ao mesmo tempo.

**Critérios de aceite:**

#### CA-B44-33 — Trocar maiúsculas no endereço da loja não escapa do limite · prova: automática

- **Dado** a loja `loja-teste` e 10 pedidos na última hora do mesmo endereço de internet,
  feitos por `loja-teste`, `LOJA-TESTE` e `Loja-Teste`
- **Quando** chega o 11º pedido desse endereço, com qualquer combinação de maiúsculas
- **Então** o visitante vê "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de
  novo." e nada é gravado

#### CA-B44-34 — Pedidos simultâneos não passam do limite por hora · prova: automática

- **Dado** nenhum pedido recente de um endereço de internet
- **Quando** 15 pedidos desse endereço chegam ao mesmo tempo na mesma loja
- **Então** no máximo 10 pedidos são gravados e os outros veem o aviso de muitos pedidos

#### CA-B44-35 — Mesmo telefone ao mesmo tempo grava um pedido só · prova: automática

- **Dado** nenhum pedido recente do telefone T
- **Quando** dois pedidos com o telefone T chegam ao mesmo tempo
- **Então** um pedido é gravado e o outro vê o aviso de esperar para pedir de novo

### 8. Chat e Agenda (reforços)

**Comportamentos:**
- O atendente busca um contato na Agenda para marcar follow-up.
- O atendente envia imagem, vídeo ou áudio pelo chat.
- O envio de uma mensagem falha por um erro inesperado.

**Critérios de aceite:**

#### CA-B44-36 — Busca da Agenda aceita vírgula, parênteses e aspas · prova: automática

- **Dado** um contato chamado `Ana (loja), "centro"`
- **Quando** o atendente busca por `Ana (loja), "centro"` na Agenda
- **Então** o contato aparece, sem erro, e a busca não traz contato que o atendente não pode
  ver

#### CA-B44-37 — Chat não aceita imagem SVG e não usa a extensão do nome · prova: automática

- **Dado** o atendente enviando arquivo pelo chat
- **Quando** o arquivo é uma imagem SVG
- **Então** o chat avisa que o tipo não é aceito e nada é guardado. Uma imagem, um vídeo ou
  um áudio aceito é guardado com extensão definida pelo tipo dele, não pelo nome

#### CA-B44-38 — Erro inesperado não aparece cru para o atendente · prova: automática

- **Dado** um envio pelo chat que falha por um erro interno inesperado (por exemplo, erro do
  banco)
- **Quando** o chat mostra o motivo da falha
- **Então** o atendente vê "Não enviada: tente de novo em instantes.", sem o texto técnico.
  Os motivos conhecidos (número desconectado, número freado, em aquecimento) continuam
  aparecendo como hoje

### 9. Banco de dados: funções abertas ao público (reforço)

**Descrição:** três funções do banco ainda podem ser chamadas de fora: a que recalcula a
classificação de um contato e as duas que dizem se um contato ou uma conversa está na
lixeira. Só o CRM deve usá-las.

**Critérios de aceite:**

#### CA-B44-39 — Visitante sem login não chama as funções · prova: automática

- **Dado** um visitante com a chave pública e sem login
- **Quando** ele chama a função de recalcular classificação ou as de conferir lixeira
- **Então** o banco recusa

#### CA-B44-40 — Usuário de outra empresa não descobre se um contato está na lixeira · prova: automática

- **Dado** um contato da empresa B na lixeira e um usuário logado da empresa A que sabe o
  código desse contato
- **Quando** ele chama direto a função que confere lixeira, ou a de recalcular a
  classificação, com esse código
- **Então** o banco recusa ou não responde nada sobre o contato de B, e a classificação dele
  fica igual

#### CA-B44-41 — Lixeira e classificação continuam funcionando nas telas · prova: automática

- **Dado** a empresa A com um contato na lixeira e um card que muda a classificação de outro
  contato
- **Quando** o Gerente abre a lixeira, restaura o contato e move o card
- **Então** a lixeira mostra e restaura o contato, e a classificação muda, como hoje

### 10. Conferências no painel (sem código)

#### CA-B44-42 — Cadastro público desligado no Supabase Auth · prova: manual

- **Dado** o painel do Supabase do projeto
- **Quando** a Marcelle (ou o Luan) abre as configurações de Auth
- **Então** "Allow new users to sign up" está desligado, e uma empresa nova ainda consegue se
  cadastrar pela tela `/cadastro` do CRM

## Fora de escopo

- CAPTCHA (Cloudflare Turnstile ou similar) no cadastro, no login e na loja. Fica para
  outra série, por decisão da Marcelle em 27/10.
- As 6 áreas que a auditoria não cobriu por orçamento e que abrem a run-2: Realtime;
  actions de dashboard, etiquetas e mensagens rápidas; mensagem enviada pelo celular e
  alertas de número; gravação direta em campanhas consumida pelo envio; links assinados das
  fotos de contato; confidencialidade dos arquivos no armazenamento público do chat.
- Política completa de conteúdo (CSP de script), pelo risco de quebrar o login da Meta
  (mesma decisão da rodada 3).
- Os outros reforços do relatório que não fecham nenhuma das 13 portas: PIN fixo `000000`
  nos números Meta, token da Meta na URL de templates, comparação do HMAC da exclusão de
  dados, código de confirmação previsível da exclusão, processamento dos pedidos de
  exclusão de dados, `https` obrigatório no endereço do gateway, limite de tentativas em
  "Alterar senha", `shadcn` como dependência de produção, cadastro com `email_confirm`
  sem prova do e-mail.
- Status de mensagem da Meta atualizado pelo id global (`wamid`) no webhook da Meta. Fica
  como reforço: nesse caminho o id vem da própria Meta assinado. Entra se o plano mostrar
  que custa pouco junto com CA-B44-03.
- Qualquer mudança no gateway (repositório separado).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-01 | Não há empresa de cliente com o mesmo id de número da Meta em duas empresas hoje, e o número de teste da Meta não está ligado a nenhuma empresa em uso. Se houver, a regra de número único é aplicada depois de remover as linhas sobrando | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-02 | Campanha que não tem como sair vira "Interrompida" com motivo, reaproveitando o status que já existe para quem para no meio. Ela não é apagada nem cancelada | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-03 | Limite da mídia recebida do gateway: **100 MB** (o maior documento que o WhatsApp aceita) e **60 segundos** para terminar de chegar | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-04 | Anexo de campanha aceita: imagem em JPG, PNG ou WebP; documento em PDF, Word, Excel, PowerPoint ou TXT. Até 10 MB, como hoje | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-05 | Limite da planilha importada: até 1.000 linhas (como hoje) e até 50 colunas. Uma planilha que declara mais do que isso é recusada antes de ser lida | invalidada | Marcelle, 27/10/2026: não criar limite novo. Fica o de hoje (1.000 linhas de produto, só a importação do catálogo) e **nenhum limite de colunas**. A série só recusa o arquivo que declara mais linhas do que o limite de hoje antes de ser lido (CA-B44-29) |
| SUP-B44-06 | Tirar SVG da logo e das fotos do catálogo não afeta ninguém, porque ainda não há clientes reais (regra de 25/10). Uma logo SVG que já exista continua aparecendo; só um envio novo é recusado | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-07 | Os testes de banco, como nas rodadas 1 a 3, rodam no Supabase do projeto com empresas `[TESTE]` criadas e apagadas pelo próprio teste | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-08 | O contato apagado de vez aparece no relatório da campanha como não enviado, com o motivo "contato apagado" | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-09 | O "dono da empresa" é o Admin criado junto com a empresa na tela `/cadastro`. Hoje o banco não guarda isso, então a série passa a guardar, e nas empresas que já existem o dono é o Admin mais antigo | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-10 | Na B44-01 a migration (revoke de insert/update em whatsapp_connections) é aplicada no banco ANTES de o código novo ir ao ar, para os testes rodarem. Na janela entre um e outro, só conectar, desconectar e reconectar número pela tela ficam recusados; não há clientes reais, e as duas coisas acontecem no mesmo dia | confirmada | Marcelle, 27/10/2026: pode, e cada issue vai ao ar assim que o revisildo der ✅, conferindo antes o estado do repo e da outra sessão |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B44-01 | Agora que Admin pode promover outra pessoa a Admin: um Admin pode rebaixar ou desativar outro Admin, inclusive o admin principal (atacadoexponencial@gmail.com)? Hoje pode, só não consegue mexer em si mesmo | respondida | Marcelle, 27/10/2026: **só o dono é protegido.** Admin rebaixa ou desativa outro Admin, menos o dono da empresa (quem fez o cadastro da empresa). O dono só muda pelo suporte (CA-B44-43, CA-B44-44) |
