# Publicação do CRM na Meta — checklist

Tudo o que falta para o app **CRM Exponencial** sair do modo "não publicado" e passar a conectar o WhatsApp dos clientes pela API Oficial, na ordem em que a Meta exige. Levantado direto do painel do app em 18/09/2026.

- **ID do app:** `1638896020699607`
- **Empresa:** Sete - Performance Marketing (`639780553124227`)
- **Configuração de login (Cadastro Incorporado):** `1039784419039146`

**Legenda:** ✅ feito · ⏳ pendente · 🔒 bloqueado, esperando outro item · ➖ opcional, não exigido pela Meta

> **O que destrava tudo agora:** decidir o **nome público do produto** e passar os **dados legais da empresa**. Sem isso não sai a landing, e sem a landing não dá para enviar a verificação de acesso (prazo **17/11/2026**). O **teste de conexão** não depende de nenhum dos dois e pode ser feito em paralelo.

---

## 1. Configuração do app

A base técnica: o app conversa com o CRM e a Meta sabe onde entregar as mensagens.

- [x] ✅ **Configurações básicas**: domínio, política de privacidade, termos, exclusão de dados (como URL de retorno de chamada) e categoria "Negócio e Páginas".
- [x] ✅ **Ícone do app**: hoje é o símbolo do Gestor Exponencial. Trocar pelo cubo do CRM é opcional (etapa 8).
- [x] ✅ **Webhook do WhatsApp**: `https://crm-exponencial.vercel.app/api/webhooks/whatsapp` verificado, assinando só o campo `messages`.
- [x] ✅ **Janela de conexão do WhatsApp (Cadastro Incorporado)**: criada pelo modelo oficial da Meta, com login pelo site do CRM liberado. O acesso de cada cliente vence em 60 dias (ver etapa 8).
- [x] ✅ **Variáveis do CRM na Vercel**: ID do app, ID da configuração, chave secreta e token de verificação trocados, com o CRM publicado de novo.
- [x] ✅ **Empresa verificada**: Sete - Performance Marketing aparece como "Verificado" no painel.
- [x] ✅ **App identificado como Provedor de Tecnologia**: decisão irreversível, já tomada. É o que permite conectar o WhatsApp de outras empresas.

## 2. Decisões que travam o resto

A Meta compara o nome do app, o site e a empresa verificada. Os três precisam contar a mesma história.

- [ ] ⏳ **Nome público do produto** (com você e os sócios). Vai aparecer no nome do app (na janela que o cliente vê ao conectar), na landing, nos vídeos e nos textos da Meta. Trocar depois de publicado passa por análise da Meta.
  - Não pode conter "WhatsApp", "Facebook", "Meta" ou "Instagram".
  - Não pode parecer outra empresa ou produto.
- [ ] ⏳ **Dados legais para a landing** (com você):
  - razão social e CNPJ, iguais aos da verificação da Meta;
  - cidade e UF, ou o endereço completo;
  - e-mail de contato (os termos usam `atacadoexponencial@gmail.com`);
  - telefone ou WhatsApp de contato, se for mostrar;
  - relação entre as marcas: Sete - Performance Marketing, Atacado Exponencial e o produto.

## 3. Landing do CRM

Hoje `crm-exponencial.vercel.app` abre a página padrão do Next.js. A Meta pede um site completo que mostre o serviço e a empresa.

- [ ] 🔒 **Criar a página inicial** (Claude, pelo fluxo `/spec` → `/issue`). Deve mostrar o que o produto faz, para quem, como funciona a conexão com o WhatsApp, a empresa responsável (razão social, CNPJ, cidade), o contato e os links para privacidade e termos. Espera a etapa 2.
- [ ] 🔒 **Revisar política de privacidade e termos** (Claude escreve, você aprova). Conferir se citam o nome do produto, a empresa responsável e o uso de dados do WhatsApp. A análise do app avalia a URL da política.

## 4. Verificação de acesso

Confirma que a Sete é Provedora de Tecnologia. A Meta responde em cerca de 5 dias. **Prazo: 17/11/2026**, senão o app sofre restrições.

- [x] ✅ **Tipo de empresa:** Plataforma de SaaS (decidido).
- [x] ✅ **Gerencia vários portfólios empresariais:** Não (decidido).
- [ ] ⏳ **Texto sobre o uso dos dados** (rascunho pronto, você revisa; trocar "CRM Exponencial" pelo nome definitivo):

  > O CRM Exponencial é uma plataforma de SaaS (CRM) para empresas atacadistas que vendem pelo WhatsApp. Cada cliente conecta o próprio número do WhatsApp Business ao CRM pelo Cadastro Incorporado da Meta. Usamos os dados da plataforma apenas para operar esse atendimento em nome do cliente: receber as mensagens enviadas pelos compradores dele, exibi-las na caixa de entrada do CRM, permitir que a equipe do cliente responda, enviar modelos de mensagem aprovados pela Meta e mostrar o status de entrega. Os dados de cada cliente ficam isolados na conta dele e não são vendidos, compartilhados nem usados para outra finalidade. O cliente pode desconectar o número a qualquer momento e pedir a exclusão dos dados.

