# Spec: Landing do crmatacado exp

> série: B24
> estado: aprovada em 23/10/2026

## Visão Geral

Quem abre `crm-exponencial.vercel.app` hoje cai direto no login. A Meta exige um site
completo, que mostre o serviço e a empresa responsável, para liberar a **verificação de
acesso** do app (prazo **17/11/2026**) e para a análise das permissões do WhatsApp. O
formulário da verificação pede o link desse site.

Esta mudança:

1. troca a página inicial por uma **landing do crmatacado exp**: o que o produto faz,
   para quem é, como a conexão oficial com o WhatsApp funciona, quem responde por ele e
   como pedir uma demonstração;
2. alinha a **Política de Privacidade** e os **Termos de Serviço** com o que foi
   declarado à Meta: a empresa responsável passa a ser a SETE ADS 2 LTDA, com CNPJ, e os
   textos descrevem o uso dos dados do WhatsApp e os serviços que guardam esses dados.

**Para quem:**
- o analista da Meta, que precisa ver um serviço real e uma empresa identificável, a
  mesma do portfólio verificado;
- o atacadista que chega pelo link, quer entender o produto e pedir uma demonstração.

**Referências de estrutura:** wesalescrm.com e atacadopro.com. Delas vem a ordem das
seções (dor → virada → módulos → como funciona → para quem → perguntas → chamada final).
Não vem o visual: a landing usa a linguagem **Caderno** que o CRM já tem (papel, tinta,
grafite, linhas finas, fonte IBM Plex), para que o site e o produto pareçam a mesma coisa.

**Dados fixos que aparecem no site:**

| Item | Valor |
|---|---|
| Produto | crmatacado exp (sempre em minúsculo, como na logo) |
| Empresa responsável | SETE ADS 2 LTDA |
| CNPJ | 53.756.257/0001-34 |
| E-mail de contato | atacadoexponencial@gmail.com |
| WhatsApp da demonstração | +55 19 98170-2315 |
| Endereço | Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604 |

**Regras de texto (vêm da Meta):**
- O nome do produto nunca vai colado a "WhatsApp", "Meta", "Facebook" ou "Instagram"
  como se fosse um nome só. Pode dizer "conecta ao WhatsApp", nunca "crmatacado exp
  WhatsApp".
- O site não usa logos da Meta nem do WhatsApp e não sugere parceria oficial. Pode dizer
  que a conexão usa a **API Oficial do WhatsApp Business**, da Meta.
- O site não promete o que não existe nem o que a análise não cobre: coexistência com
  o aplicativo do celular, preços, planos, período de teste, cadastro por conta própria e
  conexão por QR Code (canal direto).

## Páginas / Módulos

### 1. Página inicial — landing (`/`)

**Descrição:** página pública de apresentação do crmatacado exp. Abre sem login,
inclusive para quem já está logado. Uma página só, com rolagem, dividida em seções que
o cabeçalho aponta por âncora. O visual segue o tema claro Caderno do CRM: fundo papel,
texto tinta, botão principal grafite, caixas em superfície clara com borda fina, fonte
IBM Plex Sans para texto e IBM Plex Mono para rótulos pequenos em caixa alta. Não há
tema escuro na landing.

**Componentes:**

- **Cabeçalho fixo:** logo grafite do crmatacado exp à esquerda; no meio, âncoras
  "Módulos", "Como funciona", "Para quem", "Perguntas"; à direita, link **Entrar** e
  botão **Solicitar demonstração**. No celular, as âncoras somem e ficam só a logo,
  "Entrar" e o botão.
