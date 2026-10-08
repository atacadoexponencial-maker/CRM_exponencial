# Spec: Segurança — rodada 3 (falhas médias)

> Origem: auditoria de segurança de 06/10/2026. Rodadas 1 (B19, críticos) e 2 (B20,
> altos) no ar em 06/10. Pedido da Marcelle em 08/10: "Pode seguir". Triagem:
> **arquitetural** — muda a regra de acesso do papel Atendente em todo o CRM (servidor e
> banco), mexe nas regras de acesso de várias tabelas e no comportamento de rotas públicas.

## Visão Geral

Sete brechas de gravidade média continuam abertas:

1. **Atendente alcança o que é de colegas.** As telas do chat e de contatos já mostram
   só o que é dele, mas o banco e várias ações aceitam qualquer conversa, card ou contato
   da empresa — basta saber o código (ex.: abrir contato alheio pela URL, gravar mensagem
   ou histórico falso numa conversa de colega, trocar responsável).
2. **Qualquer papel gerencia times.** Atendente consegue criar, renomear e apagar times e
   mexer em quem está em cada time, direto pelo banco.
3. **Referências entre empresas.** Em várias tabelas, um registro da empresa A pode apontar
   para algo da empresa B (pôr usuário de outra empresa num time, automação usando etiqueta
   ou atendente de outra empresa, sequência rodando para contato de outra empresa, etc.).
4. **Botão "Conectar número de teste" da Meta em produção.** Qualquer empresa pode ligar o
   número de teste da Meta, que é um só e compartilhado entre todas.
5. **Crons e webhook da Meta abertos se faltar o segredo.** Se a variável do segredo
   estiver vazia, as rotas de campanhas, sequências e o webhook da Meta aceitam chamada de
   qualquer um (o cron da lixeira já recusa — vira o padrão).
6. **Pedido da loja mexe em contato existente e não tem freio.** Um pedido feito com o
   WhatsApp de um contato que já existe tira o contato da lixeira e preenche o nome dele com
   o que o visitante digitou; e um robô pode criar pedidos sem limite.
7. **Faltam cabeçalhos de segurança.** O CRM pode ser embutido em outro site (golpe de
   clique disfarçado) e o navegador não recebe as proteções básicas.

Como nas rodadas anteriores: cada brecha fechada ganha um teste automatizado que reproduz
o ataque. Ao contrário delas, **esta rodada muda algo visível para o Atendente** (item 1).

### Decisões da Marcelle (08/10/2026)

| Pergunta | Decisão |
|---|---|
| O que o Atendente alcança | **Só as conversas e os cards dele**, valendo no servidor e no banco |
| Botão "Conectar número de teste" | **Escondido em produção**, liberado só por variável de ambiente |
| Pedido da loja com WhatsApp de contato existente | **Só liga o pedido ao contato** — não tira da lixeira, não muda o nome. Mais limite de pedidos por endereço de internet |

### Premissas (a confirmar na aprovação)

- **"Dele" para o Atendente** é: conversas em que ele é o responsável; cards do funil em que
  ele é o atendente; contatos ligados a uma dessas conversas ou cards. É a mesma regra que
  a lista de contatos já usa hoje.
- **Conversa sem responsável** continua não aparecendo para o Atendente (como hoje no chat).
  Quem distribui é Admin/Gerente.
- **Lead criado pelo Atendente** ("Novo lead" no funil) nasce com ele como atendente e,
  portanto, é dele.
- **Admin e Gerente** continuam vendo e agindo em tudo da empresa, como hoje.
- **Limite da loja:** no máximo **10 pedidos por hora por endereço de internet**, por loja.
  Passou do limite, o cliente vê "Muitos pedidos em pouco tempo. Aguarde alguns minutos e
  tente de novo." e nada é gravado.
- **Número de teste:** fica disponível só quando a variável de ambiente que o libera estiver
  ligada (em desenvolvimento local, por exemplo). Em produção ela fica desligada.
- **Cabeçalhos:** proibir o CRM dentro de moldura de outro site, impedir o navegador de
  adivinhar o tipo de arquivo, forçar conexão segura e limitar o que vai no "de onde veio".
  A política completa de conteúdo (CSP) fica de fora, pelo risco de quebrar o login da Meta.

### Regras gerais