- [ ] 🔒 **Link do site**: espera a landing.
- [ ] 🔒 **Enviar a verificação**: Claude preenche, você autoriza o envio.

## 5. Teste de conexão

Obrigatório para a análise do app: a Meta exige chamadas de API já feitas com cada permissão (hoje: 0) e um vídeo do uso real. Não depende do nome, então pode ser feito já.

- [ ] ⏳ **Separar um número para o teste** (com você). O mais seguro é um número dedicado: um número em uso no aplicativo do WhatsApp pode deixar de funcionar nele ao ser conectado à API. Não use o chip principal.
- [ ] ⏳ **Conectar pelo CRM** (juntos), em *Configurações → WhatsApp*, com a conta do Felipe. Enquanto o app não é publicado, só quem tem função no app consegue conectar.
- [ ] ⏳ **Enviar e receber mensagens** (juntos). Mandar do celular para o número, responder pelo CRM e listar os modelos de mensagem. Isso gera chamadas para `whatsapp_business_messaging` e `whatsapp_business_management`.
- [ ] ⏳ **Forma de pagamento na conta do WhatsApp** (com você). A Meta exige para enviar mensagens iniciadas pela empresa (modelos). Sem ela, só dá para responder dentro de 24 horas.
- [ ] ⏳ **Confirmar o contador de chamadas acima de zero** (Claude), em *Casos de uso → Permissões e recursos*. Pode levar até 24 horas para aparecer.

## 6. Análise do app

Libera as permissões do WhatsApp para uso com outras empresas. O formulário tem cinco partes. O prazo de resposta da Meta varia, em geral de alguns dias a duas semanas.

- [x] ✅ **Verificação**
- [x] ✅ **Configurações do app**: nome, e-mail de contato, ícone e categoria preenchidos.
- [ ] 🔒 **Gravar o vídeo de tela** (espera o nome e o teste). Um fluxo de ponta a ponta, com legendas em inglês, porque a tela do CRM é em português:
  1. entrar no CRM e ir em Configurações → WhatsApp;
  2. clicar em conectar, passar pela janela da Meta e escolher empresa, conta e número;
  3. voltar ao CRM com o número conectado;
  4. receber uma mensagem do celular na caixa de entrada e responder pelo CRM;
  5. mostrar os modelos de mensagem da conta.
- [ ] 🔒 **Uso permitido** (Claude escreve, você revisa). Para `whatsapp_business_messaging` e `whatsapp_business_management`: descrição do uso, vídeo, chamadas de teste feitas e aceite das políticas. Para `public_profile`: só o aceite.
- [ ] ⏳ **Tratamento de dados** (com você). Perguntas sobre quem guarda os dados e como. Deve incluir os fornecedores que processam dados (Supabase, Vercel), a empresa responsável e o país, e se houve pedidos de autoridades públicas nos últimos 12 meses. As perguntas exatas só aparecem quando a seção abre; se houver alguém cuidando do jurídico, confirmar com essa pessoa.
- [ ] ⏳ **Instruções para o analista** (Claude escreve, você cria o acesso). Passo a passo em inglês para o avaliador entrar no CRM e ver o fluxo, com um login de teste criado só para ele.
- [ ] 🔒 **Enviar para análise**: você autoriza o envio.

## 7. Publicar

Só depois da análise aprovada. Até lá, o app recebe apenas as mensagens de teste disparadas pelo painel, nunca as reais.

- [ ] 🔒 **Publicar o app**: você autoriza.
- [ ] 🔒 **Conferir uma mensagem real chegando ao CRM** (juntos).

## 8. Antes do primeiro cliente real

A Meta não exige nada disto, por isso fica por último. Mas conectar clientes sem estes pontos traz risco.

- [ ] ➖ **Acesso que não vence em 60 dias.** Hoje a conexão de cada cliente cai depois de 60 dias, porque o CRM não renova o acesso. Há dois caminhos:
  - criar uma configuração sem vencimento. A opção pode ter aparecido agora que o app é Provedor de Tecnologia;
  - fazer o CRM renovar o acesso sozinho.
- [ ] ➖ **Segundo administrador no app e no Gerenciador de Negócios.** Hoje o app depende só da conta do Felipe. Se ela for bloqueada, o app fica sem dono.
- [ ] ➖ **Receber mídia pela API Oficial.** O webhook da Meta no CRM só lê texto. Fotos, áudios e documentos enviados pelos compradores não aparecem.
- [ ] ➖ **Separar o banco de testes do de produção.**
- [ ] ➖ **Regras de disparo nas campanhas.** Enviar só para quem aceitou receber, usar modelos aprovados e aumentar o volume aos poucos, acompanhando a qualidade do número.
- [ ] ➖ **E-mail de contato do app com domínio da empresa.** Hoje é um Gmail pessoal (`felipeflautist@gmail.com`), e é por ele que a Meta manda os avisos importantes.
- [ ] ➖ **Trocar o ícone pelo cubo do CRM.** O arquivo está pronto em `OneDrive\05. Seteads - AE\icone-crm-exponencial-1024.png`.

---

*A Meta muda telas e regras com frequência. Cada etapa é conferida de novo no painel na hora de executar.*
