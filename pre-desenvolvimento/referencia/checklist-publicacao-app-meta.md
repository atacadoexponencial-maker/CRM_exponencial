# Publicação do CRM na Meta — checklist

Tudo o que falta para o app **crmatacado exp** sair do modo "não publicado" e passar a conectar o WhatsApp dos clientes pela API Oficial, na ordem em que a Meta exige. Levantado direto do painel do app em 18/09/2026 e atualizado em 21/10/2026, depois do primeiro teste de conexão bem-sucedido.

- **ID do app:** `1638896020699607` (nome na Meta: **crmatacado exp**, trocado em 21/10)
- **Empresa dona do app:** VDA - Viver de Atacado (`1276403680212290`), verificada. Até 21/10 era a Sete - Performance Marketing (`639780553124227`); ver "Por que o app mudou de empresa".
- **Razão social e CNPJ da verificação:** SETE ADS 2 LTDA, CNPJ 53.756.257/0001-34
- **Configuração de login (Cadastro Incorporado):** `1039784419039146`
- **Número de teste conectado ao CRM:** +55 11 95504-6911 "Atacado Exp", no portfólio "Atacado Exponencial" (`1108888206510470`), conta `1590810305457394`, phone_number_id `1418746787986404`. Chip com o Felipe.

**Legenda:** ✅ feito · ⏳ pendente · 🔒 bloqueado, esperando outro item · ➖ opcional, não exigido pela Meta

> **O que destrava tudo agora:** o **vídeo** (depende do chip do número de teste, que está com o Felipe) e a **landing** (série B24), que a verificação de acesso exige até **17/11/2026**. Os textos do formulário da análise já estão prontos na seção 6.

---

## 1. Configuração do app

A base técnica: o app conversa com o CRM e a Meta sabe onde entregar as mensagens.

- [x] ✅ **Configurações básicas**: domínio, política de privacidade, termos, exclusão de dados (como URL de retorno de chamada) e categoria "Negócio e Páginas".
- [x] ✅ **Ícone do app**: hoje é o símbolo do Gestor Exponencial. Trocar pelo cubo do CRM é opcional (etapa 8).
- [x] ✅ **Webhook do WhatsApp**: `https://crm-exponencial.vercel.app/api/webhooks/whatsapp` verificado, assinando só o campo `messages`. Conferido pela API em 21/10.
- [x] ✅ **Janela de conexão do WhatsApp (Cadastro Incorporado)**: criada pelo modelo oficial da Meta, com login pelo site do CRM liberado. O acesso de cada cliente vence em 60 dias (ver etapa 8). Em 21/10 o `config_id` fixo do app antigo foi trocado pela variável de ambiente (commit `6a88cd6`).
- [x] ✅ **Variáveis do CRM na Vercel**: ID do app, ID da configuração, chave secreta e token de verificação. As três do número de teste da Meta (`META_TEST_*`) apontam para uma conta banida e não servem mais (ver etapa 5).
- [x] ✅ **Empresa verificada**: VDA - Viver de Atacado aparece como "Verificado" no painel.
- [x] ✅ **App identificado como Provedor de Tecnologia**: refeito na BM VDA em 21/10. É o que permite conectar o WhatsApp de outras empresas.

## 2. Decisões que travam o resto

A Meta compara o nome do app, o site e a empresa verificada. Os três precisam contar a mesma história.

- [x] ✅ **Nome público do produto**: **crmatacado exp**, em minúsculo, como na logo (decidido em 21/10). Já é o nome do app na Meta. Trocar depois de publicado passa por análise da Meta.
- [x] ✅ **Dados legais para a landing**: SETE ADS 2 LTDA, CNPJ 53.756.257/0001-34, Hortolândia/SP, e-mail `atacadoexponencial@gmail.com`. "Atacado Exponencial" continua como marca da empresa; "crmatacado exp" é o produto. A razão social e o CNPJ têm que ser os da verificação da BM VDA, letra por letra.

## 3. Landing do CRM

Hoje `crm-exponencial.vercel.app` abre a página padrão do Next.js. A Meta pede um site completo que mostre o serviço e a empresa.