- **Abertura (hero):** rótulo pequeno em caixa alta ("CRM para atacado"), título de
  benefício em uma frase ("Transforme o WhatsApp do seu atacado em uma máquina de
  pedidos" ou equivalente aprovado), subtítulo de duas linhas que diz o que é (caixa de
  entrada, funis, catálogo e relatórios num só lugar, para times que vendem pelo
  WhatsApp), botão principal **Solicitar demonstração** e link secundário **Ver como
  funciona** (rola até a seção 6). Abaixo, três selos curtos de confiança: "API Oficial
  do WhatsApp Business", "Implantação acompanhada", "Suporte humano". À direita (ou
  abaixo, no celular), o print real da caixa de entrada do CRM.
- **A dor:** título ("Vender pelo WhatsApp sem sistema custa caro") e quatro cartões,
  cada um com uma frase do dia a dia do atacadista: pedidos anotados em vários lugares;
  cliente que compra uma vez e some; vendedor que esquece o follow-up; dono que não sabe
  os números no fim do mês. Sem estatísticas inventadas: nenhuma porcentagem ou número
  sem fonte.
- **A virada:** quatro passos numerados que contam a jornada dentro do produto: (1) o
  contato chega pelo WhatsApp e cai na caixa de entrada do time; (2) o vendedor responde
  e o contato entra no funil de Entrada; (3) o pedido é feito pelo catálogo e vira
  compra registrada; (4) o cliente passa ao funil de Recompra e as sequências lembram o
  vendedor de voltar a falar com ele.
- **Módulos:** grade de oito cartões, cada um com ícone, título e uma frase:
  - **Caixa de entrada:** todas as conversas do número da empresa, com texto, imagem,
    áudio e documento, etiquetas e mensagens rápidas;
  - **Funis de Entrada e Recompra:** cada contato no seu estágio, do primeiro contato à
    recompra, com funis próprios da empresa;
  - **Contatos:** ficha com histórico, compras, etiquetas e filtros salvos;
  - **Sequências e agenda:** lembretes de follow-up para o vendedor não esquecer ninguém;
  - **Campanhas:** envio de modelos de mensagem aprovados para listas segmentadas, com
    relatório de entrega;
  - **Automações:** regras em fluxo que movem o contato, marcam etiquetas e disparam
    mensagens sozinhas;
  - **Catálogo e loja:** vitrine com preço por quantidade, mínimo e grade, pedido que
    chega pelo WhatsApp;
  - **Relatórios:** visão geral, RFV, coorte, funil de clientes e carteiras por vendedor.
  Dois prints reais (funil e catálogo) acompanham a grade.
- **Para quem é:** quatro perfis: atacadistas e distribuidores; marcas que vendem no
  atacado pelo WhatsApp; fábricas e multimarcas com grade e pedido mínimo; times com
  vários vendedores e papéis de administrador, gerente e atendente.
- **Como funciona a conexão com o WhatsApp:** quatro passos numerados: (1) a empresa
  entra no crmatacado exp; (2) o administrador clica em conectar e entra na janela
  oficial da Meta, onde escolhe o portfólio, a conta do WhatsApp Business e o número;
  (3) as mensagens que os compradores mandam para o número passam a chegar na caixa de
  entrada, e o time responde por ali; (4) o administrador desconecta o número quando
  quiser. Junto, uma nota curta: a conexão usa a API Oficial do WhatsApp Business; o
  envio de modelos de mensagem segue as regras da Meta e é cobrado por ela direto na
  conta da empresa. Um print real da tela de conexão acompanha a seção.
- **Seus dados:** três frases: cada empresa só vê os próprios dados; os dados não são
  vendidos nem usados para publicidade; a empresa pode pedir a exclusão a qualquer
  momento. Link para a Política de Privacidade.
- **Perguntas frequentes:** seis perguntas em sanfona (uma aberta por vez): precisa de
  um número novo de WhatsApp?; o número conectado continua no celular?; quantos
  vendedores podem usar?; funciona no celular?; como é a implantação?; como peço uma
  demonstração? As respostas são curtas e verdadeiras (a do celular diz que o número
  conectado pela API Oficial passa a ser atendido pelo CRM).
