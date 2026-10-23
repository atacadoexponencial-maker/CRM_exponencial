# B24-01: Landing pública do crmatacado exp

**Tipo:** Implementação
**Página:** `/` (landing)
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-landing-crmatacado-exp.md`

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
| PER-B24-01 | O rótulo pequeno acima do título e os selos de confiança (API Oficial, dados isolados, suporte humano) ficam como estão ou ela quer outros? | respondida | Marcelle, 23/10/2026: rótulo "CRM para atacado"; selos API Oficial, Implantação acompanhada (no lugar de "Dados isolados", que é obrigação e não diferencial) e Suporte humano |

## Cenários

### Happy Path
1. Visitante abre `/` sem login. O porteiro já trata `/` como pública; a página deixa de redirecionar e renderiza a landing dentro de `TemaClaro`, sempre clara.
2. Cabeçalho fixo: `LogoDaMarca` (grafite), âncoras Módulos / Como funciona / Para quem / Perguntas, link Entrar (`/login`) e botão Solicitar demonstração (`https://wa.me/5519981702315?text=...`, nova aba).
3. Rola pelas seções, na ordem da spec, cada uma com `id` próprio (`modulos`, `como-funciona`, `para-quem`, `perguntas`), e vê os prints reais em `public/landing/`.
4. Clica em Solicitar demonstração: abre o WhatsApp em nova aba com a mensagem pronta. Clica em Entrar: vai ao `/login`.
5. Abre uma pergunta da sanfona: a resposta aparece; abre outra: a anterior fecha.
6. Rodapé com SETE ADS 2 LTDA, CNPJ, endereço, e-mail (mailto), Política, Termos, Entrar e © ano atual.

### Edge Cases
- Usuário logado abre `/`: vê a landing (nada de redirecionar para o painel). Entrar leva ao `/login`, que já manda quem tem sessão para o painel.
- Celular (360 px): âncoras escondidas, logo + Entrar + botão no cabeçalho; prints empilhados abaixo do texto; nada ultrapassa a largura.
- Sem JavaScript: a sanfona usa `<details>` nativo, então as perguntas abrem mesmo assim; o "uma por vez" é feito por `name` comum nos `<details>` (comportamento nativo do navegador) e reforçado por um pequeno cliente que fecha os outros.
- Ano do rodapé vem de `new Date().getFullYear()` no servidor.

### Cenário de Erro
- Print faltando em `public/landing/`: a imagem quebra na tela. Por isso o teste CA-B24-12 confere que os quatro arquivos existem e são PNG de verdade; as dimensões vêm de `conteudo.ts` e vão em `width`/`height` de cada imagem.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B24-01 | automática | `src/test/b24-landing.test.tsx` | a página raiz não chama `redirect` e o HTML traz o título de benefício; o porteiro deixa `/` passar sem sessão (teste do `rotaPublica`) |
| CA-B24-02 | automática | `src/test/b24-landing.test.tsx` | com sessão (cookie do Supabase) o porteiro também deixa `/` passar sem redirecionar, e a página renderiza a landing |
| CA-B24-03 | automática | `src/test/b24-landing.test.tsx` | cabeçalho e rodapé têm link "Entrar" com `href="/login"` |
| CA-B24-04 | automática | `src/test/b24-landing.test.tsx` | todo botão "Solicitar demonstração" tem `href` `https://wa.me/5519981702315?text=<mensagem codificada>` e `target="_blank"` |
| CA-B24-05 | automática | `src/test/b24-landing.test.tsx` | o HTML não contém "Criar conta", "Cadastre-se", "grátis" nem `href="/cadastro"` |
| CA-B24-06 | automática | `src/test/b24-landing.test.tsx` | os títulos das dez seções aparecem nessa ordem no HTML; há 8 cartões de módulo, 4 passos da conexão e 6 perguntas |
| CA-B24-07 | automática | `src/test/b24-landing.test.tsx` | o rodapé traz SETE ADS 2 LTDA, 53.756.257/0001-34, Hortolândia, `mailto:atacadoexponencial@gmail.com` e links para `/politica-de-privacidade` e `/termos-de-servico` |
| CA-B24-08 | automática | `src/test/b24-landing.test.tsx` | o texto não contém "crmatacado exp WhatsApp", "crmatacado exp Meta", "QR Code", "coexist", "preço", "plano", "grátis", e nenhuma imagem tem "meta" ou "whatsapp" no nome/alt |
| CA-B24-09 | automática | `src/test/b24-landing.test.tsx` | as âncoras do cabeçalho apontam para `#modulos`, `#como-funciona`, `#para-quem`, `#perguntas`, "Ver como funciona" aponta para `#como-funciona`, e existem elementos com esses ids |
| CA-B24-10 | automática | `src/test/b24-landing.test.tsx` | com a sanfona renderizada, abrir a segunda pergunta fecha a primeira (só um `details` aberto) |
| CA-B24-11 | automática | `src/test/b24-landing.test.tsx` | `metadata.title` é o título da spec, `description` não vazia e `openGraph.images` aponta para `/landing/...` |
| CA-B24-12 | automática | `src/test/b24-landing.test.tsx` | em `public/landing/` existem caixa-de-entrada, funil, catalogo e conexao (png ou webp), cada um < 250 KB; toda `<img>` do HTML tem `width` e `height` |
| CA-B24-13 | manual | roteiro abaixo | no celular, nada corta na lateral e os botões ficam visíveis |
| CA-B24-14 | manual | roteiro abaixo | a Marcelle aprova o visual no preview |