- [ ] ⏳ **Criar a página inicial** (Claude, pelo fluxo `/spec` → `/issue`, série **B24**). Deve mostrar o que o produto faz, para quem, como funciona a conexão com o WhatsApp, a empresa responsável (razão social, CNPJ, cidade), o contato e os links para privacidade e termos. Há uma versão pronta no branch `b22-landing-atacado-exp`, reprovada duas vezes no layout; ao retomar, perguntar o que ela quer antes de mexer.
- [ ] ⏳ **Revisar política de privacidade e termos** (Claude escreve, você aprova). Hoje citam "crmatacado exp" e "Atacado Exponencial", mas não a razão social nem o CNPJ. A análise do app avalia a URL da política. Vale já citar Instagram e anúncios, para não reescrever quando esses canais entrarem.

## 4. Verificação de acesso

Confirma que a empresa é Provedora de Tecnologia. A Meta responde em cerca de 5 dias. **Prazo: 17/11/2026**, senão o app sofre restrições. Com a troca de empresa, é feita na BM VDA.

- [x] ✅ **Tipo de empresa:** Plataforma de SaaS (decidido).
- [x] ✅ **Gerencia vários portfólios empresariais:** Não (decidido).
- [x] ✅ **Texto sobre o uso dos dados** (você revisa na hora de colar):

  > O crmatacado exp é uma plataforma de SaaS (CRM) da SETE ADS 2 LTDA para empresas atacadistas que vendem pelo WhatsApp. Cada cliente conecta o próprio número do WhatsApp Business ao CRM pelo Cadastro Incorporado da Meta. Usamos os dados da plataforma apenas para operar esse atendimento em nome do cliente: receber as mensagens enviadas pelos compradores dele, exibi-las na caixa de entrada do CRM, permitir que a equipe do cliente responda, enviar modelos de mensagem aprovados pela Meta e mostrar o status de entrega. Os dados de cada cliente ficam isolados na conta dele e não são vendidos, compartilhados nem usados para outra finalidade. O cliente pode desconectar o número a qualquer momento e pedir a exclusão dos dados.

- [ ] 🔒 **Link do site**: espera a landing.
- [ ] 🔒 **Enviar a verificação**: Claude preenche, você autoriza o envio.

## 5. Teste de conexão

Obrigatório para a análise do app: a Meta exige chamadas de API já feitas com cada permissão e um vídeo do uso real. **Feito em 21/10/2026.**

- [x] ✅ **Número dedicado**: +55 11 95504-6911, chip com o Felipe.
- [x] ✅ **Conectar pelo CRM**: pela janela da Meta, como um cliente faria: portfólio novo "Atacado Exponencial" criado dentro da janela, conta nova, número verificado por SMS. Gravado na empresa "[TESTE] Automações B11". A primeira tentativa não gravou no CRM (causa não vista); a segunda, escolhendo conta e número já existentes, gravou.
- [x] ✅ **Enviar e receber mensagens**: mensagem recebida às 18:00 e resposta com status "entregue" às 18:03 (Brasília). Modelos listados pela API.
- [x] ✅ **Contador de chamadas**: o formulário da análise já mostra "chamadas de teste de API exigidas" com check verde para mensagens.
- [ ] ⏳ **Forma de pagamento** no portfólio "Atacado Exponencial" (com você ou o Felipe). A conta responde com erro 141006: sem pagamento, não envia modelos. Receber e responder dentro de 24 horas funciona. Não trava o vídeo.
- [ ] ⏳ **Nome de exibição "Atacado Exp"** em análise pela Meta. Normal em número novo.

**Não usar o número de teste automático da Meta.** Em 21/10, as contas de teste criadas pelo painel nasceram banidas (erro 141014, `account_review_status: REJECTED`) tanto na BM da Sete quanto na BM VDA. Conta de cliente de verdade, criada pela janela, nasceu limpa. O botão "Conectar número de teste" do CRM e as variáveis `META_TEST_*` ficam sem uso até a Meta resolver isso; remover o botão depois da aprovação.

## 6. Análise do app

Libera as permissões do WhatsApp para uso com outras empresas. O formulário tem cinco partes (Verificação, Configurações do app, Uso permitido, Tratamento de dados, Instruções para o analista) e salva automaticamente; nada é enviado antes do botão final. O prazo de resposta da Meta varia, em geral de alguns dias a duas semanas. Cada permissão tem análise própria: Instagram e anúncios, se vierem, entram depois em envios separados.

