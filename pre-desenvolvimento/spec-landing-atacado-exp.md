# Spec: Landing do Atacado Exp (B22)

## Visão Geral

Hoje quem abre `crm-exponencial.vercel.app` vê a página padrão do Next.js ("To get
started, edit the page.tsx file"). A Meta exige um site de verdade para liberar o app.
É esse site que ela confere na **verificação de acesso** (prazo **17/11/2026**) e na
**análise do app**. Ele precisa contar a mesma história do nome do app e da empresa
verificada.

Esta mudança:

1. troca a página inicial por uma **landing do Atacado Exp**, que explica o que o produto
   faz, para quem é, como funciona a conexão com o WhatsApp, quem é a empresa responsável
   e como entrar em contato;
2. revisa a **Política de Privacidade** e os **Termos de Serviço** para usar o nome
   Atacado Exp, apontar a SETE ADS LTDA como responsável e descrever o uso dos dados
   recebidos do WhatsApp.

**Para quem:**
- o analista da Meta, que precisa ver um serviço real com empresa identificável;
- o atacadista que chega pelo link e quer entender o produto e entrar.

**Dados fixos que aparecem no site:**

| Item | Valor |
|---|---|
| Produto | Atacado Exp |
| Empresa responsável | SETE ADS LTDA (nome fantasia Sete Ads). Atacado Exp é um produto da Sete Ads |
| CNPJ | 22.987.352/0001-15 |
| Endereço | Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604 |
| Contato | `atacadoexponencial@gmail.com` (só e-mail, nenhum telefone ou WhatsApp) |

**Regras de texto (vêm da Meta):**
- O nome do produto nunca é escrito junto com "WhatsApp", "Meta", "Facebook" ou
  "Instagram" como se fosse um nome só. Pode dizer "conecta ao WhatsApp", mas não
  "Atacado Exp WhatsApp".
- O site não pode parecer da Meta nem do WhatsApp. Não usa logos dessas empresas e não
  sugere parceria oficial. Pode dizer que a conexão usa a **API Oficial do WhatsApp
  Business**, da Meta.
- O site **não promete** o que ainda não existe: a coexistência (usar o WhatsApp
  Business no celular junto com o CRM), preços, planos e período de teste.
- O site **não menciona** o canal direto (conexão por QR Code), porque a análise da Meta
  avalia só o uso da API Oficial.

**Fora do escopo:**
- Renomear "CRM Exponencial" para "Atacado Exp" dentro do sistema logado (menu, título
  das abas, e-mails). Fica para uma mudança própria.
- Trocar o nome do app no painel da Meta. É uma tarefa manual da etapa 6 do checklist.
- Página de preços, blog, formulário de contato, chat no site.
- Versão em inglês. O vídeo da análise leva legendas em inglês, e o site fica em
  português.

---

## Páginas / Módulos

### 1. Página inicial — landing (`/`)

**Descrição:** página pública de apresentação do Atacado Exp. Abre sem login, inclusive
para quem já está logado. Ela segue a aparência do CRM (tema escuro, mesmas cores e
fontes) para que o visitante reconheça o produto ao entrar.

**Componentes:**
- **Cabeçalho:** símbolo (o cubo) e nome "Atacado Exp" à esquerda, e o botão **Entrar** à direita. No celular, o botão
  continua visível sem menu escondido.
- **Abertura:** título que diz em uma frase o que é o produto. Exemplo: "O CRM para
  atacadistas que vendem pelo WhatsApp". Abaixo, um subtítulo de uma ou duas linhas sobre
  o método de vendas exponencial: separar quem prospecta cliente novo (Entrada) de quem
  cuida de quem já comprou (Recompra). Depois, o botão **Entrar**. Não há botão de criar conta.
- **Para quem é:** bloco curto que descreve o cliente: atacadistas e marcas que vendem no
  atacado, atendem pelo WhatsApp e têm um time de vendedores, com papéis de
  administrador, gerente e atendente.
- **O que o Atacado Exp faz:** grade de cartões, um por recurso, cada um com título e
  uma frase:
  - **Caixa de entrada do WhatsApp:** todas as conversas do número da empresa num só
    lugar, com envio de texto, imagem, áudio e documento, etiquetas e mensagens rápidas;
  - **Funis de Entrada e Recompra:** cada lead no seu estágio, do primeiro contato à
    recompra;
  - **Contatos:** histórico de cada cliente, compras e etiquetas;
  - **Sequências e agenda:** lembretes de follow-up para o vendedor não esquecer
    ninguém;
  - **Campanhas:** envio de modelos de mensagem aprovados para listas segmentadas, com
    relatório de entrega;
  - **Automações:** regras que movem o lead, marcam etiquetas e disparam mensagens
    sozinhas;
  - **Catálogo e loja:** vitrine de produtos com pedido que chega pelo WhatsApp;
  - **Painel:** números do time e de cada vendedor.
- **Como funciona a conexão com o WhatsApp:** três ou quatro passos numerados:
  1. a empresa entra no Atacado Exp;
  2. o administrador clica em conectar e entra na janela oficial da Meta (Cadastro
     Incorporado), onde escolhe a empresa, a conta do WhatsApp Business e o número;
  3. as mensagens que os compradores mandam para o número passam a chegar na caixa de
     entrada, e o time responde por ali;
  4. o administrador pode desconectar o número quando quiser.

  Junto dos passos, uma nota curta: a conexão usa a API Oficial do WhatsApp Business, o
  envio de modelos de mensagem segue as regras e os preços da Meta, cobrados direto na
  conta da empresa, e o número conectado deixa de funcionar no aplicativo do celular.
- **Seus dados:** bloco curto que resume a privacidade:
  - cada empresa só vê os próprios dados;
  - os dados não são vendidos nem usados para publicidade;
  - a empresa pode pedir a exclusão dos dados a qualquer momento.

  Termina com link para a Política de Privacidade.
- **Rodapé:**
  - "Atacado Exp é um produto da SETE ADS LTDA";
  - CNPJ e endereço completos;
  - e-mail de contato como link de e-mail;
  - links para **Política de Privacidade** e **Termos de Serviço**;
  - "© [ano atual] Sete Ads".
- **Título da aba e descrição para buscadores:** "Atacado Exp — CRM para atacadistas
  que vendem pelo WhatsApp", com descrição de uma frase no mesmo tom.

**Comportamentos:**
- **Abrir a landing sem login:** qualquer pessoa que acessa `/` vê a landing, sem ser
  mandada para o login.
- **Abrir a landing logado:** quem já tem sessão também vê a landing. Ao clicar em
  Entrar, segue o comportamento atual do login.
- **Entrar pelo cabeçalho:** o botão Entrar do cabeçalho leva para `/login`.
- **Entrar pela abertura:** o botão Entrar da abertura leva para `/login`.
- **Abrir a Política de Privacidade:** o link do bloco "Seus dados" e o do rodapé
  levam para `/politica-de-privacidade`.
- **Abrir os Termos de Serviço:** o link do rodapé leva para `/termos-de-servico`.
- **Escrever para o contato:** clicar no e-mail do rodapé abre o programa de e-mail do
  visitante com `atacadoexponencial@gmail.com` como destinatário.
- **Ler no celular:** em tela estreita, os blocos ficam um abaixo do outro, os cartões
  de recurso viram uma coluna, nada passa da largura da tela e os botões continuam
  fáceis de tocar.
- **Ler sem imagens:** se o símbolo não carregar, o nome "Atacado Exp" continua
  legível no cabeçalho.
- **Página leve:** a landing não depende de login nem de consulta ao banco para
  aparecer. Abre rápido mesmo com o banco fora do ar.

---

### 2. Política de Privacidade (`/politica-de-privacidade`)

**Descrição:** a página já existe e cita "CRM Exponencial, operado por Atacado
Exponencial". A revisão atualiza a política para o produto e a empresa reais e
detalha o uso dos dados do WhatsApp, que é o que a análise da Meta avalia. A
aparência continua a mesma, só o texto muda.

**Componentes (o que o texto passa a dizer):**
- **Título da aba:** "Política de Privacidade — Atacado Exp".
- **Data da última atualização:** a data em que a revisão entrar no ar.
- **Quem somos:** o Atacado Exp é um produto da **SETE ADS LTDA**, CNPJ e endereço
  completos.
- **Papéis na LGPD:**
  - para os dados dos **compradores** (contatos e conversas), a empresa cliente é a
    **controladora** e a Sete Ads é a **operadora**, que trata os dados só para prestar
    o serviço;
  - para os dados dos **usuários do sistema** (nome, e-mail), a Sete Ads é a
    controladora.
- **Dados recebidos do WhatsApp:** lista do que chega pela API Oficial:
  - mensagens de texto e mídia (imagem, áudio, vídeo, documento);
  - número de telefone e nome de perfil de quem escreve;
  - status de entrega e leitura;
  - dados do número conectado (número, nome verificado, identificadores da conta);
  - modelos de mensagem da conta.
- **Para que usamos:** receber e mostrar as conversas na caixa de entrada, permitir que
  o time responda, enviar modelos aprovados e campanhas pedidas pela empresa cliente,
  mostrar status de entrega, organizar funis, contatos e automações. Nada além disso.
- **O que não fazemos:** não vendemos, não alugamos e não usamos para publicidade. Não
  usamos os dados de uma empresa para outra empresa nem para treinar modelos de
  inteligência artificial.
- **Com quem compartilhamos (operadores):**
  - **Meta** (API do WhatsApp Business), por onde as mensagens passam, com link para a
    política de privacidade do WhatsApp;
  - **Supabase** (banco de dados e arquivos);
  - **Vercel** (hospedagem do site).

  Os três ficam **fora do Brasil (Estados Unidos)**. Por isso, a política tem uma frase
  sobre transferência internacional de dados, com a garantia oferecida.
- **Por quanto tempo guardamos:**
  - enquanto a conta da empresa estiver ativa;
  - contato apagado vai para a lixeira e some de vez em 30 dias;
  - ao encerrar a conta ou desconectar e pedir exclusão, os dados são apagados em até
    30 dias, salvo obrigação legal.
- **Como pedir a exclusão:** por e-mail. Quem conectou pelo login da Meta também pode
  pedir pela própria Meta, e o pedido chega automaticamente ao Atacado Exp.
- **Direitos do titular:** a lista atual (acesso, correção, exclusão, portabilidade,
  revogação), mais uma frase dizendo que o comprador que falou com uma empresa cliente
  deve procurar primeiro essa empresa, porque ela é a controladora.
- **Segurança:** o texto atual, em linguagem simples, sem termos técnicos como "Row
  Level Security".
- **Contato e encarregado de dados:** SETE ADS LTDA, `atacadoexponencial@gmail.com`.

**Comportamentos:**
- **Abrir sem login:** a página continua pública.
- **Abrir o link da política do WhatsApp:** abre em nova aba.
- **Escrever para o contato:** o e-mail continua clicável.
- **Voltar para a landing:** um link "Atacado Exp" no topo da página leva para `/`.

---

### 3. Termos de Serviço (`/termos-de-servico`)

**Descrição:** a página já existe e cita "CRM Exponencial" e "Atacado Exponencial" como
dona. A revisão troca para o produto e a empresa reais e ajusta as cláusulas ligadas ao
WhatsApp. A aparência continua a mesma.

**Componentes (o que o texto passa a dizer):**
- **Título da aba:** "Termos de Serviço — Atacado Exp".
- **Data da última atualização:** a data em que a revisão entrar no ar.
- **Partes:** o serviço é prestado pela **SETE ADS LTDA**, com CNPJ e endereço. Todas as
  menções a "Atacado Exponencial" como dona ou responsável passam para Sete Ads, e
  "CRM Exponencial" passa para "Atacado Exp".
- **Descrição do serviço:** atualizada com os recursos atuais: caixa de entrada,
  funis de Entrada e Recompra, contatos, sequências, campanhas, automações, catálogo e
  painel.
- **Uso da API do WhatsApp:** as declarações atuais (dono do número, autorização para
  enviar, respeito às políticas do WhatsApp, sem spam), mais:
  - o cliente precisa ter consentimento (opt-in) dos contatos antes de mandar modelos e
    campanhas;
  - os custos de mensagens cobrados pela Meta são do cliente, pagos direto na conta
    dele;
  - a Meta pode limitar ou bloquear o número por baixa qualidade, sem responsabilidade
    da Sete Ads.
- **Dados:** remete à Política de Privacidade e repete que o cliente é o controlador
  dos dados dos seus contatos.
- **Foro:** comarca de Hortolândia/SP (hoje é o domicílio do usuário).
- **Contato:** SETE ADS LTDA, `atacadoexponencial@gmail.com`.

**Comportamentos:**
- **Abrir sem login:** a página continua pública.
- **Abrir o link das políticas comerciais do WhatsApp:** abre em nova aba.
- **Abrir a Política de Privacidade:** link dentro dos termos leva para
  `/politica-de-privacidade`.
- **Escrever para o contato:** o e-mail continua clicável.
- **Voltar para a landing:** um link "Atacado Exp" no topo da página leva para `/`.

---

## Decisões tomadas (09/10/2026)

1. **Sem botão "Criar conta"** (mudado em 09/10). O botão da abertura é Entrar e leva para `/login`. A landing não leva para `/cadastro`.
2. **Símbolo:** o cubo do CRM (`OneDrive\05. Seteads - AE\icone-crm-exponencial-1024.png`)
   é o símbolo do Atacado Exp no cabeçalho.
3. **Exclusão de dados:** sem página nova. O rodapé mostra só o e-mail, e a política
   explica como pedir a exclusão.
4. **Foro nos termos:** comarca de Hortolândia/SP.

## Critério de pronto

- `crm-exponencial.vercel.app` abre a landing, no computador e no celular, sem login.
- A política e os termos citam Atacado Exp e SETE ADS LTDA, com CNPJ e endereço, e não
  sobra nenhuma menção a "CRM Exponencial" ou a "Atacado Exponencial" como dona.
- A Marcelle leu a landing, a política e os termos no ar e aprovou o texto.
- O checklist da Meta (`referencia/checklist-publicacao-app-meta.md`, etapas 3 e 4)
  é atualizado: landing feita e link do site pronto para a verificação de acesso.