### Roteiro manual — CA-B24-13
1. Abrir o preview no celular (ou no navegador com 360 px de largura).
2. Rolar do topo ao fim.
3. Conferir: sem rolagem horizontal, nenhum texto ou print cortado, cabeçalho com logo, Entrar e Solicitar demonstração visíveis e clicáveis.

### Roteiro manual — CA-B24-14
1. Abrir o preview da Vercel no computador e no celular.
2. Conferir tema Caderno (papel, grafite, IBM Plex), prints reais, textos da spec.
3. Responder por escrito "aprovado" (ou a lista de ajustes).

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/app/page.tsx` — deixa de redirecionar; exporta `metadata` e renderiza a landing.
- **Criar:** `src/app/_landing/landing.tsx` — a página inteira (servidor): cabeçalho, seções, rodapé, textos e prints.
- **Criar:** `src/app/_landing/conteudo.ts` — textos da landing (título, dores, passos, módulos, perfis, perguntas, dados da empresa, link do WhatsApp), para a página e o teste lerem a mesma fonte.
- **Criar:** `src/app/_landing/perguntas.tsx` — sanfona (cliente) com `<details>`, uma aberta por vez.
- **Criar:** `src/app/_landing/revelar.tsx` — entrada suave ao rolar (cliente), pedida por ela no preview de 23/10 junto com faixas escuras, logo maior e textos maiores.
- **Criar:** `public/landing/caixa-de-entrada.png` — print do chat da [TESTE] com uma conversa aberta, 1440 px, otimizado com `sharp`.
- **Criar:** `public/landing/funil.png` — print do Pipeline (Entrada) da [TESTE].
- **Criar:** `public/landing/catalogo.png` — print do Catálogo da [TESTE].
- **Criar:** `public/landing/conexao.png` — print de Configurações → WhatsApp da [TESTE].
- **Criar:** `src/test/b24-landing.test.tsx` — provas automáticas da tabela.

Reutilizados: `TemaClaro` (`src/components/shared/tema-claro.tsx`), `LogoDaMarca` (`src/components/shared/logo-da-marca.tsx`), `buttonVariants` (`src/components/ui/button.tsx`), ícones `lucide-react`, `next/image`, `rotaPublica` do porteiro (`src/middleware.ts`, já libera `/`).

## Dependências Externas

Nenhuma nova. `sharp` já está instalado (usado só no script de otimização dos prints, fora do app).

## Checklist

- [x] Tirar os prints da [TESTE] (chat, funil, catálogo, conexão) a 1440 px no tema claro e otimizar para `public/landing/`
- [x] `conteudo.ts` com todos os textos da spec e o link do WhatsApp
- [x] `landing.tsx`: cabeçalho fixo, abertura com selos e print, dor, virada, módulos (8), para quem (4), conexão (4 passos + nota), seus dados, perguntas, chamada final, rodapé
- [x] `perguntas.tsx`: sanfona uma por vez
- [x] `page.tsx` com `metadata` (título, descrição, openGraph) e sem redirect
- [x] Teste `src/test/b24-landing.test.tsx` com CA-B24-01 a 12 no nome
- [x] Lint, tipos e build passam (build local via webpack; o tipo que falha em cadastro/page.tsx é anterior e não é desta issue)
- [x] Push do branch `b24-landing` para o preview da Vercel

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B24-13 | Marcelle | 23/10/2026 |
| CA-B24-14 | Marcelle | 23/10/2026 |
