# B22-01: Landing do Atacado Exp no ar

**Tipo:** Implementação (protótipo e entrega juntos, ver nota)
**Página:** Página inicial — landing (`/`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-landing-atacado-exp.md`, módulo 1

## Descrição

A página padrão do Next.js em `/` dá lugar à landing do Atacado Exp, com todos os blocos
do módulo 1 da spec: cabeçalho com o cubo e o botão Entrar, abertura com o botão Entrar
(sem Criar conta), para quem é, os oito recursos, como funciona a conexão com o WhatsApp, seus dados,
rodapé com SETE ADS LTDA, CNPJ, endereço e e-mail, e título e descrição da aba. A
aparência segue a do `atacadoexponencial.com` (Satoshi, creme e faixas escuras,
pílulas). Mudou em 09/10, depois que a Marcelle viu a primeira versão. Todos os links funcionam.

> **Nota:** a landing é uma página estática, sem banco nem lógica. Um protótipo
> separado seria a própria página com outro nome. Por isso protótipo e entrega são uma
> issue só. O portão de aprovação é a Marcelle ler a página no preview antes de ir para
> produção.

## Pronto quando

- `crm-exponencial.vercel.app/` abre a landing sem login, e também para quem está logado.
- Entrar (cabeçalho e abertura) leva para `/login`. Nenhum botão leva para `/cadastro`.
- Os links do bloco "Seus dados" e do rodapé abrem a política e os termos. O e-mail abre o
  programa de e-mail.
- No celular, os blocos ficam em uma coluna, sem rolagem lateral.
- Sem a imagem do cubo, o nome "Atacado Exp" continua legível.
- O texto não promete coexistência, preços nem período de teste, não cita o canal
  direto e não usa logo da Meta ou do WhatsApp.
- A Marcelle aprovou o texto e o visual no preview.

## Cenários

### Happy Path
1. O visitante abre `crm-exponencial.vercel.app/`. O middleware já trata `/` como pública
   (`src/middleware.ts:15`), então ninguém é mandado para o login e o Auth nem é
   consultado.
2. A página aparece no tema escuro do CRM, nesta ordem: cabeçalho (cubo, "Atacado Exp",
   Entrar), abertura (título, subtitulo do método Entrada/Recompra, Entrar), "Para quem
   é", "O que o Atacado Exp faz" (oito cartões), "Como funciona a conexão com o WhatsApp"
   (quatro passos e a nota sobre API Oficial, preços da Meta e o número sair do app do
   celular), "Seus dados" (três pontos e o link da política) e o rodapé (Sete Ads, CNPJ,
   endereço, e-mail, política, termos, ©).
3. Entrar, no cabeçalho ou na abertura, leva para `/login`.
4. Os links da política e dos termos abrem as páginas públicas que já existem. O e-mail é
   um `mailto:`.
5. A aba mostra "Atacado Exp — CRM para atacadistas que vendem pelo WhatsApp".

### Edge Cases
- **Visitante logado:** vê a mesma landing. Entrar leva para `/login`, que segue o
  comportamento atual.
- **Celular (375 px):** a grade de recursos vira uma coluna e os passos ficam empilhados.
  O endereço quebra linha sem estourar a largura. Não há rolagem lateral, e o botão
  Entrar continua no cabeçalho.
- **Cubo não carrega:** o nome "Atacado Exp" é texto ao lado da imagem, e a imagem tem
  `alt=""` (decorativa). O cabeçalho continua legível.
- **Banco fora do ar:** a página não consulta nada e é gerada estática no build.
- **Ano no ©:** calculado na renderização. Como a página é estática, o ano é o do build,
  o que basta, porque todo deploy gera a página de novo.

### Cenário de Erro
- Não há chamada de rede nem formulário, então não há erro de execução a tratar.
- **Erro de texto** (prometer coexistência ou preço, citar o canal direto, nome do
  produto colado a "WhatsApp"): coberto pelo teste automático e pela leitura da Marcelle
  no preview.

## Banco de Dados

Não se aplica.

## Arquivos

- **Criar:** `public/atacado-exp-simbolo.png`: cópia do cubo
  (`OneDrive\05. Seteads - AE\icone-crm-exponencial-1024.png`, 55 KB, fundo #393536). O
  `next/image` cuida de reduzir o tamanho.
- **Modificar:** `src/app/page.tsx`: troca o boilerplate do Next.js pela landing. Fica
  como componente de servidor estático, sem `"use client"` e sem Supabase. Exporta
  `metadata` com título e descrição próprios, que sobrepõem os do `src/app/layout.tsx`.
  Reaproveita:
  - `buttonVariants` de `@/components/ui/button`, aplicado em `next/link` (padrão já
    usado em `src/app/(auth)/catalogo/components/detalhe-pedido.tsx:97`), para os botões
    Entrar;
  - os tokens do tema (`bg-background`, `text-foreground`, `text-muted-foreground`,
    `bg-card`, `border-border`) de `src/app/globals.css`. Nada de variantes `dark:`,
    porque o tema é sempre escuro e essas variantes nunca ativam;
  - ícones do `lucide-react` nos cartões de recurso, os mesmos do menu lateral
    (`src/components/shared/sidebar-nav.tsx`), para o visitante reconhecer as telas;
  - `next/image` para o cubo.
- **Criar:** `src/test/landing.test.tsx`: renderiza a página (padrão de
  `src/test/numero-teste-meta.test.tsx`) e confere:
  - os links: Entrar para `/login`, nenhum para `/cadastro`, política, termos e
    `mailto:`;
  - os dados da empresa: SETE ADS LTDA, CNPJ, Hortolândia e CEP;
  - os oito recursos;
  - que o texto não tem "coexist", "preço", "grátis", "QR Code" nem "canal direto";
  - o título da aba.

> Fora da lista de propósito: `src/app/layout.tsx` (título "CRM Exponencial" do sistema
> logado, fora do escopo da spec), `src/middleware.ts` (`/` já é pública) e os arquivos
> do boilerplate em `public/` (`next.svg`, `vercel.svg` e outros), que não são pedidos.

## Dependências Externas

Nenhuma nova. `next/image`, `next/link` e `lucide-react` já estão no projeto.

## Checklist

- [x] Copiar o cubo para `public/atacado-exp-simbolo.png`
- [x] Reescrever `src/app/page.tsx` com metadata, cabeçalho, abertura, "Para quem é", os
      oito recursos, "Como funciona a conexão", "Seus dados" e rodapé, com os textos da
      spec, módulo 1
- [x] Entrar no cabeçalho e na abertura levando para `/login`, sem nenhum link para
      `/cadastro`
- [x] Layout em uma coluna no celular e em grade no computador, sem rolagem lateral
- [x] Criar `src/test/landing.test.tsx` e rodá-lo
- [x] `npm run lint` e `npm run build` sem erros, e `/` gerada estática no build
- [x] Conferir com Playwright em `next start`, a 375 px e a 1280 px, com captura de tela
- [ ] Publicar no preview da Vercel para a Marcelle ler e aprovar o texto e o visual