- [x] ✅ **Verificação**
- [x] ✅ **Configurações do app**: nome, e-mail de contato, ícone e categoria preenchidos.
- [ ] ⏳ **Gravar o vídeo de tela** (depende do chip, com o Felipe). Um vídeo só, sem cortes, 2 a 4 minutos, legendas em inglês, serve para as duas permissões. Antes de gravar: remover o número em Configurações → WhatsApp da empresa de teste (o botão "Remover", não "Desconectar"), entrar com o usuário de teste, celular à mão. A janela da Meta pode pedir o código por SMS de novo; o chip precisa estar à mão.
  1. entrar no CRM e ir em Configurações → WhatsApp, sem número conectado;
  2. clicar em conectar, passar pela janela da Meta e escolher o portfólio "Atacado Exponencial", a conta e o número que já existem;
  3. voltar ao CRM com o número conectado;
  4. em Chat, receber uma mensagem do celular e responder pelo CRM, mostrando o "entregue";
  5. em Configurações → Templates, mostrar os modelos da conta;
  6. opcional: Configurações → WhatsApp → Desconectar.
- [ ] ⏳ **Descrição do negócio** (uma frase; é o que libera o "Começar" de cada permissão):

  > SETE ADS 2 LTDA is a Brazilian software company that offers crmatacado exp, a CRM for wholesale businesses that sell to retailers over WhatsApp.

- [ ] ⏳ **Uso permitido — `whatsapp_business_messaging`**:

  > crmatacado exp is a SaaS CRM for wholesale companies in Brazil. Each customer connects their own WhatsApp Business phone number to the CRM through Meta's Embedded Signup.
  >
  > We use whatsapp_business_messaging to: receive the messages that the customer's buyers send to the customer's WhatsApp number (via webhooks) and display them in the CRM inbox; let the customer's sales team reply to those buyers from the CRM (text and media); send approved message templates to buyers who opted in, such as order updates and follow-ups; receive delivery and read status updates to show message status in the inbox.
  >
  > Messages are exchanged only between our customer (the business that owns the phone number) and its own buyers. We never send messages on behalf of a business without its connected number, and we never message users who have not contacted the business or opted in. Each customer's data is isolated in its own account and can be deleted on request.
  >
  > The screencast shows a business connecting its number through Embedded Signup, receiving a message from a buyer in the CRM inbox, and replying from the CRM.

- [ ] ⏳ **Uso permitido — `whatsapp_business_management`**:

  > crmatacado exp uses whatsapp_business_management to manage, on behalf of each customer, the WhatsApp Business Account the customer connects through Embedded Signup: read the connected phone number and its display name to show the connection status in the CRM; subscribe our app to the customer's WhatsApp Business Account webhooks so that incoming messages reach the CRM inbox; list the customer's message templates and their approval status, so the sales team can pick an approved template when starting a conversation; disconnect the number when the customer asks.
  >
  > We only access the WhatsApp Business Accounts that our customers explicitly connect to their own CRM account. We do not access or manage any other business portfolio.
  >
  > The screencast shows the connection flow, the connected number in the CRM settings, and the list of message templates loaded from the customer's account.

- [ ] ⏳ **Uso permitido — `public_profile`**: só o aceite.
- [ ] ⏳ **Tratamento de dados** (com você). As perguntas exatas só aparecem quando a seção abre. Respostas: dados armazenados, sim; fornecedores que processam dados: Supabase (banco e autenticação, AWS, EUA) e Vercel (hospedagem, EUA); empresa responsável: SETE ADS 2 LTDA, Brasil, CNPJ 53.756.257/0001-34; transferência para fora do país: sim, EUA, pelos fornecedores acima; pedidos de autoridades públicas nos últimos 12 meses: não; uso dos dados: só para operar o atendimento em nome do cliente, sem venda nem compartilhamento.
- [ ] ⏳ **Instruções para o analista** (você cria o login de teste na empresa "[TESTE] Automações B11", papel Admin, e digita a senha direto no campo da Meta):

  > crmatacado exp is a CRM for wholesale businesses in Brazil. The interface is in Portuguese; the screencast has English captions.
  >
  > Test access — URL: https://crm-exponencial.vercel.app/login — Email: [e-mail do usuário de teste] — Password: [senha]. This test account belongs to a test company with sample data only.
  >
  > How to review the WhatsApp integration: 1. Log in with the credentials above. 2. In the left menu, open "Configurações" > "WhatsApp". You will see the WhatsApp Business number connected to this test company through Embedded Signup. The "Conectar" button opens Meta's Embedded Signup window when no number is connected. 3. Open "Chat" in the left menu. This is the inbox. Messages sent by buyers to the connected number appear here in real time, and replies typed here are sent through the WhatsApp Business Platform. 4. Open "Configurações" > "Templates". This page lists the message templates of the connected WhatsApp Business Account, with their approval status. 5. "Campanhas" sends approved templates to contacts who opted in.
  >
  > Notes: the connected number belongs to our own test business; you can send a WhatsApp message to it from any phone to see it arrive in the inbox, and we will reply during business hours. Privacy policy: https://crm-exponencial.vercel.app/politica-de-privacidade — Terms: https://crm-exponencial.vercel.app/termos-de-servico