- Toda regra fica no servidor e no banco; a tela só mostra o resultado.
- Toda brecha fechada tem um teste automatizado que reproduz o ataque.
- Nenhum fluxo legítimo de Admin/Gerente muda. Para o Atendente, só muda o que ele deixa
  de ver (cards e contatos de colegas).

---

## Módulos

### 1. Escopo do Atendente (chat, funil, contatos, agenda)

**Descrição:** O Atendente só vê e só age nas conversas, cards e contatos que são dele, em
todas as portas: telas, ações do CRM e leitura/gravação direta no banco.

**Componentes:**
- Caixa de entrada e conversa do chat (sem mudança visual).
- Funis Entrada e Recompra (passam a mostrar só os cards dele).
- Lista e perfil de contato (sem mudança visual na lista).
- "Novo follow-up" da agenda (a escolha de contato passa a listar só os dele).

**Comportamentos:**
- **Atendente abre o chat:** vê só as conversas em que é responsável, como hoje.
- **Atendente responde, envia mídia, etiqueta e usa mensagem rápida na conversa dele:**
  funciona como hoje.
- **Atendente abre o funil Entrada ou Recompra:** vê só os cards em que é o atendente.
- **Atendente move card, adiciona nota e abre o painel do card dele:** funciona como hoje.
- **Atendente cria um novo lead:** o card nasce com ele como atendente e aparece no funil dele.
- **Atendente abre a lista de contatos:** vê só os dele, como hoje.
- **Atendente abre o perfil de um contato dele:** vê dados, compras e linha do tempo, como hoje.
- **Atendente abre "Novo follow-up":** a busca de contato só traz contatos dele.
- **Atendente abre a agenda:** vê só os lembretes e follow-ups dele, como hoje.
- **Admin ou Gerente reatribui uma conversa ou card de um atendente para outro:** o novo
  responsável passa a ver; o antigo deixa de ver na próxima carga da tela.
- **Admin e Gerente:** continuam vendo tudo da empresa em todas essas telas.
- **Ataque recusado — abrir contato alheio pela URL:** o perfil mostra "Contato não
  encontrado", sem dados, compras nem linha do tempo.
- **Ataque recusado — etiquetar, editar ou excluir contato alheio:** recusado; nada muda.
- **Ataque recusado — ler conversas, mensagens, cards ou contatos alheios direto no banco:**
  com a sessão do Atendente, o banco não devolve nada que não seja dele.
- **Ataque recusado — gravar mensagem ou histórico falso numa conversa ou card de colega:**
  recusado; nada é gravado.
- **Ataque recusado — trocar o responsável de uma conversa ou card:** o Atendente não
  consegue se pôr (nem pôr outro) como responsável de algo, pelo CRM ou pelo banco.
- **Ataque recusado — trocar o contato de uma conversa ou card:** recusado; nada muda.
- **Ataque recusado — agendar follow-up para contato alheio:** recusado; nada é gravado.

### 2. Times (`/configuracoes/times`)

**Descrição:** Só o Admin cria, edita e apaga times e define quem está em cada time.

**Comportamentos:**
- **Admin cria, renomeia e apaga time:** funciona como hoje.
- **Admin adiciona e remove usuário de um time:** funciona como hoje.
- **Gerente e Atendente veem os times:** onde já aparecem hoje (filtros, perfil), sem mudança.
- **Ataque recusado — Atendente ou Gerente cria, renomeia ou apaga time pelo banco:**
  recusado; nada muda.
- **Ataque recusado — Atendente ou Gerente se põe (ou põe outro) num time pelo banco:**
  recusado; nada muda.

### 3. Referências entre empresas (todo o CRM)

**Descrição:** Nenhum registro de uma empresa pode apontar para algo de outra empresa —
usuário, time, contato, conversa, card, etiqueta, número, sequência ou automação.

**Comportamentos:**
- **Usar o CRM normalmente:** times, automações, sequências, chat, funil, campanhas e
  etiquetas continuam funcionando como hoje.
- **Ataque recusado — pôr usuário de outra empresa num time:** recusado.
- **Ataque recusado — automação com etiqueta, atendente, time, sequência ou número de outra
  empresa:** salvar a automação é recusado; nada é gravado.
- **Ataque recusado — iniciar sequência para contato ou conversa de outra empresa:** recusado.
- **Ataque recusado — gravar mensagem, etiqueta, nota ou histórico ligando registros de
  empresas diferentes:** recusado.
