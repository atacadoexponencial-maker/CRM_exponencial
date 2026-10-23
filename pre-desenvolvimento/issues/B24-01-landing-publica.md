# B24-01: Landing pública do crmatacado exp

**Tipo:** Implementação
**Página:** `/` (landing)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-landing-crmatacado-exp.md`

## Descrição

Trocar o redirect da raiz por uma landing pública de uma página só, no tema Caderno, com as dez seções da spec (abertura, dor, virada, módulos, para quem, conexão com o WhatsApp, seus dados, perguntas, chamada final, rodapé), prints reais da empresa [TESTE] em `public/landing/`, botão Entrar para o login e Solicitar demonstração abrindo o WhatsApp.

## Pronto quando

Abrir `crm-exponencial.vercel.app` (logado ou não) mostra a landing inteira, com prints do CRM, rodapé com a SETE ADS 2 LTDA, e os botões levam ao login e ao WhatsApp da demonstração. A Marcelle aprova o visual no preview, no computador e no celular.

## Critérios de aceite

- **CA-B24-01** (automática) — A raiz mostra a landing sem pedir login. Dado um visitante sem sessão, quando abre `/`, então vê a landing com o título de benefício, e não é mandado para `/login`.
- **CA-B24-02** (automática) — Logado, a raiz também mostra a landing. Dado um usuário com sessão ativa, quando abre `/`, então vê a landing, e não o painel.
- **CA-B24-03** (automática) — Entrar leva ao login. Dado a landing aberta, quando o visitante clica em **Entrar**, no cabeçalho ou no rodapé, então chega em `/login`.
- **CA-B24-04** (automática) — Solicitar demonstração abre o WhatsApp certo. Dado a landing aberta, quando o visitante clica em qualquer botão **Solicitar demonstração**, então abre, em nova aba, o endereço `https://wa.me/5519981702315` com a mensagem "Olá! Quero uma demonstração do crmatacado exp." já preenchida.
- **CA-B24-05** (automática) — Nenhum caminho para criar conta. Dado a landing aberta, quando o visitante procura "Criar conta", "Cadastre-se", "teste grátis" ou um link para `/cadastro`, então não encontra nenhum.
- **CA-B24-06** (automática) — Todas as seções estão lá, na ordem. Dado a landing aberta, quando o visitante rola do topo ao fim, então encontra, nesta ordem: abertura, a dor, a virada, módulos (oito cartões), para quem é, como funciona a conexão (quatro passos), seus dados, perguntas frequentes (seis), chamada final e rodapé.
- **CA-B24-07** (automática) — Rodapé identifica a empresa. Dado a landing aberta, quando o visitante lê o rodapé, então vê "SETE ADS 2 LTDA", o CNPJ "53.756.257/0001-34", o endereço, o e-mail atacadoexponencial@gmail.com como link e os links para Política de Privacidade e Termos de Serviço.
- **CA-B24-08** (automática) — Texto respeita as regras da Meta. Dado o texto completo da landing, quando se procura "crmatacado exp WhatsApp", "crmatacado exp Meta", "QR Code", "coexist", "preço", "plano", "grátis" e qualquer imagem com logo da Meta ou do WhatsApp, então nada disso aparece.
- **CA-B24-09** (automática) — Âncoras e "Ver como funciona" levam à seção certa. Dado a landing aberta, quando o visitante clica em "Módulos", "Como funciona", "Para quem", "Perguntas" ou em **Ver como funciona**, então a página rola até a seção com aquele nome (o endereço passa a ter a âncora da seção).
- **CA-B24-10** (automática) — Sanfona abre uma pergunta por vez. Dado a seção de perguntas com uma pergunta aberta, quando o visitante clica em outra pergunta, então a nova abre e a anterior fecha.
- **CA-B24-11** (automática) — Título e descrição para buscadores. Dado a landing aberta, quando se lê o título da aba e a descrição da página, então o título é "crmatacado exp — CRM para atacadistas que vendem pelo WhatsApp" e a descrição tem uma frase não vazia; a imagem de compartilhamento aponta para um arquivo em `public/landing/`.
- **CA-B24-12** (automática) — Prints reais, leves e com tamanho declarado. Dado a pasta `public/landing/`, quando se conferem os arquivos usados pela landing, então existem ao menos quatro prints (caixa de entrada, funil, catálogo, conexão), cada um com menos de 250 KB, e cada imagem na página declara largura e altura.
- **CA-B24-13** (manual) — Cabe no celular. Dado a landing aberta num celular (360 px de largura), quando a Marcelle rola do topo ao fim, então nenhuma seção corta na lateral, não há rolagem horizontal, e os botões Entrar e Solicitar demonstração ficam visíveis e clicáveis no cabeçalho.
- **CA-B24-14** (manual) — Visual aprovado no preview. Dado a landing publicada no preview da Vercel, quando a Marcelle abre no computador e no celular, então aprova o visual por escrito (tema Caderno, prints reais, textos) antes do merge no master.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B24-01 | O endereço da SETE ADS 2 LTDA que vai no rodapé e na política é o mesmo da B22: Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604 | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-03 | O título da abertura é "Transforme o WhatsApp do seu atacado em uma máquina de pedidos" e o subtítulo "Caixa de entrada, funis, catálogo e relatórios num só lugar, para times que vendem pelo WhatsApp." A Marcelle pode trocar no preview sem reabrir a spec | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-04 | Os prints da empresa [TESTE] podem ser tirados com os dados fictícios que ela tem hoje (contatos, conversas e produtos de teste), sem precisar popular nada novo | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-05 | A mensagem pronta do WhatsApp é "Olá! Quero uma demonstração do crmatacado exp." | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B24-01 | O rótulo pequeno acima do título e os selos de confiança (API Oficial, dados isolados, suporte humano) ficam como estão ou ela quer outros? | respondida | Marcelle, 23/10/2026: ficam os três selos e o rótulo "CRM para atacado" |