- [ ] 🔒 **Enviar para análise**: você autoriza o envio.

## 7. Publicar

Só depois da análise aprovada. Até lá, só quem tem função no app consegue passar pela janela de conexão.

- [ ] 🔒 **Publicar o app**: você autoriza.
- [ ] 🔒 **Conferir uma mensagem real chegando ao CRM** (juntos).

## 8. Antes do primeiro cliente real

A Meta não exige nada disto, por isso fica por último. Mas conectar clientes sem estes pontos traz risco.

- [ ] ➖ **Acesso que não vence em 60 dias.** Hoje a conexão de cada cliente cai depois de 60 dias, porque o CRM não renova o acesso. Há dois caminhos:
  - criar uma configuração sem vencimento. A opção pode ter aparecido agora que o app é Provedor de Tecnologia;
  - fazer o CRM renovar o acesso sozinho.
- [ ] ➖ **Segundo administrador no app e no Gerenciador de Negócios.** Hoje o app depende só da conta do Felipe. Se ela for bloqueada, o app fica sem dono. Adicionar a Marcelle como administradora do app também evita depender da conta dele para gravar e conectar.
- [ ] ➖ **Receber mídia pela API Oficial.** O webhook da Meta no CRM só lê texto. Fotos, áudios e documentos enviados pelos compradores não aparecem.
- [ ] ➖ **Separar o banco de testes do de produção.**
- [ ] ➖ **Regras de disparo nas campanhas.** Enviar só para quem aceitou receber, usar modelos aprovados e aumentar o volume aos poucos, acompanhando a qualidade do número.
- [ ] ➖ **E-mail de contato do app com domínio da empresa.** Hoje é um Gmail pessoal (`felipeflautist@gmail.com`), e é por ele que a Meta manda os avisos importantes.
- [ ] ➖ **Trocar o ícone pelo cubo do CRM.** O arquivo está pronto em `OneDrive\05. Seteads - AE\icone-crm-exponencial-1024.png`.
- [ ] ➖ **Remover o botão "Conectar número de teste"** e as variáveis `META_TEST_*` depois da aprovação. O código também mostra o número de teste antigo "+1 555 631 2003" fixo em `actions.ts`.
- [ ] ➖ **Corrigir a primeira tentativa de conexão que não gravou.** Em 21/10 a janela da Meta concluiu e o CRM não salvou a conexão; a segunda tentativa salvou. Sem registro do erro; se repetir com cliente, investigar `completarConexaoWhatsApp`.

## Por que o app mudou de empresa (21/10/2026)

Com o app na Sete - Performance Marketing, a janela de conexão da Meta respondia "Sete - Performance Marketing não pode integrar clientes no momento", mesmo com a conta do Felipe, que é administradora. As contas de teste automáticas do painel nasciam banidas (erro 141014). O app foi transferido para a BM VDA - Viver de Atacado (Analisar → Verificação → Remover, depois conectar à empresa nova). Na VDA, a conta de teste automática também nasceu banida, mas a janela abriu normal e a conexão de um número como cliente funcionou de ponta a ponta. Conclusão: a restrição de provedor era do portfólio da Sete; o ban das contas de teste automáticas segue o administrador e não afeta cliente real. Recurso na Meta sobre as contas de teste fica adiado.

---

*A Meta muda telas e regras com frequência. Cada etapa é conferida de novo no painel na hora de executar.*