- **Chamada final:** faixa escura (grafite) com título ("Organize as vendas do seu
  atacado") e o botão **Solicitar demonstração**.
- **Rodapé:** logo branca; "crmatacado exp é um produto da SETE ADS 2 LTDA"; CNPJ e
  endereço; e-mail de contato como link de e-mail; links **Política de Privacidade**,
  **Termos de Serviço** e **Entrar**; "© [ano atual] SETE ADS 2 LTDA".
- **Título da aba e descrição para buscadores:** "crmatacado exp — CRM para
  atacadistas que vendem pelo WhatsApp" e uma descrição de uma frase no mesmo tom. A
  página tem imagem de compartilhamento (o print da caixa de entrada).

**Imagens:** prints reais do CRM, tirados na empresa "[TESTE] Automações B11" com dados
fictícios, no tema claro, em tela de 1440 px de largura: caixa de entrada, funil,
catálogo e tela de conexão do WhatsApp. Ficam em `public/landing/` em formato
otimizado, cada um com menos de 250 KB, e carregam com tamanho declarado para a página
não pular.

**Comportamentos:**
- Abrir `/` sem login mostra a landing, sem mandar para o login.
- Abrir `/` logado também mostra a landing.
- Clicar em **Entrar** (cabeçalho ou rodapé) leva ao `/login`.
- Clicar em **Solicitar demonstração** (cabeçalho, abertura ou chamada final) abre o
  WhatsApp em nova aba, no número +55 19 98170-2315, com a mensagem pronta "Olá! Quero
  uma demonstração do crmatacado exp."
- Clicar em **Ver como funciona** rola até a seção da conexão com o WhatsApp.
- Clicar numa âncora do cabeçalho rola até a seção correspondente.
- Clicar numa pergunta da sanfona abre a resposta e fecha a que estava aberta.
- Clicar em **Política de Privacidade** ou **Termos de Serviço** abre a página
  correspondente.
- Em tela de celular (360 px), nenhuma seção ultrapassa a largura da tela e todos os
  botões continuam visíveis e clicáveis.

**Critérios de aceite:**

#### CA-B24-01 — A raiz mostra a landing sem pedir login · prova: automática

- **Dado** um visitante sem sessão
- **Quando** abre `/`
- **Então** vê a landing com o título de benefício, e não é mandado para `/login`.

#### CA-B24-02 — Logado, a raiz também mostra a landing · prova: automática

- **Dado** um usuário com sessão ativa
- **Quando** abre `/`
- **Então** vê a landing, e não o painel.

#### CA-B24-03 — Entrar leva ao login · prova: automática

- **Dado** a landing aberta
- **Quando** o visitante clica em **Entrar**, no cabeçalho ou no rodapé
- **Então** chega em `/login`.

#### CA-B24-04 — Solicitar demonstração abre o WhatsApp certo · prova: automática

- **Dado** a landing aberta
- **Quando** o visitante clica em qualquer botão **Solicitar demonstração**
- **Então** abre, em nova aba, o endereço `https://wa.me/5519981702315` com a mensagem
  "Olá! Quero uma demonstração do crmatacado exp." já preenchida.

#### CA-B24-05 — Nenhum caminho para criar conta · prova: automática

- **Dado** a landing aberta
- **Quando** o visitante procura "Criar conta", "Cadastre-se", "teste grátis" ou um link
  para `/cadastro`
- **Então** não encontra nenhum.

#### CA-B24-06 — Todas as seções estão lá, na ordem · prova: automática

- **Dado** a landing aberta
- **Quando** o visitante rola do topo ao fim
- **Então** encontra, nesta ordem: abertura, a dor, a virada, módulos (oito cartões),
  para quem é, como funciona a conexão (quatro passos), seus dados, perguntas frequentes
  (seis), chamada final e rodapé.

#### CA-B24-07 — Rodapé identifica a empresa · prova: automática

- **Dado** a landing aberta
- **Quando** o visitante lê o rodapé
- **Então** vê "SETE ADS 2 LTDA", o CNPJ "53.756.257/0001-34", o endereço, o e-mail
  atacadoexponencial@gmail.com como link e os links para Política de Privacidade e
  Termos de Serviço.

#### CA-B24-08 — Texto respeita as regras da Meta · prova: automática

- **Dado** o texto completo da landing
- **Quando** se procura "crmatacado exp WhatsApp", "crmatacado exp Meta", "QR Code",
  "coexist", "preço", "plano", "grátis" e qualquer imagem com logo da Meta ou do WhatsApp
- **Então** nada disso aparece.

#### CA-B24-09 — Âncoras e "Ver como funciona" levam à seção certa · prova: automática

- **Dado** a landing aberta
- **Quando** o visitante clica em "Módulos", "Como funciona", "Para quem", "Perguntas"
  ou em **Ver como funciona**
- **Então** a página rola até a seção com aquele nome (o endereço passa a ter a âncora
  da seção).

#### CA-B24-10 — Sanfona abre uma pergunta por vez · prova: automática

- **Dado** a seção de perguntas com uma pergunta aberta
- **Quando** o visitante clica em outra pergunta
- **Então** a nova abre e a anterior fecha.

#### CA-B24-11 — Título e descrição para buscadores · prova: automática

- **Dado** a landing aberta
- **Quando** se lê o título da aba e a descrição da página
- **Então** o título é "crmatacado exp — CRM para atacadistas que vendem pelo WhatsApp"
  e a descrição tem uma frase não vazia; a imagem de compartilhamento aponta para um
  arquivo em `public/landing/`.

#### CA-B24-12 — Prints reais, leves e com tamanho declarado · prova: automática

- **Dado** a pasta `public/landing/`
- **Quando** se conferem os arquivos usados pela landing
- **Então** existem ao menos quatro prints (caixa de entrada, funil, catálogo, conexão),
  cada um com menos de 250 KB, e cada imagem na página declara largura e altura.

#### CA-B24-13 — Cabe no celular · prova: manual

- **Dado** a landing aberta num celular (360 px de largura)
- **Quando** a Marcelle rola do topo ao fim
- **Então** nenhuma seção corta na lateral, não há rolagem horizontal, e os botões
  Entrar e Solicitar demonstração ficam visíveis e clicáveis no cabeçalho.

#### CA-B24-14 — Visual aprovado no preview · prova: manual

- **Dado** a landing publicada no preview da Vercel
- **Quando** a Marcelle abre no computador e no celular
- **Então** aprova o visual por escrito (tema Caderno, prints reais, textos) antes do
  merge no master.

### 2. Política de Privacidade (`/politica-de-privacidade`)

**Descrição:** página pública já existente. Passa a identificar a empresa responsável
como a Meta a conhece e a descrever, com o mesmo detalhe declarado no formulário da
Meta, o que é feito com os dados que chegam do WhatsApp.

**Componentes:**
- **Abertura:** "desenvolvido e operado por SETE ADS 2 LTDA, CNPJ 53.756.257/0001-34"
  (hoje diz "Atacado Exponencial", sem CNPJ).
- **Dados coletados:** além do que já lista, cita a lista de modelos de mensagem da
  conta e o status do número e da conta do WhatsApp Business.
- **Com quem compartilhamos:** nomeia os serviços que guardam ou processam dados, como
  operadores: Supabase (banco e arquivos) e Vercel (hospedagem), além da Meta (API do
  WhatsApp). Diz que nenhum deles usa os dados para fins próprios.
- **Uso dos dados da Meta:** parágrafo que diz que os dados recebidos pela API do
  WhatsApp são usados só para prestar o serviço à empresa que conectou o número, não
  são vendidos, não alimentam publicidade e são apagados quando a empresa desconecta o
  número ou pede a exclusão.
- **Contato e controlador:** SETE ADS 2 LTDA, endereço, e-mail.
- **Data de atualização:** o dia em que a mudança entrar no ar.

**Comportamentos:**
- Abrir a página sem login mostra o texto completo.
- Clicar no e-mail abre o programa de e-mail.

**Critérios de aceite:**

#### CA-B24-15 — Política cita a empresa certa · prova: automática

- **Dado** a página de política aberta
- **Quando** se lê o texto
- **Então** aparece "SETE ADS 2 LTDA" e "53.756.257/0001-34", e não aparece "SETE ADS
  LTDA" sozinha nem "22.987.352/0001-15".

#### CA-B24-16 — Política nomeia os operadores e o uso dos dados da Meta · prova: automática

- **Dado** a página de política aberta
- **Quando** se lê o texto
- **Então** aparecem "Supabase", "Vercel" e "Meta" como quem processa dados, e um
  parágrafo diz que os dados do WhatsApp não são vendidos nem usados para publicidade e
  são apagados ao desconectar o número ou a pedido.

### 3. Termos de Serviço (`/termos-de-servico`)

**Descrição:** página pública já existente. Passa a identificar a empresa responsável e
o foro.

**Componentes:**
- **Abertura:** "desenvolvido e operado por SETE ADS 2 LTDA, CNPJ 53.756.257/0001-34".
- **Lei aplicável e foro:** foro da comarca de Hortolândia/SP (hoje diz "domicílio do usuário").
- **Data de atualização:** o dia em que a mudança entrar no ar.

**Comportamentos:**
- Abrir a página sem login mostra o texto completo.

**Critérios de aceite:**

#### CA-B24-17 — Termos citam a empresa e o foro · prova: automática

- **Dado** a página de termos aberta
- **Quando** se lê o texto
- **Então** aparece "SETE ADS 2 LTDA", "53.756.257/0001-34" e a comarca do foro
  escolhida; não aparece "domicílio do usuário".

## Fora de escopo

- Preços, planos, período de teste, formulário de contato, chat no site, blog.
- Botão "Criar conta" ou qualquer caminho visível para `/cadastro`.
- Versão em inglês. O vídeo da análise já tem legendas em inglês; o site fica em
  português.
- Mudanças no sistema logado (menu, telas, e-mails).
- Canal direto (QR Code) e coexistência: não aparecem na landing.
- Página de exclusão de dados (`/exclusao-de-dados` já existe e não muda).
- Enviar o formulário de verificação de acesso da Meta: tarefa manual da Marcelle depois
  do merge, registrada no checklist em
  `pre-desenvolvimento/referencia/checklist-publicacao-app-meta.md`.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B24-01 | O endereço da SETE ADS 2 LTDA que vai no rodapé e na política é o mesmo da B22: Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604 | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-02 | O foro dos termos passa a ser a comarca de Hortolândia/SP, como decidido na B22 | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-03 | O título da abertura é "Transforme o WhatsApp do seu atacado em uma máquina de pedidos" e o subtítulo "Caixa de entrada, funis, catálogo e relatórios num só lugar, para times que vendem pelo WhatsApp." A Marcelle pode trocar no preview sem reabrir a spec | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-04 | Os prints da empresa [TESTE] podem ser tirados com os dados fictícios que ela tem hoje (contatos, conversas e produtos de teste), sem precisar popular nada novo | confirmada | Marcelle, 23/10/2026 (prints com os dados de teste que já existem) |
| SUP-B24-05 | A mensagem pronta do WhatsApp é "Olá! Quero uma demonstração do crmatacado exp." | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B24-01 | O rótulo pequeno acima do título e os selos de confiança (API Oficial, dados isolados, suporte humano) ficam como estão ou ela quer outros? | respondida | Marcelle, 23/10/2026: rótulo "CRM para atacado"; selos API Oficial, Implantação acompanhada (no lugar de "Dados isolados", que é obrigação e não diferencial) e Suporte humano |