- **Dados antigos:** antes de fechar, uma verificação confirma que não existe hoje nenhum
  registro apontando para outra empresa (e, se existir, ele é listado para a Marcelle
  decidir antes de seguir).

### 4. Conexão do número de teste da Meta (`/configuracoes/whatsapp`)

**Descrição:** O botão "Conectar número de teste" e a ação por trás dele só existem quando
uma variável de ambiente os libera; em produção ficam desligados.

**Comportamentos:**
- **Admin abre a conexão de WhatsApp em produção:** não vê o botão "Conectar número de
  teste" (nem na tela, nem no assistente de conexão).
- **Conectar número pelo cadastro oficial da Meta ou pelo canal direto:** funciona como hoje.
- **Desenvolvimento com a variável ligada:** o botão aparece e funciona como hoje.
- **Ataque recusado — chamar a ação do número de teste direto em produção:** recusado;
  nenhuma conexão é criada.
- **Empresa que já tem o número de teste conectado:** a conexão existente não é apagada
  por esta rodada.

### 5. Crons e webhook da Meta

**Descrição:** As rotas automáticas de campanhas e sequências e o webhook da Meta recusam
toda chamada quando o segredo não está configurado — o mesmo que o cron da lixeira já faz.

**Comportamentos:**
- **Cron de campanhas e de sequências com segredo certo:** roda como hoje.
- **Webhook da Meta com assinatura válida:** recebe mensagens e status como hoje.
- **Verificação do webhook pela Meta com o token certo:** funciona como hoje.
- **Ataque recusado — chamar cron sem segredo ou com segredo errado:** recusado; nada roda.
- **Ataque recusado — segredo vazio no servidor:** toda chamada é recusada (em vez de liberada).
- **Ataque recusado — mandar evento falso ao webhook sem assinatura válida, ou com o
  segredo do app vazio no servidor:** recusado; nada é gravado.

### 6. Pedidos da loja (`/loja/...`)

**Descrição:** Um pedido feito com o WhatsApp de um contato que já existe só é ligado a ele;
e cada endereço de internet tem limite de pedidos por hora.

**Comportamentos:**
- **Cliente novo faz pedido:** cria contato e pedido, como hoje.
- **Cliente com WhatsApp já cadastrado faz pedido:** o pedido é ligado ao contato existente;
  o nome do contato não muda.
- **Pedido de contato que está na lixeira:** o pedido é ligado a ele, e ele continua na
  lixeira (a empresa vê o pedido e decide se restaura).
- **Passar do limite de pedidos:** a tela mostra "Muitos pedidos em pouco tempo. Aguarde
  alguns minutos e tente de novo." e nada é gravado.
- **Ataque recusado — trocar o nome de um contato pela loja:** o nome gravado continua o original.
- **Ataque recusado — tirar contato da lixeira pela loja:** ele continua na lixeira.
- **Ataque recusado — pedidos em massa por robô:** a partir do limite, o servidor recusa
  sem criar pedido nem contato.

### 7. Cabeçalhos de segurança (todo o site)

**Descrição:** Toda página do CRM, da loja e das páginas públicas sai com as proteções
básicas do navegador.

**Comportamentos:**
- **Usar o CRM, a loja e o login com a Meta:** tudo funciona como hoje.
- **Ataque recusado — embutir o CRM numa moldura de outro site:** o navegador não exibe.
- **Ataque recusado — arquivo disfarçado de outro tipo:** o navegador não adivinha o tipo.
- **Conexão sem segurança:** o navegador passa a usar sempre a conexão segura.

---

## Critério de pronto

- Cada "Ataque recusado" tem teste automatizado passando.
- Os testes existentes, o build e o lint passam.
- Mudanças no banco aplicadas no Supabase de produção, com o código que depende delas no
  ar **antes** de a regra fechar (ordem que funcionou nas rodadas 1 e 2).
- Teste manual curto da Marcelle: entrar como atendente de teste e conferir chat, funil,
  contatos e "Novo follow-up"; conferir que o botão do número de teste sumiu; fazer um
  pedido na loja com um WhatsApp já cadastrado.

## Fora desta rodada

- Itens baixos da auditoria.
- Política completa de conteúdo (CSP).
- Achados de QA que não são de segurança (`.qa-agentes/ACHADOS.md`), exceto A1 e A2, que
  entram aqui no módulo 1.
- Tornar o repositório do GitHub privado (ação da Marcelle).
